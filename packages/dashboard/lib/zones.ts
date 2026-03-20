import { sensorCatalog } from '@/lib/sensor-catalog'
import hamiltonMonitoringRegionsData from '../../../data/hamilton-monitoring-regions.json'

type ZoneBoundaryGeometry = { type: 'MultiPolygon'; coordinates: number[][][][] }

export type ZoneBoundaryProperties = {
  zoneId: string
  label: string
  community: string
  focusArea: string
  neighbourhoods: string[]
  planningUnits: string[]
  planningUnitDetails: Array<{ id: string; label: string }>
  legacyIds: string[]
  wardIds: string[]
  wardLabels: string[]
  sourceType: 'planning_unit'
  sourceUrl: string
}

export type ZoneBoundaryFeature = {
  type: 'Feature'
  properties: ZoneBoundaryProperties
  geometry: ZoneBoundaryGeometry
}

export type ZoneBoundaryFeatureCollection = {
  type: 'FeatureCollection'
  features: ZoneBoundaryFeature[]
}

const zoneBoundaryCollection: ZoneBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: hamiltonMonitoringRegionsData.features.map(feature => ({
    type: 'Feature',
    properties: {
      zoneId: feature.properties.zoneId,
      label: feature.properties.label,
      community: feature.properties.community,
      focusArea: feature.properties.focusArea,
      neighbourhoods: feature.properties.neighbourhoods,
      planningUnits: feature.properties.planningUnits,
      planningUnitDetails: feature.properties.planningUnitDetails,
      legacyIds: feature.properties.legacyIds,
      wardIds: feature.properties.wardIds,
      wardLabels: feature.properties.wardLabels,
      sourceType: 'planning_unit',
      sourceUrl: feature.properties.sourceUrl,
    },
    geometry: { type: 'MultiPolygon', coordinates: feature.geometry.coordinates },
  })),
}

const groupedLegacyZoneAliases = new Map<string, Set<string>>()
const zoneNameById = new Map<string, string>()
const zoneAliasesById = new Map<string, Set<string>>()
const directLegacyZoneAliases = new Map<string, string>()
const compatibilityZoneAliases: Record<string, string> = { ward_14: 'west_mountain' }

for (const feature of zoneBoundaryCollection.features) {
  zoneNameById.set(feature.properties.zoneId, feature.properties.label)
  zoneAliasesById.set(feature.properties.zoneId, new Set([feature.properties.zoneId]))

  for (const legacyId of feature.properties.legacyIds) {
    directLegacyZoneAliases.set(legacyId, feature.properties.zoneId)
    zoneAliasesById.get(feature.properties.zoneId)?.add(legacyId)
  }

  for (const wardId of feature.properties.wardIds) {
    const zones = groupedLegacyZoneAliases.get(wardId) ?? new Set<string>()
    zones.add(feature.properties.zoneId)
    groupedLegacyZoneAliases.set(wardId, zones)
  }
}

for (const [legacyZone, canonicalZone] of Object.entries(compatibilityZoneAliases)) {
  directLegacyZoneAliases.set(legacyZone, canonicalZone)
  zoneAliasesById.get(canonicalZone)?.add(legacyZone)
}

const sensorZoneById = new Map<string, string>()
const zoneSensorIdsById = new Map<string, Set<string>>()

for (const sensor of sensorCatalog) {
  const zoneId = normalizeDirectZoneId(sensor.zone)
  sensorZoneById.set(sensor.sensor_id, zoneId)

  const sensorIds = zoneSensorIdsById.get(zoneId) ?? new Set<string>()
  sensorIds.add(sensor.sensor_id)
  zoneSensorIdsById.set(zoneId, sensorIds)
}

export const hamiltonMonitoringRegions = zoneBoundaryCollection

export const zoneOptions: Array<{ id: string; label: string }> = zoneBoundaryCollection.features
  .map(f => ({ id: f.properties.zoneId, label: f.properties.label }))
  .toSorted((a, b) => a.label.localeCompare(b.label))

export function normalizeZoneId(zone: string, sensorId?: string): string {
  if (sensorId) {
    const sensorZone = sensorZoneById.get(sensorId)
    if (sensorZone) {
      return sensorZone
    }
  }

  return normalizeDirectZoneId(zone)
}

export function normalizeZoneIds(zones: string[]): string[] {
  const normalizedZones = new Set<string>()
  for (const zone of zones) {
    for (const canonicalZone of canonicalZoneIdsForInput(zone)) {
      normalizedZones.add(canonicalZone)
    }
  }

  return Array.from(normalizedZones).toSorted((left, right) => left.localeCompare(right))
}

export function expandZoneIds(zone: string): string[] {
  const expandedZones = new Set<string>()

  if (groupedLegacyZoneAliases.has(zone)) {
    expandedZones.add(zone)
  }

  for (const canonicalZone of canonicalZoneIdsForInput(zone)) {
    const zoneAliases = zoneAliasesById.get(canonicalZone)
    if (!zoneAliases) {
      expandedZones.add(canonicalZone)
      continue
    }

    for (const candidateZone of zoneAliases) {
      expandedZones.add(candidateZone)
    }
  }

  return Array.from(expandedZones).toSorted((left, right) => left.localeCompare(right))
}

export function expandZoneIdSet(zones: string[]): string[] {
  const expandedZones = new Set<string>()
  for (const zone of zones) {
    for (const candidateZone of expandZoneIds(zone)) {
      expandedZones.add(candidateZone)
    }
  }

  return Array.from(expandedZones).toSorted((left, right) => left.localeCompare(right))
}

export function expandZoneSensorIds(zone: string): string[] {
  const sensorIds = new Set<string>()
  for (const canonicalZone of canonicalZoneIdsForInput(zone)) {
    for (const sensorId of zoneSensorIdsById.get(canonicalZone) ?? []) {
      sensorIds.add(sensorId)
    }
  }

  return Array.from(sensorIds).toSorted((left, right) => left.localeCompare(right))
}

export function expandZoneSensorIdSet(zones: string[]): string[] {
  const sensorIds = new Set<string>()
  for (const zone of zones) {
    for (const sensorId of expandZoneSensorIds(zone)) {
      sensorIds.add(sensorId)
    }
  }

  return Array.from(sensorIds).toSorted((left, right) => left.localeCompare(right))
}

export function isKnownZoneId(zone: string): boolean {
  return zoneNameById.has(zone)
}

export function formatZoneName(
  zone: string,
  casing: 'lower' | 'title' = 'lower',
  sensorId?: string,
): string {
  const resolvedZone = normalizeZoneId(zone, sensorId)
  const groupedZones = groupedLegacyZoneAliases.get(zone)
  const groupedLegacyLabel = groupedZones
    ? Array.from(groupedZones)
        .map(candidateZone => zoneNameById.get(candidateZone) ?? candidateZone.replaceAll('_', ' '))
        .join(' + ')
    : null
  const label =
    zoneNameById.get(resolvedZone) ?? groupedLegacyLabel ?? resolvedZone.replaceAll('_', ' ')

  return casing === 'title' ? titleCase(label) : label
}

function canonicalZoneIdsForInput(zone: string): string[] {
  const groupedAliases = groupedLegacyZoneAliases.get(zone)
  if (groupedAliases) {
    return Array.from(groupedAliases).toSorted((left, right) => left.localeCompare(right))
  }

  return [normalizeDirectZoneId(zone)]
}

function normalizeDirectZoneId(zone: string): string {
  return directLegacyZoneAliases.get(zone) ?? zone
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, character => character.toUpperCase())
}
