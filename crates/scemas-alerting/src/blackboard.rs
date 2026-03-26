// blackboard shared state (from D2 architecture: alerting management uses blackboard pattern)
//
// the blackboard is a shared data structure that multiple "knowledge sources" read and write:
// - evaluator: reads rules + readings, writes alerts
// - dispatcher: reads pending notifications, writes delivery status
// - lifecycle: reads alerts, writes state transitions
//
// in this simplified implementation the blackboard is a plain struct.
// synchronous access is fine at demo throughput.

use scemas_core::models::{Alert, ThresholdRule};
use std::collections::HashMap;
use uuid::Uuid;

/// shared state for the alerting subsystem
pub struct Blackboard {
    pub active_rules: HashMap<Uuid, ThresholdRule>,
    pub active_alerts: HashMap<Uuid, Alert>,
}

impl Blackboard {
    pub fn new() -> Self {
        Self {
            active_rules: HashMap::new(),
            active_alerts: HashMap::new(),
        }
    }

    pub fn replace_rules(&mut self, rules: impl IntoIterator<Item = ThresholdRule>) {
        self.active_rules = rules.into_iter().map(|rule| (rule.id, rule)).collect();
    }

    pub fn upsert_rule(&mut self, rule: ThresholdRule) {
        self.active_rules.insert(rule.id, rule);
    }

    pub fn remove_rule(&mut self, id: &Uuid) {
        self.active_rules.remove(id);
    }

    pub fn post_alert(&mut self, alert: Alert) {
        self.active_alerts.insert(alert.id, alert);
    }

    pub fn get_alert(&self, id: &Uuid) -> Option<&Alert> {
        self.active_alerts.get(id)
    }
}

impl Default for Blackboard {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{evaluator, lifecycle};
    use chrono::Utc;
    use scemas_core::models::{
        Alert, AlertStatus, Comparison, IndividualSensorReading, MetricType, RuleStatus, Severity,
        ThresholdRule,
    };
    use uuid::Uuid;

    // Blackboard architecture tests
    //
    // The blackboard is shared mutable state for the alerting subsystem.
    // Multiple independent "knowledge sources" read and write it:
    //   - evaluator: reads active_rules, writes new alerts
    //   - lifecycle:  reads active_alerts, validates state transitions
    //   - dispatcher: reads active_alerts, dispatches to subscribers
    //
    // No knowledge source calls another directly; all coordination flows
    // through the blackboard. The tests below demonstrate this pattern.

    fn sample_rule() -> ThresholdRule {
        ThresholdRule {
            id: Uuid::new_v4(),
            metric_type: MetricType::Temperature,
            threshold_value: 35.0,
            comparison: Comparison::Gt,
            zone: Some("downtown_core".into()),
            rule_status: RuleStatus::Active,
        }
    }

    fn sample_reading(value: f64) -> IndividualSensorReading {
        IndividualSensorReading {
            sensor_id: "temp-dt-001".into(),
            metric_type: MetricType::Temperature,
            value,
            zone: "downtown_core".into(),
            timestamp: Utc::now(),
        }
    }

    fn sample_alert() -> Alert {
        Alert {
            id: Uuid::new_v4(),
            rule_id: Uuid::new_v4(),
            sensor_id: "temp-dt-001".into(),
            severity: Severity::Warning,
            status: AlertStatus::Active,
            triggered_value: 38.0,
            zone: "downtown_core".into(),
            metric_type: MetricType::Temperature,
            created_at: Utc::now(),
            acknowledged_by: None,
            acknowledged_at: None,
            resolved_at: None,
        }
    }

    #[test]
    fn rules_loaded_into_blackboard_are_visible_to_evaluator() {
        // Knowledge source: evaluator reads rules from the blackboard.
        // Rules must be present on the blackboard before evaluation can fire alerts.
        let mut bb = Blackboard::new();
        let rule = sample_rule();
        bb.upsert_rule(rule.clone());

        let reading = sample_reading(40.0);
        let alerts = evaluator::evaluate(&reading, bb.active_rules.values());
        assert_eq!(
            alerts.len(),
            1,
            "evaluator should fire against the loaded rule"
        );
    }

    #[test]
    fn alerts_posted_by_evaluator_are_readable_by_other_knowledge_sources() {
        // Core blackboard contract: a value written by one knowledge source
        // is immediately visible to all others through the shared state.
        let mut bb = Blackboard::new();
        let alert = sample_alert();
        let id = alert.id;

        bb.post_alert(alert);

        assert!(
            bb.get_alert(&id).is_some(),
            "alert posted by evaluator must be readable by dispatcher / lifecycle"
        );
    }

    #[test]
    fn full_workflow_evaluate_post_then_lifecycle_transition() {
        // End-to-end blackboard workflow without a database:
        //   1. Load rule onto blackboard (control layer writes)
        //   2. Evaluator reads rules, evaluates a reading, produces alerts
        //   3. Alerts posted to blackboard (evaluator writes)
        //   4. Lifecycle reads alert from blackboard and validates transition
        //
        // No knowledge source calls another; the blackboard is the only
        // coordination mechanism.
        let mut bb = Blackboard::new();
        bb.upsert_rule(sample_rule());

        // evaluator knowledge source
        let reading = sample_reading(40.0);
        let alerts = evaluator::evaluate(&reading, bb.active_rules.values());
        assert!(!alerts.is_empty());
        for alert in alerts {
            bb.post_alert(alert);
        }

        // lifecycle knowledge source reads the same alert from the blackboard
        let alert = bb.active_alerts.values().next().unwrap();
        assert!(
            lifecycle::can_transition(&alert.status, &AlertStatus::Acknowledged),
            "lifecycle should permit Active → Acknowledged for a freshly posted alert"
        );
    }

    #[test]
    fn removing_a_rule_prevents_future_alerts() {
        // Blackboard mutations are immediately visible to all knowledge sources.
        // Removing a rule from the blackboard stops the evaluator from firing it.
        let mut bb = Blackboard::new();
        let rule = sample_rule();
        bb.upsert_rule(rule.clone());
        bb.remove_rule(&rule.id);

        let reading = sample_reading(40.0);
        let alerts = evaluator::evaluate(&reading, bb.active_rules.values());
        assert!(alerts.is_empty(), "evaluator must not fire a removed rule");
    }

    #[test]
    fn replace_rules_atomically_swaps_the_full_rule_set() {
        // replace_rules is used on startup and on admin rule reload.
        // It replaces all existing rules atomically, removing stale entries.
        let mut bb = Blackboard::new();
        bb.upsert_rule(sample_rule());
        bb.upsert_rule(sample_rule()); // two distinct rules (different UUIDs)
        assert_eq!(bb.active_rules.len(), 2);

        let new_rule = sample_rule();
        bb.replace_rules(vec![new_rule.clone()]);

        assert_eq!(bb.active_rules.len(), 1);
        assert!(bb.active_rules.contains_key(&new_rule.id));
    }

    #[test]
    fn empty_blackboard_produces_no_alerts() {
        // Evaluator with no rules on the blackboard never fires.
        // Demonstrates the blackboard's role as the source of truth for rules.
        let bb = Blackboard::new();
        let reading = sample_reading(40.0);
        let alerts = evaluator::evaluate(&reading, bb.active_rules.values());
        assert!(alerts.is_empty());
    }
}
