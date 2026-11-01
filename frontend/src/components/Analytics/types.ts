export type UserRole = "admin" | "analyst" | "viewer"

export interface AnalyticsRecord {
  id: string
  timestamp: string
  customer: string
  category: string
  region: string
  status: "Completed" | "Processing" | "Failed" | "Refunded" | string
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
  action: string
  target: string
  ip_address: string
  status: string
}
