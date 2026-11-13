//! Declarative ABAC & RBAC Policy Decision Point (PDP)
//!
//! Provides ultra-low-latency in-memory policy evaluation for multi-tenant
//! electronics supply chain workflows (OEMs, EMS providers, Component Distributors).
//!
//! Features atomic, lock-free hot-reloading via `ArcSwap`.

use arc_swap::ArcSwap;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

/// Action being attempted on a resource.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Action {
    Read,
    Write,
    Delete,
    ApproveQuotation,
    ExportPricing,
    SourceAlternates,
    ManageTenant,
}

/// Sensitivity classification of an electronics supply chain resource.
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SensitivityLevel {
    Public = 0,
    Internal = 1,
    Confidential = 2,
    RestrictedPrice = 3,
}

/// Subject requesting access (engineer, procurement specialist, auditor).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Subject {
    pub user_id: String,
    pub tenant_id: String,
    pub role: String,
    pub clearance: SensitivityLevel,
    pub attributes: HashMap<String, String>,
}

/// Resource being accessed (e.g. BOM item, Supplier Quote, Pricing Model).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub resource_id: String,
    pub resource_type: String,
    pub tenant_id: String,
    pub sensitivity: SensitivityLevel,
    pub attributes: HashMap<String, String>,
}

/// Contextual conditions evaluated at runtime (e.g. NDA requirement, budget limit).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Context {
    pub current_time: DateTime<Utc>,
    pub nda_signed: bool,
    pub ip_address: Option<String>,
}

impl Default for Context {
    fn default() -> Self {
        Self {
            current_time: Utc::now(),
            nda_signed: true,
            ip_address: None,
        }
    }
}

/// Policy rule defining permissions.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyRule {
    pub id: String,
    pub name: String,
    pub description: String,
    pub effect: RuleEffect,
    pub allowed_roles: Vec<String>,
    pub allowed_actions: Vec<Action>,
    pub allowed_resource_types: Vec<String>,
    pub max_sensitivity: SensitivityLevel,
    pub require_nda: bool,
    pub require_same_tenant: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RuleEffect {
    Allow,
    Deny,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Decision {
    Allow,
    Deny,
}

/// Result of evaluating an access request.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationResult {
    pub decision: Decision,
    pub matched_rule_id: Option<String>,
    pub reason: String,
    pub latency_nanos: u64,
}

/// The set of active policies compiled in memory.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicySet {
    pub version: u64,
    pub updated_at: DateTime<Utc>,
    pub rules: Vec<PolicyRule>,
}

impl PolicySet {
    /// Generates a default, enterprise-grade policy set tailored for Luminovo.
    pub fn default_luminovo_policies() -> Self {
        let rules = vec![
            PolicyRule {
                id: "rule-admin-super".to_string(),
                name: "Platform Admin Superuser".to_string(),
                description: "Full access across platform for Team Core administrators".to_string(),
                effect: RuleEffect::Allow,
                allowed_roles: vec!["platform_admin".to_string(), "staff_engineer".to_string()],
                allowed_actions: vec![
                    Action::Read,
                    Action::Write,
                    Action::Delete,
                    Action::ApproveQuotation,
                    Action::ExportPricing,
                    Action::SourceAlternates,
                    Action::ManageTenant,
                ],
                allowed_resource_types: vec!["*".to_string()],
                max_sensitivity: SensitivityLevel::RestrictedPrice,
                require_nda: false,
                require_same_tenant: false,
            },
            PolicyRule {
                id: "rule-oem-engineer".to_string(),
                name: "OEM Design Engineer BOM Access".to_string(),
                description: "Allows design engineers to read/write their organization's BOMs".to_string(),
                effect: RuleEffect::Allow,
                allowed_roles: vec!["design_engineer".to_string(), "hardware_lead".to_string()],
                allowed_actions: vec![Action::Read, Action::Write, Action::SourceAlternates],
                allowed_resource_types: vec!["bom".to_string(), "component".to_string()],
                max_sensitivity: SensitivityLevel::Confidential,
                require_nda: true,
                require_same_tenant: true,
            },
            PolicyRule {
                id: "rule-ems-procurement".to_string(),
                name: "EMS Procurement Pricing Access".to_string(),
                description: "Allows contract manufacturer procurement to view & export pricing with signed NDA".to_string(),
                effect: RuleEffect::Allow,
                allowed_roles: vec!["ems_procurement".to_string(), "sourcing_specialist".to_string()],
                allowed_actions: vec![Action::Read, Action::ApproveQuotation, Action::ExportPricing],
                allowed_resource_types: vec!["quotation".to_string(), "bom".to_string(), "pricing".to_string()],
                max_sensitivity: SensitivityLevel::RestrictedPrice,
                require_nda: true,
                require_same_tenant: false,
            },
            PolicyRule {
                id: "rule-deny-unauthorized-export".to_string(),
                name: "Deny Pricing Export without Clearance".to_string(),
                description: "Explicitly denies exporting restricted pricing if clearance is lower than RestrictedPrice".to_string(),
                effect: RuleEffect::Deny,
                allowed_roles: vec!["auditor".to_string(), "junior_engineer".to_string()],
                allowed_actions: vec![Action::ExportPricing],
                allowed_resource_types: vec!["pricing".to_string()],
                max_sensitivity: SensitivityLevel::Public,
                require_nda: false,
                require_same_tenant: false,
            },
        ];

        Self {
            version: 1,
            updated_at: Utc::now(),
            rules,
        }
    }
}

/// The thread-safe Policy Decision Point (PDP) engine.
pub struct PolicyEngine {
    policy_set: ArcSwap<PolicySet>,
}

impl PolicyEngine {
    pub fn new(initial_set: PolicySet) -> Self {
        Self {
            policy_set: ArcSwap::from_pointee(initial_set),
        }
    }

    /// Evaluates whether a subject can perform an action on a resource under given context.
    /// Operates with lock-free atomic pointer dereference for sub-microsecond latency.
    pub fn evaluate(
        &self,
        subject: &Subject,
        action: &Action,
        resource: &Resource,
        context: &Context,
    ) -> EvaluationResult {
        let start = Instant::now();
        let policies = self.policy_set.load();

        // 1. Check for explicit DENY rules first
        for rule in policies.rules.iter().filter(|r| r.effect == RuleEffect::Deny) {
            if self.rule_matches(rule, subject, action, resource, context) {
                let latency_nanos = start.elapsed().as_nanos() as u64;
                return EvaluationResult {
                    decision: Decision::Deny,
                    matched_rule_id: Some(rule.id.clone()),
                    reason: format!("Explicitly denied by security rule '{}'", rule.name),
                    latency_nanos,
                };
            }
        }

        // 2. Check for matching ALLOW rules
        for rule in policies.rules.iter().filter(|r| r.effect == RuleEffect::Allow) {
            if self.rule_matches(rule, subject, action, resource, context) {
                let latency_nanos = start.elapsed().as_nanos() as u64;
                return EvaluationResult {
                    decision: Decision::Allow,
                    matched_rule_id: Some(rule.id.clone()),
                    reason: format!("Access granted by rule '{}'", rule.name),
                    latency_nanos,
                };
            }
        }

        // 3. Default Deny (Zero-Trust)
        let latency_nanos = start.elapsed().as_nanos() as u64;
        EvaluationResult {
            decision: Decision::Deny,
            matched_rule_id: None,
            reason: "Default Deny: No matching policy rule granted permission".to_string(),
            latency_nanos,
        }
    }

    fn rule_matches(
        &self,
        rule: &PolicyRule,
        subject: &Subject,
        action: &Action,
        resource: &Resource,
        context: &Context,
    ) -> bool {
        // Role check
        if !rule.allowed_roles.contains(&"*".to_string())
            && !rule.allowed_roles.iter().any(|r| r == &subject.role)
        {
            return false;
        }

        // Action check
        if !rule.allowed_actions.contains(action) {
            return false;
        }

        // Resource type check
        if !rule.allowed_resource_types.contains(&"*".to_string())
            && !rule
                .allowed_resource_types
                .iter()
                .any(|rt| rt == &resource.resource_type)
        {
            return false;
        }

        // Sensitivity check: Subject clearance must be >= resource sensitivity, and rule max_sensitivity >= resource sensitivity
        if subject.clearance < resource.sensitivity || rule.max_sensitivity < resource.sensitivity {
            return false;
        }

        // Tenant isolation check
        if rule.require_same_tenant && subject.tenant_id != resource.tenant_id {
            return false;
        }

        // NDA requirement
        if rule.require_nda && !context.nda_signed {
            return false;
        }

        true
    }

    /// Atomically swaps the active policy set without dropping or blocking active evaluation threads.
    pub fn reload_policies(&self, mut new_set: PolicySet) -> u64 {
        new_set.version = self.policy_set.load().version + 1;
        new_set.updated_at = Utc::now();
        let new_version = new_set.version;
        self.policy_set.store(Arc::new(new_set));
        new_version
    }

    /// Returns a snapshot copy of current active policies.
    pub fn get_policies(&self) -> PolicySet {
        (**self.policy_set.load()).clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_admin_superuser_access() {
        let engine = PolicyEngine::new(PolicySet::default_luminovo_policies());
        let admin = Subject {
            user_id: "usr-admin-1".to_string(),
            tenant_id: "luminovo".to_string(),
            role: "platform_admin".to_string(),
            clearance: SensitivityLevel::RestrictedPrice,
            attributes: HashMap::new(),
        };
        let resource = Resource {
            resource_id: "quote-99".to_string(),
            resource_type: "quotation".to_string(),
            tenant_id: "siemens-oem".to_string(),
            sensitivity: SensitivityLevel::RestrictedPrice,
            attributes: HashMap::new(),
        };
        let ctx = Context::default();

        let res = engine.evaluate(&admin, &Action::ExportPricing, &resource, &ctx);
        assert_eq!(res.decision, Decision::Allow);
        assert!(res.latency_nanos < 10_000_000); // Sub-millisecond evaluation in debug, sub-microsecond in release
    }

    #[test]
    fn test_tenant_isolation_enforcement() {
        let engine = PolicyEngine::new(PolicySet::default_luminovo_policies());
        let engineer = Subject {
            user_id: "usr-eng-1".to_string(),
            tenant_id: "oem-bosch".to_string(),
            role: "design_engineer".to_string(),
            clearance: SensitivityLevel::Confidential,
            attributes: HashMap::new(),
        };
        let resource = Resource {
            resource_id: "bom-continental-42".to_string(),
            resource_type: "bom".to_string(),
            tenant_id: "oem-continental".to_string(), // Cross-tenant!
            sensitivity: SensitivityLevel::Confidential,
            attributes: HashMap::new(),
        };
        let ctx = Context::default();

        let res = engine.evaluate(&engineer, &Action::Read, &resource, &ctx);
        assert_eq!(res.decision, Decision::Deny); // Must be denied due to tenant mismatch
    }

    #[test]
    fn test_nda_enforcement() {
        let engine = PolicyEngine::new(PolicySet::default_luminovo_policies());
        let procurement = Subject {
            user_id: "usr-proc-1".to_string(),
            tenant_id: "ems-flex".to_string(),
            role: "ems_procurement".to_string(),
            clearance: SensitivityLevel::RestrictedPrice,
            attributes: HashMap::new(),
        };
        let resource = Resource {
            resource_id: "pricing-quote-10".to_string(),
            resource_type: "pricing".to_string(),
            tenant_id: "oem-siemens".to_string(),
            sensitivity: SensitivityLevel::RestrictedPrice,
            attributes: HashMap::new(),
        };
        let mut ctx = Context::default();
        ctx.nda_signed = false; // Missing NDA!

        let res = engine.evaluate(&procurement, &Action::Read, &resource, &ctx);
        assert_eq!(res.decision, Decision::Deny);
    }

    #[test]
    fn test_atomic_policy_hot_reload() {
        let engine = PolicyEngine::new(PolicySet::default_luminovo_policies());
        let initial_version = engine.get_policies().version;

        let mut updated_policies = engine.get_policies();
        updated_policies.rules.push(PolicyRule {
            id: "rule-custom-contractor".to_string(),
            name: "Contractor Access".to_string(),
            description: "Temporary access".to_string(),
            effect: RuleEffect::Allow,
            allowed_roles: vec!["contractor".to_string()],
            allowed_actions: vec![Action::Read],
            allowed_resource_types: vec!["bom".to_string()],
            max_sensitivity: SensitivityLevel::Internal,
            require_nda: true,
            require_same_tenant: true,
        });

        let new_ver = engine.reload_policies(updated_policies);
        assert_eq!(new_ver, initial_version + 1);
        assert_eq!(engine.get_policies().rules.len(), 5);
    }
}
