export type UserRole = "admin" | "analyst" | "viewer"

export interface AnalyticsRecord {
  id: string
  timestamp: string
  customer: string
  tier: string
  category: string
  channel: string
  cluster: string
  region: string
  status: "Completed" | "Processing" | "Failed" | "Refunded" | string
  fee: number
  amount: number
  duration_ms: number
}

export interface FacetCount {
  name: string
  count: number
}

export interface AnalyticsFacets {
  categories: FacetCount[]
  regions: FacetCount[]
  statuses: FacetCount[]
}

export interface AnalyticsMetrics {
  total_volume: number
  avg_amount: number
  total_records: number
  success_rate: number
}

export interface AnalyticsGridResponse {
  items: AnalyticsRecord[]
  total_count: number
  page: number
  total_pages: number
  facets: AnalyticsFacets
  metrics: AnalyticsMetrics
}

export interface AuditRecord {
  id: string
  timestamp: string
  actor: string
  role: string
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO" | string
  action: string
  target: string
  ip_address: string
  user_agent: string
  latency_ms: number
  checksum: string
  status: string
}
