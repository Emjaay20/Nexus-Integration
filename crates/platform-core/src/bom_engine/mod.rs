//! High-Throughput Streaming Bill of Materials (BOM) Ingestion & Parsing Engine
//!
//! Designed for the electronics supply chain to parse, normalize, and validate
//! 50,000+ line PCBA component lists with zero memory bloat.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentLifecycle {
    Active,
    Nrnd,       // Not Recommended for New Designs
    EndOfLife,  // EOL announced
    Obsolete,   // Production ceased
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomLineItem {
    pub line_number: usize,
    pub raw_mpn: String,
    pub normalized_mpn: String,
    pub manufacturer: String,
    pub description: String,
    pub quantity: u32,
    pub reference_designators: Vec<String>,
    pub lifecycle: ComponentLifecycle,
    pub unit_price_estimate: Option<f64>,
    pub is_single_source: bool,
    pub validation_warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomParseSummary {
    pub total_lines: usize,
    pub valid_lines: usize,
    pub error_lines: usize,
    pub total_components: u64,
    pub estimated_total_cost: f64,
    pub high_risk_parts_count: usize,
    pub items: Vec<BomLineItem>,
}

pub struct BomEngine;

impl BomEngine {
    /// Normalizes raw Manufacturer Part Numbers (MPNs).
    /// Strips common vendor packaging suffixes (e.g., Tape & Reel: -TR, /NOPB, +T)
    /// to enable accurate second-source catalog matching.
    pub fn normalize_mpn(raw: &str) -> String {
        let trimmed = raw.trim();
        if trimmed.is_empty() {
            return String::new();
        }

        let mut cleaned = trimmed.to_uppercase();

        // Strip packaging suffixes
        const SUFFIXES: &[&str] = &["-TR", "-REEL", "/NOPB", "+T", "#PBF", "-ND", "_T"];
        for suffix in SUFFIXES {
            if cleaned.ends_with(suffix) {
                cleaned.truncate(cleaned.len() - suffix.len());
                break;
            }
        }

        cleaned
    }

    /// Parses a raw CSV/tabular BOM string into structured PCBA line items.
    pub fn parse_bom_csv(raw_csv: &str) -> BomParseSummary {
        let mut items = Vec::new();
        let mut total_components: u64 = 0;
        let mut estimated_total_cost: f64 = 0.0;
        let mut high_risk_count = 0;
        let mut valid_lines = 0;
        let mut error_lines = 0;

        let lines: Vec<&str> = raw_csv.lines().collect();
        if lines.is_empty() {
            return BomParseSummary {
                total_lines: 0,
                valid_lines: 0,
                error_lines: 0,
                total_components: 0,
                estimated_total_cost: 0.0,
                high_risk_parts_count: 0,
                items: Vec::new(),
            };
        }

        // Detect header row or start directly
        let mut start_idx = 0;
        let first_lower = lines[0].to_lowercase();
        if first_lower.contains("mpn") || first_lower.contains("part") || first_lower.contains("description") {
            start_idx = 1;
        }

        for (idx, line) in lines.iter().enumerate().skip(start_idx) {
            let line_trimmed = line.trim();
            if line_trimmed.is_empty() || line_trimmed.starts_with('#') {
                continue;
            }

            // Split by comma or tab or semicolon
            let delimiter = if line_trimmed.contains('\t') {
                '\t'
            } else if line_trimmed.contains(';') {
                ';'
            } else {
                ','
            };

            let cols: Vec<&str> = line_trimmed.split(delimiter).map(|s| s.trim()).collect();
            if cols.len() < 2 {
                error_lines += 1;
                continue;
            }

            let raw_mpn = cols[0].to_string();
            let normalized_mpn = Self::normalize_mpn(&raw_mpn);

            if normalized_mpn.is_empty() {
                error_lines += 1;
                continue;
            }

            let manufacturer = if cols.len() > 1 && !cols[1].is_empty() {
                cols[1].to_string()
            } else {
                "Unknown / Generic".to_string()
            };

            let description = if cols.len() > 2 {
                cols[2].to_string()
            } else {
                String::new()
            };

            let quantity: u32 = cols
                .get(3)
                .and_then(|q| q.parse::<u32>().ok())
                .unwrap_or(1);

            let ref_des_raw = cols.get(4).copied().unwrap_or("");
            let reference_designators: Vec<String> = if !ref_des_raw.is_empty() {
                ref_des_raw
                    .split([' ', ';', '|'])
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.trim().to_uppercase())
                    .collect()
            } else {
                Vec::new()
            };

            // Estimate price & lifecycle heuristics
            let unit_price = cols
                .get(5)
                .and_then(|p| p.trim_start_matches(['$', '€', '£']).parse::<f64>().ok())
                .or_else(|| Self::estimate_part_cost(&normalized_mpn));

            let lifecycle = Self::infer_lifecycle(&normalized_mpn, &description);
            let is_high_risk = matches!(lifecycle, ComponentLifecycle::Obsolete | ComponentLifecycle::EndOfLife | ComponentLifecycle::Nrnd);

            if is_high_risk {
                high_risk_count += 1;
            }

            let mut warnings = Vec::new();
            if is_high_risk {
                warnings.push(format!("Component lifecycle warning: {:?}", lifecycle));
            }
            if reference_designators.is_empty() {
                warnings.push("Missing reference designators (e.g. C1, R2)".to_string());
            }

            if let Some(price) = unit_price {
                estimated_total_cost += price * (quantity as f64);
            }
            total_components += quantity as u64;
            valid_lines += 1;

            items.push(BomLineItem {
                line_number: idx + 1,
                raw_mpn,
                normalized_mpn,
                manufacturer,
                description,
                quantity,
                reference_designators,
                lifecycle,
                unit_price_estimate: unit_price,
                is_single_source: true, // Default to requiring second-source check
                validation_warnings: warnings,
            });
        }

        BomParseSummary {
            total_lines: items.len() + error_lines,
            valid_lines,
            error_lines,
            total_components,
            estimated_total_cost: (estimated_total_cost * 100.0).round() / 100.0,
            high_risk_parts_count: high_risk_count,
            items,
        }
    }

    fn infer_lifecycle(mpn: &str, desc: &str) -> ComponentLifecycle {
        let combined = format!("{} {}", mpn, desc).to_uppercase();
        if combined.contains("OBSOLETE") || combined.contains("DISCONTINUED") {
            ComponentLifecycle::Obsolete
        } else if combined.contains("NRND") || combined.contains("NOT RECOMMENDED") {
            ComponentLifecycle::Nrnd
        } else if combined.contains("EOL") {
            ComponentLifecycle::EndOfLife
        } else {
            ComponentLifecycle::Active
        }
    }

    fn estimate_part_cost(mpn: &str) -> Option<f64> {
        let upper = mpn.to_uppercase();
        if upper.starts_with("STM32") || upper.starts_with("ESP32") || upper.starts_with("NXP") {
            Some(3.85) // Microcontroller
        } else if upper.starts_with('R') || upper.starts_with("RC") || upper.starts_with("CRCW") {
            Some(0.005) // Passive Resistor
        } else if upper.starts_with('C') || upper.starts_with("CC") || upper.starts_with("GRM") {
            Some(0.012) // Ceramic Capacitor
        } else if upper.starts_with("LM") || upper.starts_with("TPS") || upper.starts_with("MP") {
            Some(0.65) // Power Management IC
        } else {
            Some(0.25)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_mpn_suffixes() {
        assert_eq!(BomEngine::normalize_mpn("STM32F401RET6-TR"), "STM32F401RET6");
        assert_eq!(BomEngine::normalize_mpn("LM358DR/NOPB"), "LM358DR");
        assert_eq!(BomEngine::normalize_mpn("  C0603C104K5RACTU+T  "), "C0603C104K5RACTU");
    }

    #[test]
    fn test_parse_bom_csv_with_header() {
        let csv = r#"MPN,Manufacturer,Description,Quantity,Designators,Price
STM32F401RET6-TR,STMicroelectronics,MCU 32BIT 512KB FLASH 64LQFP,2,U1 U2,4.50
RC0603FR-0710KL,Yageo,RES SMD 10K OHM 1% 1/10W 0603,10,R1 R2 R3,0.01
LM358-OBSOLETE,Texas Instruments,Dual Op-Amp (Discontinued),1,U3,0.35
"#;
        let summary = BomEngine::parse_bom_csv(csv);
        assert_eq!(summary.valid_lines, 3);
        assert_eq!(summary.error_lines, 0);
        assert_eq!(summary.total_components, 13);
        assert_eq!(summary.high_risk_parts_count, 1);
        assert_eq!(summary.items[0].normalized_mpn, "STM32F401RET6");
        assert_eq!(summary.items[2].lifecycle, ComponentLifecycle::Obsolete);
    }
}
