import {
  pgTable,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  serial,
  jsonb,
  bigserial,
} from 'drizzle-orm/pg-core'

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('operator'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const devices = pgTable('devices', {
  deviceId: text('device_id').primaryKey(),
  deviceType: text('device_type').notNull(),
  zone: text('zone').notNull(),
  status: text('status').notNull().default('active'),
  registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow().notNull(),
})

export const sensorReadings = pgTable('sensor_readings', {
  id: serial('id').primaryKey(),
  sensorId: text('sensor_id').notNull(),
  metricType: text('metric_type').notNull(),
  value: doublePrecision('value').notNull(),
  zone: text('zone').notNull(),
  time: timestamp('time', { withTimezone: true }).notNull(),
})

export const thresholdRules = pgTable('threshold_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricType: text('metric_type').notNull(),
  thresholdValue: doublePrecision('threshold_value').notNull(),
  comparison: text('comparison').notNull(),
  zone: text('zone'),
  ruleStatus: text('rule_status').notNull().default('active'),
  createdBy: uuid('created_by').references(() => accounts.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => thresholdRules.id),
  sensorId: text('sensor_id').notNull(),
  severity: integer('severity').notNull(),
  status: text('status').notNull().default('triggered'),
  triggeredValue: doublePrecision('triggered_value').notNull(),
  zone: text('zone').notNull(),
  metricType: text('metric_type').notNull(),
  acknowledgedBy: uuid('acknowledged_by').references(() => accounts.id),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: uuid('user_id').references(() => accounts.id),
  action: text('action').notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const alertSubscriptions = pgTable('alert_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => accounts.id)
    .notNull()
    .unique(),
  metricTypes: text('metric_types').array(),
  zones: text('zones').array(),
  minSeverity: integer('min_severity').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export const analytics = pgTable('analytics', {
  id: serial('id').primaryKey(),
  zone: text('zone').notNull(),
  metricType: text('metric_type').notNull(),
  aggregatedValue: doublePrecision('aggregated_value').notNull(),
  aggregationType: text('aggregation_type').notNull(),
  time: timestamp('time', { withTimezone: true }).notNull(),
})

export const platformStatus = pgTable('platform_status', {
  id: serial('id').primaryKey(),
  subsystem: text('subsystem').notNull(),
  status: text('status').notNull(),
  uptime: doublePrecision('uptime'),
  latencyMs: doublePrecision('latency_ms'),
  errorRate: doublePrecision('error_rate'),
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
})
