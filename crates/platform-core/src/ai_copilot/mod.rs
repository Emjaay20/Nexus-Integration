//! Sourcing risk analysis and alternate-part lookup
//!
//! - Sourcing risk: a deterministic score from lead time, single-source and
//!   lifecycle data, for the public Studio. Protected model prioritization is in workspace::brief.
//! - Alternate parts: lookup against a small built-in reference catalog.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourcingRiskRequest {
    pub project_name: String,
    pub target_batch_size: u32,
    pub components: Vec<ComponentRiskInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentRiskInput {
    pub mpn: String,
    pub manufacturer: String,
    pub description: String,
    pub lead_time_weeks: u32,
    pub lifecycle_status: String,
    pub is_single_source: bool,
    pub unit_price_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeadTimeBottleneck {
    pub mpn: String,
    pub lead_time_weeks: u32,
    pub impact: String,
    pub recommended_action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourcingRiskReport {
    pub project_name: String,
    pub overall_risk_score: u32, // 0 - 100
    pub risk_level: String,      // Low, Medium, High, Critical
    pub single_source_count: usize,
    pub obsolete_or_nrnd_count: usize,
    pub max_lead_time_weeks: u32,
    pub lead_time_bottlenecks: Vec<LeadTimeBottleneck>,
    pub strategic_recommendations: Vec<String>,
    pub estimated_cost_reduction_opportunity_pct: f64,
    pub analyzed_by: String, // "Gemini-2.5-Flash (Live)" or "Rule-based heuristics (local)"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlternateMatchRequest {
    pub target_mpn: String,
    pub manufacturer: String,
    pub description: String,
    pub max_results: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlternatePart {
    pub alternate_mpn: String,
    pub manufacturer: String,
    pub package_footprint: String,
    pub is_pin_compatible: bool,
    pub availability_status: String,
    pub cost_delta_pct: f64,   // e.g. -15.0% = 15% cheaper
    pub match_confidence: f64, // 0.0 - 1.0
    pub rationale: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlternateMatchResponse {
    pub query_mpn: String,
    pub alternates: Vec<AlternatePart>,
    pub provider: String,
}

pub struct AiCopilotEngine;
impl Default for AiCopilotEngine {
    fn default() -> Self {
        Self::new()
    }
}
impl AiCopilotEngine {
    pub fn new() -> Self {
        Self
    }
    /// Evaluates supply chain risks across PCBA components using Gemini or local intelligence.
    pub async fn analyze_sourcing_risk(&self, req: SourcingRiskRequest) -> SourcingRiskReport {
        let max_lead = req
            .components
            .iter()
            .map(|c| c.lead_time_weeks)
            .max()
            .unwrap_or(0);
        let single_source_count = req.components.iter().filter(|c| c.is_single_source).count();
        let obsolete_count = req
            .components
            .iter()
            .filter(|c| {
                let s = c.lifecycle_status.to_uppercase();
                s.contains("OBSOLETE") || s.contains("EOL") || s.contains("NRND")
            })
            .count();

        // Calculate deterministic baseline risk score (0-100)
        let mut risk_score = 15;
        if max_lead >= 26 {
            risk_score += 35;
        } else if max_lead >= 16 {
            risk_score += 20;
        }
        if single_source_count > 0 {
            risk_score += (single_source_count * 8).min(30) as u32;
        }
        if obsolete_count > 0 {
            risk_score += (obsolete_count * 15).min(30) as u32;
        }
        risk_score = risk_score.min(100);

        let risk_level = if risk_score >= 75 {
            "Critical".to_string()
        } else if risk_score >= 50 {
            "High".to_string()
        } else if risk_score >= 30 {
            "Medium".to_string()
        } else {
            "Low".to_string()
        };

        // Extract bottlenecks
        let mut bottlenecks = Vec::new();
        for c in req.components.iter().filter(|c| c.lead_time_weeks >= 16) {
            bottlenecks.push(LeadTimeBottleneck {
                mpn: c.mpn.clone(),
                lead_time_weeks: c.lead_time_weeks,
                impact: format!("Pushes project production schedule out by {} weeks", c.lead_time_weeks),
                recommended_action: format!("Qualify pin-compatible drop-in replacement or place advance buffer order for batch size {}", req.target_batch_size),
            });
        }

        // Production-ready heuristic fallback
        let mut recommendations = Vec::new();
        if single_source_count > 0 {
            recommendations.push(format!(
                "Single-Source Exposure: {} active components lack approved second sources. Recommend running the alternate-part lookup.",
                single_source_count
            ));
        }
        if max_lead >= 20 {
            recommendations.push(format!(
                "Lead-Time Crisis: Maximum lead time is {} weeks. Initiate vendor pipeline reservation or redesign around active distributor stock.",
                max_lead
            ));
        }
        if obsolete_count > 0 {
            recommendations.push(format!(
                "Obsolescence Alert: {} components are NRND or EOL. Immediate engineering change order (ECO) required before mass production.",
                obsolete_count
            ));
        }
        recommendations.push("Verify current supplier quotes and engineering constraints before making a sourcing decision.".to_string());

        SourcingRiskReport {
            project_name: req.project_name,
            overall_risk_score: risk_score,
            risk_level,
            single_source_count,
            obsolete_or_nrnd_count: obsolete_count,
            max_lead_time_weeks: max_lead,
            lead_time_bottlenecks: bottlenecks,
            strategic_recommendations: recommendations,
            estimated_cost_reduction_opportunity_pct: 0.0,
            analyzed_by: "Rule-based heuristics (local)".to_string(),
        }
    }

    /// Finds pin-compatible second-source alternates for critical electronic components.
    pub async fn match_alternate_parts(
        &self,
        req: AlternateMatchRequest,
    ) -> AlternateMatchResponse {
        let norm = req.target_mpn.to_uppercase();
        let mut alternates = Vec::new();

        // High-precision catalog matches for common electronics supply chain parts
        if norm.contains("STM32F4") || norm.contains("STM32F1") {
            alternates.push(AlternatePart {
                alternate_mpn: "GD32F405RGT6".to_string(),
                manufacturer: "GigaDevice".to_string(),
                package_footprint: "LQFP-64".to_string(),
                is_pin_compatible: false,
                availability_status: "Reference suggestion; qualification required".to_string(),
                cost_delta_pct: 0.0,
                match_confidence: 0.0,
                rationale: "Reference candidate only. Verify package, pinout, electrical limits, firmware compatibility and current supplier availability.".to_string(),
            });
            alternates.push(AlternatePart {
                alternate_mpn: "N32G455REL7".to_string(),
                manufacturer: "Nations Technologies".to_string(),
                package_footprint: "LQFP-64".to_string(),
                is_pin_compatible: false,
                availability_status: "Active".to_string(),
                cost_delta_pct: 0.0,
                match_confidence: 0.0,
                rationale:
                    "Reference candidate only. Datasheet and firmware review are required; compatibility has not been qualified."
                        .to_string(),
            });
        } else if norm.contains("LM1117") || norm.contains("AMS1117") {
            alternates.push(AlternatePart {
                alternate_mpn: "TLV1117-33IDCYR".to_string(),
                manufacturer: "Texas Instruments".to_string(),
                package_footprint: "SOT-223".to_string(),
                is_pin_compatible: false,
                availability_status: "Reference suggestion; qualification required".to_string(),
                cost_delta_pct: 0.0,
                match_confidence: 0.0,
                rationale: "Reference candidate only. Verify pinout, dropout, thermal limits, current rating and stability requirements.".to_string(),
            });
            alternates.push(AlternatePart {
                alternate_mpn: "AZ1117EH-3.3TRG1".to_string(),
                manufacturer: "Diodes Incorporated".to_string(),
                package_footprint: "SOT-223".to_string(),
                is_pin_compatible: false,
                availability_status: "Reference suggestion; qualification required".to_string(),
                cost_delta_pct: 0.0,
                match_confidence: 0.0,
                rationale: "Reference candidate only. Verify electrical limits, footprint, pinout and live pricing before substitution.".to_string(),
            });
        }

        if let Some(limit) = req.max_results {
            alternates.truncate(limit);
        }

        AlternateMatchResponse {
            query_mpn: req.target_mpn,
            alternates,
            provider: "Built-in reference catalog".to_string(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_sourcing_risk_evaluation() {
        let engine = AiCopilotEngine::new();
        let req = SourcingRiskRequest {
            project_name: "Automotive Gateway ECU".to_string(),
            target_batch_size: 5000,
            components: vec![
                ComponentRiskInput {
                    mpn: "STM32F401RET6".to_string(),
                    manufacturer: "STMicroelectronics".to_string(),
                    description: "MCU 32-bit 512KB Flash".to_string(),
                    lead_time_weeks: 28, // Long lead time
                    lifecycle_status: "Active".to_string(),
                    is_single_source: true, // Bottleneck
                    unit_price_usd: 4.80,
                },
                ComponentRiskInput {
                    mpn: "LM358-OBS".to_string(),
                    manufacturer: "Legacy Semi".to_string(),
                    description: "Dual Op-Amp".to_string(),
                    lead_time_weeks: 4,
                    lifecycle_status: "Obsolete".to_string(), // High risk
                    is_single_source: false,
                    unit_price_usd: 0.20,
                },
            ],
        };

        let report = engine.analyze_sourcing_risk(req).await;
        assert!(report.overall_risk_score >= 60);
        assert_eq!(report.single_source_count, 1);
        assert_eq!(report.obsolete_or_nrnd_count, 1);
        assert_eq!(report.max_lead_time_weeks, 28);
        assert!(!report.strategic_recommendations.is_empty());
    }

    #[tokio::test]
    async fn test_match_alternate_parts_stm32() {
        let engine = AiCopilotEngine::new();
        let req = AlternateMatchRequest {
            target_mpn: "STM32F401RET6".to_string(),
            manufacturer: "STMicroelectronics".to_string(),
            description: "MCU 32-bit".to_string(),
            max_results: Some(2),
        };

        let res = engine.match_alternate_parts(req).await;
        assert_eq!(res.alternates.len(), 2);
        assert!(!res.alternates[0].is_pin_compatible);
        assert_eq!(res.alternates[0].alternate_mpn, "GD32F405RGT6");
    }
}
