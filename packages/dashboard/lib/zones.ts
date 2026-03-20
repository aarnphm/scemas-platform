import { sensorCatalog } from '@/lib/sensor-catalog'
import hamiltonMonitoringRegionsData from '../../../data/hamilton-monitoring-regions.json'

type ZoneBoundaryGeometry = { type: 'MultiPolygon'; coordinates: number[][][][] }

export type ZoneBoundaryProperties = {
  zoneId: string
  label: string
  community: string
  neighbourhoods: string[]
  planningUnits: string[]
  legacyIds: string[]
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

const groupedLegacyZoneAliases: Record<string, string[]> = {
  ward_2: ['downtown_core', 'north_end_west'],
}

const zoneBoundaryCollection: ZoneBoundaryFeatureCollection = {
  type: 'FeatureCollection',
  features: hamiltonMonitoringRegionsData.features.map(feature => ({
    type: 'Feature',
    properties: {
      zoneId: feature.properties.zoneId,
      label: feature.properties.label,
      community: feature.properties.community,
      neighbourhoods: feature.properties.neighbourhoods,
      planningUnits: feature.properties.planningUnits,
      legacyIds: feature.properties.legacyIds,
      sourceType: 'planning_unit',
      sourceUrl: feature.properties.sourceUrl,
    },
    geometry: { type: 'MultiPolygon', coordinates: feature.geometry.coordinates },
  })),
}

const zoneNameById = new Map<string, string>()
const zoneAliasesById = new Map<string, Set<string>>()
const directLegacyZoneAliases = new Map<string, string>()

for (const feature of zoneBoundaryCollection.features) {
  zoneNameById.set(feature.properties.zoneId, feature.properties.label)
  zoneAliasesById.set(feature.properties.zoneId, new Set([feature.properties.zoneId]))

  for (const legacyId of feature.properties.legacyIds) {
    directLegacyZoneAliases.set(legacyId, feature.properties.zoneId)
    zoneAliasesById.get(feature.properties.zoneId)?.add(legacyId)
  }
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

  if (groupedLegacyZoneAliases[zone]) {
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
  const groupedLegacyLabel = groupedLegacyZoneAliases[zone]
    ? groupedLegacyZoneAliases[zone]
        .map(candidateZone => zoneNameById.get(candidateZone) ?? candidateZone.replaceAll('_', ' '))
        .join(' + ')
    : null
  const label =
    zoneNameById.get(resolvedZone) ?? groupedLegacyLabel ?? resolvedZone.replaceAll('_', ' ')

  return casing === 'title' ? titleCase(label) : label
}

function canonicalZoneIdsForInput(zone: string): string[] {
  const groupedAliases = groupedLegacyZoneAliases[zone]
  if (groupedAliases) {
    return groupedAliases
  }

  return [normalizeDirectZoneId(zone)]
}

function normalizeDirectZoneId(zone: string): string {
  return directLegacyZoneAliases.get(zone) ?? zone
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, character => character.toUpperCase())
}
