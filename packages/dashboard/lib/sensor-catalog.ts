import hamiltonMonitoringRegionsData from '../../../data/hamilton-monitoring-regions.json'
import sensorCatalogData from '../../../data/hamilton-sensor-catalog.json'

export type SensorSimulationProfile = {
  mean: number
  variance: number
  spike: number
  min: number
  max: number
}

export type SensorCatalogEntry = {
  sensor_id: string
  asset_id: string
  station_id: string
  display_name: string
  device_type: string
  zone: string
  region_label: string
  site_name: string
  site_profile: string
  placement: string
  provider: string
  ward_id: string
  ward_label: string
  host_planning_unit_id: string
  host_planning_unit_label: string
  community: string
  focus_area: string
  sampling_interval_seconds: number
  telemetry_unit: string
  install_height_m: number
  lat: number
  lng: number
  simulation: SensorSimulationProfile
  tracking: SensorTrackingContext
}

export type SensorTrackingContext = {
  ward_ids: string[]
  ward_labels: string[]
  planning_unit_ids: string[]
  planning_unit_labels: string[]
  community: string
  neighbourhoods: string[]
  focus_area: string
  maintenance_cycle_days: number
}

type RawSensorCatalogEntry = Omit<SensorCatalogEntry, 'tracking'>

const rawSensorCatalog: RawSensorCatalogEntry[] = sensorCatalogData

const regionMetadataByZone = new Map(
  hamiltonMonitoringRegionsData.features.map(feature => [
    feature.properties.zoneId,
    {
      wardIds: feature.properties.wardIds,
      wardLabels: feature.properties.wardLabels,
      planningUnitIds: feature.properties.planningUnits,
      planningUnitLabels: feature.properties.planningUnitDetails.map(detail => detail.label),
      community: feature.properties.community,
      neighbourhoods: feature.properties.neighbourhoods,
      focusArea: feature.properties.focusArea,
    },
  ]),
)

// oxlint-disable-next-line no-map-spread
export const sensorCatalog: SensorCatalogEntry[] = rawSensorCatalog.map(sensor => {
  const regionMetadata = regionMetadataByZone.get(sensor.zone)

  return {
    ...sensor,
    tracking: {
      ward_ids: regionMetadata?.wardIds ?? [],
      ward_labels: regionMetadata?.wardLabels ?? [],
      planning_unit_ids: regionMetadata?.planningUnitIds ?? [],
      planning_unit_labels: regionMetadata?.planningUnitLabels ?? [],
      community: regionMetadata?.community ?? sensor.community,
      neighbourhoods: regionMetadata?.neighbourhoods ?? [],
      focus_area: regionMetadata?.focusArea ?? sensor.focus_area,
      maintenance_cycle_days: sensor.device_type === 'air_quality' ? 45 : 90,
    },
  }
})
