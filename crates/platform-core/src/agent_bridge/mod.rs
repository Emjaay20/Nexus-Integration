//! Developer Agent Platform Bridge (MCP & Automation Interface)
//!
//! Directly addresses the Team Core mandate: "Help our engineers use agents more productively".
//! Exposes structured platform tools that AI coding agents (Cursor, Claude, internal bots)
//! can call to validate rules, profile queries, and run policy simulations.

use crate::authz::{Action, PolicyRule, RuleEffect, SensitivityLevel};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleValidationRequest {
    pub rule: PolicyRule,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RuleValidationResponse {
    pub is_valid: bool,
    pub security_score: u32, // 0 - 100
    pub findings: Vec<SecurityFinding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityFinding {
    pub severity: FindingSeverity,
    pub title: String,
    pub description: String,
    pub remediation: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FindingSeverity {
    Info,
    Warning,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryProfileRequest {
    pub sql_query: String,
    pub table_context: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryProfileResponse {
    pub is_production_ready: bool,
    pub detected_anti_patterns: Vec<String>,
    pub optimization_suggestions: Vec<String>,
}

pub struct AgentBridge;

impl AgentBridge {
    /// Validates a proposed permission rule against Team Core enterprise security standards.
    pub fn validate_policy_rule(rule: &PolicyRule) -> RuleValidationResponse {
        let mut findings = Vec::new();
        let mut score: i32 = 100;

        // Check 1: Overly permissive wildcard on sensitive actions
        if rule.allowed_roles.contains(&"*".to_string()) && rule.effect == RuleEffect::Allow {
            score -= 40;
            findings.push(SecurityFinding {
                severity: FindingSeverity::Critical,
                title: "Wildcard Role on Allow Rule".to_string(),
                description: "Rule grants permissions to all roles ('*'), violating least-privilege principles.".to_string(),
                remediation: "Explicitly enumerate allowed roles (e.g. ['design_engineer', 'platform_admin']).".to_string(),
            });
        }

        // Check 2: Unprotected Restricted Pricing without NDA
        if rule.allowed_actions.contains(&Action::ExportPricing)
            && rule.max_sensitivity == SensitivityLevel::RestrictedPrice
            && !rule.require_nda
        {
            score -= 30;
            findings.push(SecurityFinding {
                severity: FindingSeverity::Critical,
                title: "Restricted Pricing Export without NDA".to_string(),
                description: "Exporting confidential pricing models requires a signed NDA under Luminovo compliance rules.".to_string(),
                remediation: "Set 'require_nda: true' on this policy rule.".to_string(),
            });
        }

        // Check 3: Tenant isolation disabled for non-admin
        if !rule.require_same_tenant
            && rule.effect == RuleEffect::Allow
            && !rule.allowed_roles.iter().any(|r| r.contains("admin"))
        {
            score -= 25;
            findings.push(SecurityFinding {
                severity: FindingSeverity::Warning,
                title: "Cross-Tenant Access Enabled for Non-Admin".to_string(),
                description: "Multi-tenant boundaries are disabled ('require_same_tenant: false'), allowing cross-organization data visibility.".to_string(),
                remediation: "Enable 'require_same_tenant: true' unless explicitly authoring a platform-wide broker policy.".to_string(),
            });
        }

        let final_score = score.clamp(0, 100) as u32;
        let is_valid = findings.iter().all(|f| f.severity != FindingSeverity::Critical);

        RuleValidationResponse {
            is_valid,
            security_score: final_score,
            findings,
        }
    }

    /// Scans SQL queries written by engineers/agents for multi-tenancy leaks and anti-patterns.
    pub fn profile_sql_query(query: &str) -> QueryProfileResponse {
        let upper = query.to_uppercase();
        let mut anti_patterns = Vec::new();
        let mut suggestions = Vec::new();

        // Check 1: Multi-tenancy isolation check
        if !upper.contains("TENANT_ID") && !upper.contains("ORG_ID") {
            anti_patterns.push("Missing Tenant Isolation: Query lacks 'tenant_id' or 'org_id' WHERE clause predicate.".to_string());
            suggestions.push("Always scope queries by 'WHERE tenant_id = $1' to prevent data leaks between customer accounts.".to_string());
        }

        // Check 2: SELECT * anti-pattern
        if upper.contains("SELECT *") {
            anti_patterns.push("Unbounded Projection: Using 'SELECT *' loads unused columns and increases serialization overhead.".to_string());
            suggestions.push("Specify explicit column names in the SELECT clause.".to_string());
        }

        // Check 3: Missing LIMIT on large tables
        if (upper.contains("FROM BOM_ITEMS") || upper.contains("FROM QUOTATIONS") || upper.contains("FROM COMPONENTS"))
            && !upper.contains("LIMIT")
        {
            anti_patterns.push("Unbounded Result Set: Large table query without LIMIT can cause Out-Of-Memory (OOM) under high concurrency.".to_string());
            suggestions.push("Add a 'LIMIT' and 'OFFSET' or cursor-based pagination.".to_string());
        }

        let is_production_ready = anti_patterns.is_empty();

        QueryProfileResponse {
            is_production_ready,
            detected_anti_patterns: anti_patterns,
            optimization_suggestions: suggestions,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_insecure_rule() {
        let insecure_rule = PolicyRule {
            id: "bad-rule".to_string(),
            name: "Dangerous Rule".to_string(),
            description: "Allows everyone everything".to_string(),
            effect: RuleEffect::Allow,
            allowed_roles: vec!["*".to_string()],
            allowed_actions: vec![Action::ExportPricing],
            allowed_resource_types: vec!["pricing".to_string()],
            max_sensitivity: SensitivityLevel::RestrictedPrice,
            require_nda: false,
            require_same_tenant: false,
        };

        let res = AgentBridge::validate_policy_rule(&insecure_rule);
        assert!(!res.is_valid);
        assert!(res.security_score < 50);
        assert_eq!(res.findings.len(), 3);
    }

    #[test]
    fn test_profile_sql_query_anti_patterns() {
        let bad_query = "SELECT * FROM bom_items WHERE quantity > 10";
        let res = AgentBridge::profile_sql_query(bad_query);
        assert!(!res.is_production_ready);
        assert_eq!(res.detected_anti_patterns.len(), 3);
    }
}
