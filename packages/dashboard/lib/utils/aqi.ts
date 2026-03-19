// AQI calculation per EPA methodology (SRS PR-PA3)
// and color mapping for severity visualization

export function aqiColor(aqi: number): string {
  if (aqi <= 50) return 'var(--color-severity-low)'
  if (aqi <= 100) return 'var(--color-severity-warning)'
  return 'var(--color-severity-critical)'
}

export function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'good'
  if (aqi <= 100) return 'moderate'
  if (aqi <= 150) return 'unhealthy for sensitive groups'
  if (aqi <= 200) return 'unhealthy'
  if (aqi <= 300) return 'very unhealthy'
  return 'hazardous'
}
