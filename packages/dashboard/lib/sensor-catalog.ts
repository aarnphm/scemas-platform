import sensorCatalogData from '../../../data/hamilton-sensor-catalog.json'
import hamiltonMonitoringRegionsData from '../../../data/hamilton-monitoring-regions.json'

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
  placement: string
  provider: string
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
  planning_unit_ids: string[]
  maintenance_cycle_days: number
}

type RawSensorCatalogEntry = Omit<SensorCatalogEntry, 'tracking'>

const rawSensorCatalog: RawSensorCatalogEntry[] = sensorCatalogData

const planningUnitIdsByZone = new Map<string, string[]>(
  hamiltonMonitoringRegionsData.features.map(feature => [
    feature.properties.zoneId,
    feature.properties.planningUnits,
  ]),
)

const wardIdsByZone: Record<string, string[]> = {
  downtown_core: ['ward_2'],
  west_mountain: ['ward_8'],
  crown_point_west: ['ward_3'],
  north_end_west: ['ward_2'],
  cootes_paradise: ['ward_1'],
  battlefield: ['ward_5'],
}

export const sensorCatalog: SensorCatalogEntry[] = rawSensorCatalog.map(sensor => ({
  ...sensor,
  tracking: {
    ward_ids: wardIdsByZone[sensor.zone] ?? [],
    planning_unit_ids: planningUnitIdsByZone.get(sensor.zone) ?? [],
    maintenance_cycle_days: sensor.device_type === 'air_quality' ? 45 : 90,
  },
}))
