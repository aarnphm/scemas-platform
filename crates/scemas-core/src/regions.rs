pub const DOWNTOWN_CORE: &str = "downtown_core";
pub const WEST_MOUNTAIN: &str = "west_mountain";
pub const CROWN_POINT_WEST: &str = "crown_point_west";
pub const NORTH_END_WEST: &str = "north_end_west";
pub const COOTES_PARADISE: &str = "cootes_paradise";
pub const BATTLEFIELD: &str = "battlefield";

pub fn normalize_zone_id(zone: &str, sensor_id: Option<&str>) -> String {
    if let Some(sensor_zone) = sensor_id.and_then(canonical_zone_for_sensor) {
        return sensor_zone.to_string();
    }

    direct_zone_alias(zone).unwrap_or(zone).to_string()
}

pub fn zone_filter_matches(
    filter_zone: &str,
    candidate_zone: &str,
    sensor_id: Option<&str>,
) -> bool {
    let canonical_candidate = normalize_zone_id(candidate_zone, sensor_id);
    canonical_zone_ids_for_input(filter_zone)
        .iter()
        .any(|zone| zone == &canonical_candidate)
}

pub fn zones_filter_match(
    filter_zones: &[String],
    candidate_zone: &str,
    sensor_id: Option<&str>,
) -> bool {
    filter_zones
        .iter()
        .any(|zone| zone_filter_matches(zone, candidate_zone, sensor_id))
}

fn canonical_zone_ids_for_input(zone: &str) -> Vec<String> {
    match zone {
        "ward_2" => vec![DOWNTOWN_CORE.to_string(), NORTH_END_WEST.to_string()],
        _ => vec![direct_zone_alias(zone).unwrap_or(zone).to_string()],
    }
}

fn direct_zone_alias(zone: &str) -> Option<&'static str> {
    match zone {
        "downtown" => Some(DOWNTOWN_CORE),
        "east_end" | "ward_3" => Some(CROWN_POINT_WEST),
        "mcmaster" | "ward_1" => Some(COOTES_PARADISE),
        "stoney_creek" | "ward_5" => Some(BATTLEFIELD),
        "waterfront" => Some(NORTH_END_WEST),
        "ward_14" => Some(WEST_MOUNTAIN),
        _ => None,
    }
}

fn canonical_zone_for_sensor(sensor_id: &str) -> Option<&'static str> {
    let mut segments = sensor_id.split('-');
    let _metric_code = segments.next()?;
    let region_code = segments.next()?;

    match region_code {
        "dt" => Some(DOWNTOWN_CORE),
        "wm" => Some(WEST_MOUNTAIN),
        "ee" => Some(CROWN_POINT_WEST),
        "wf" => Some(NORTH_END_WEST),
        "mc" => Some(COOTES_PARADISE),
        "sc" => Some(BATTLEFIELD),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use crate::regions::{
        BATTLEFIELD, COOTES_PARADISE, CROWN_POINT_WEST, DOWNTOWN_CORE, NORTH_END_WEST,
        normalize_zone_id, zone_filter_matches, zones_filter_match,
    };

    #[test]
    fn normalizes_direct_legacy_aliases() {
        assert_eq!(normalize_zone_id("downtown", None), DOWNTOWN_CORE);
        assert_eq!(normalize_zone_id("ward_3", None), CROWN_POINT_WEST);
        assert_eq!(normalize_zone_id("mcmaster", None), COOTES_PARADISE);
        assert_eq!(normalize_zone_id("stoney_creek", None), BATTLEFIELD);
    }

    #[test]
    fn resolves_shared_ward_by_sensor_identity() {
        assert_eq!(
            normalize_zone_id("ward_2", Some("temp-dt-001")),
            DOWNTOWN_CORE
        );
        assert_eq!(
            normalize_zone_id("ward_2", Some("temp-wf-001")),
            NORTH_END_WEST
        );
    }

    #[test]
    fn grouped_ward_filter_matches_both_regions() {
        assert!(zone_filter_matches(
            "ward_2",
            "downtown_core",
            Some("temp-dt-001")
        ));
        assert!(zone_filter_matches(
            "ward_2",
            "north_end_west",
            Some("temp-wf-001")
        ));
    }

    #[test]
    fn resolves_extended_sensor_ids_by_region_segment() {
        assert_eq!(
            normalize_zone_id("ward_2", Some("aqi-dt-civic-002")),
            DOWNTOWN_CORE
        );
        assert_eq!(
            normalize_zone_id("waterfront", Some("noise-wf-bayfront-003")),
            NORTH_END_WEST
        );
    }

    #[test]
    fn subscription_filters_match_any_supported_alias() {
        let zones = vec!["waterfront".to_string(), "battlefield".to_string()];
        assert!(zones_filter_match(
            &zones,
            "north_end_west",
            Some("temp-wf-001")
        ));
        assert!(zones_filter_match(
            &zones,
            "battlefield",
            Some("temp-sc-001")
        ));
        assert!(!zones_filter_match(
            &zones,
            "cootes_paradise",
            Some("temp-mc-001")
        ));
    }
}
