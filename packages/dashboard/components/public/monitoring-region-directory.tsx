import { sensorCatalog } from '@/lib/sensor-catalog'
import { hamiltonMonitoringRegions } from '@/lib/zones'

type MonitoringRegionSummary = {
  zoneId: string
  label: string
  community: string
  focusArea: string
  wardLabels: string[]
  neighbourhoods: string[]
  planningUnitCount: number
  stationCount: number
  sensorCount: number
}

const monitoringRegions: MonitoringRegionSummary[] = hamiltonMonitoringRegions.features
  .map(feature => {
    const regionSensors = sensorCatalog.filter(sensor => sensor.zone === feature.properties.zoneId)

    return {
      zoneId: feature.properties.zoneId,
      label: feature.properties.label,
      community: feature.properties.community,
      focusArea: feature.properties.focusArea,
      wardLabels: feature.properties.wardLabels,
      neighbourhoods: feature.properties.neighbourhoods,
      planningUnitCount: feature.properties.planningUnits.length,
      stationCount: new Set(regionSensors.map(sensor => sensor.station_id)).size,
      sensorCount: regionSensors.length,
    }
  })
  .toSorted((left, right) => left.label.localeCompare(right.label))

const wardCount = new Set(monitoringRegions.flatMap(region => region.wardLabels)).size
const planningUnitCount = new Set(
  hamiltonMonitoringRegions.features.flatMap(region => region.properties.planningUnits),
).size
const stationCount = new Set(sensorCatalog.map(sensor => sensor.station_id)).size

export function MonitoringRegionDirectory() {
  return (
    <section className="space-y-4 rounded-xl border border-border/50 bg-card p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-balance">monitoring coverage directory</h2>
        <p className="text-sm text-muted-foreground text-pretty">
          public-facing region labels, ward crosswalks, and planning-unit coverage for the seeded
          hamilton network.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CoverageStat label="regions" value={monitoringRegions.length} />
        <CoverageStat label="wards tracked" value={wardCount} />
        <CoverageStat label="planning units" value={planningUnitCount} />
        <CoverageStat
          label="stations / sensors"
          value={`${stationCount} / ${sensorCatalog.length}`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {monitoringRegions.map(region => (
          <article
            className="rounded-xl border border-border/50 bg-background/40 p-4"
            key={region.zoneId}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-medium text-foreground">
                  {toTitleCase(region.label)}
                </h3>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  {region.community} · {region.focusArea}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-mono tabular-nums text-foreground">
                  {region.stationCount} stations
                </p>
                <p className="font-mono tabular-nums">{region.sensorCount} sensors</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
              <MetadataLine label="wards" value={region.wardLabels.join(', ')} />
              <MetadataLine
                label="planning units"
                value={`${region.planningUnitCount} grouped units`}
              />
              <MetadataLine
                label="neighbourhoods"
                value={region.neighbourhoods.map(toTitleCase).join(', ')}
                wide
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CoverageStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-background/40 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-3xl tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function MetadataLine({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'md:col-span-2' : undefined}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">{label}</p>
      <p className="mt-1 text-sm text-foreground text-pretty">{value}</p>
    </div>
  )
}

function toTitleCase(value: string): string {
  return value.replace(/\b\w/g, character => character.toUpperCase())
}
