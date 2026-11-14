//! High-Throughput Streaming Bill of Materials (BOM) Ingestion & Parsing Engine
//!
//! Designed for the electronics supply chain to parse, normalize, and validate
//! 50,000+ line PCBA component lists with zero memory bloat.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentLifecycle {
    Active,
    Nrnd,      // Not Recommended for New Designs
    EndOfLife, // EOL announced
    Obsolete,  // Production ceased
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

        let raw_csv = raw_csv.trim_start_matches('\u{feff}');
        let first = raw_csv
            .lines()
            .find(|l| !l.trim().is_empty() && !l.starts_with('#'))
            .unwrap_or("");
        let delimiter = if first.contains('\t') {
            b'\t'
        } else if first.contains(';') {
            b';'
        } else {
            b','
        };
        let mut reader = csv::ReaderBuilder::new()
            .has_headers(false)
            .flexible(true)
            .trim(csv::Trim::All)
            .comment(Some(b'#'))
            .delimiter(delimiter)
            .from_reader(raw_csv.as_bytes());
        let mut headers: Option<Vec<String>> = None;
        for (idx, record) in reader.records().enumerate() {
            let cols = match record {
                Ok(r) => r,
                Err(_) => {
                    error_lines += 1;
                    continue;
                }
            };
            let names: Vec<String> = cols
                .iter()
                .map(|v| v.to_lowercase().replace([' ', '_', '-'], ""))
                .collect();
            if idx == 0
                && names
                    .iter()
                    .any(|v| matches!(v.as_str(), "mpn" | "partnumber" | "manufacturerpartnumber"))
            {
                headers = Some(names);
                continue;
            }
            let get = |aliases: &[&str], fallback: usize| -> &str {
                let col = match &headers {
                    Some(h) => h.iter().position(|v| aliases.contains(&v.as_str())),
                    None => Some(fallback),
                };
                col.and_then(|i| cols.get(i)).unwrap_or("")
            };
            let raw_mpn = get(&["mpn", "partnumber", "manufacturerpartnumber"], 0).to_string();
            let normalized_mpn = Self::normalize_mpn(&raw_mpn);
            let quantity = get(&["quantity", "qty", "requiredqty"], 3)
                .replace(',', "")
                .parse::<u32>();
            let quantity = match quantity {
                Ok(q) if q > 0 => q,
                _ => {
                    error_lines += 1;
                    continue;
                }
            };
            if normalized_mpn.is_empty() {
                error_lines += 1;
                continue;
            }
            let manufacturer = match get(&["manufacturer", "mfr", "mfg"], 1) {
                "" => "Unknown / Generic".to_string(),
                value => value.to_string(),
            };
            let description = get(&["description", "desc"], 2).to_string();
            let reference_designators: Vec<String> = get(
                &[
                    "designators",
                    "referencedesignators",
                    "refdes",
                    "references",
                ],
                4,
            )
            .split([' ', ';', '|', ','])
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.trim().to_uppercase())
            .collect();
            let unit_price = get(&["price", "unitprice", "unitcost"], 5)
                .trim_start_matches(['$', '€', '£'])
                .parse::<f64>()
                .ok()
                .filter(|v| v.is_finite() && *v >= 0.0);

            let lifecycle = Self::infer_lifecycle(&normalized_mpn, &description);
            let is_high_risk = matches!(
                lifecycle,
                ComponentLifecycle::Obsolete
                    | ComponentLifecycle::EndOfLife
                    | ComponentLifecycle::Nrnd
            );

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
                line_number: cols
                    .position()
                    .map(|p| p.line() as usize)
                    .unwrap_or(idx + 1),
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
            ComponentLifecycle::Unknown
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_mpn_suffixes() {
        assert_eq!(
            BomEngine::normalize_mpn("STM32F401RET6-TR"),
            "STM32F401RET6"
        );
        assert_eq!(BomEngine::normalize_mpn("LM358DR/NOPB"), "LM358DR");
        assert_eq!(
            BomEngine::normalize_mpn("  C0603C104K5RACTU+T  "),
            "C0603C104K5RACTU"
        );
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

#[cfg(test)]
mod regression_tests {
    use super::*;
    #[test]
    fn reordered_headers_and_optional_columns() {
        let result = BomEngine::parse_bom_csv(
            "Quantity,Manufacturer,MPN\n10,STMicroelectronics,STM32F401RET6",
        );
        assert_eq!(result.total_components, 10);
        assert_eq!(result.items[0].manufacturer, "STMicroelectronics");
        assert_eq!(result.items[0].description, "");
        assert_eq!(result.items[0].unit_price_estimate, None);
        assert_eq!(result.items[0].lifecycle, ComponentLifecycle::Unknown);
    }
    #[test]
    fn quoted_commas_and_multiline_fields() {
        let result = BomEngine::parse_bom_csv("MPN,Quantity,Description,Manufacturer\nABC123,2,\"Resistor, precision\nsecond line\",\"Example, Inc\"");
        assert_eq!(result.valid_lines, 1);
        assert_eq!(result.items[0].manufacturer, "Example, Inc");
        assert!(result.items[0]
            .description
            .contains("precision\nsecond line"));
    }
    #[test]
    fn rejects_invalid_quantities_instead_of_defaulting_to_one() {
        let result =
            BomEngine::parse_bom_csv("MPN,Qty\nABC,0\nDEF,10pcs\nGHI,-1\nJKL,1.5\nMNO,\nPQR,3");
        assert_eq!(result.error_lines, 5);
        assert_eq!(result.valid_lines, 1);
        assert_eq!(result.total_components, 3);
    }
    #[test]
    fn tab_delimited_bom_with_bom_marker() {
        let result =
            BomEngine::parse_bom_csv("\u{feff}Mfr\tQty\tPart Number\nST\t4\tSTM32F401RET6");
        assert_eq!(result.total_components, 4);
        assert_eq!(result.items[0].manufacturer, "ST");
    }
}
