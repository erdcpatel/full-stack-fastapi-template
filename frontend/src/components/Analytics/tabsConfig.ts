import React from "react"
import OverviewTab from "./OverviewTab"
import DataGridTab from "./DataGridTab"
import EChartsTab from "./EChartsTab"
import ExecutiveAuditTab from "./ExecutiveAuditTab"
import type { UserRole } from "./types"

export interface TabConfig {
  id: string
  title: string
  badge?: string
  allowedRoles: UserRole[]
  component: React.ComponentType
}

export const ANALYTICS_TABS: TabConfig[] = [
  {
    id: "overview",
    title: "Analytics & Plotly Charts",
    badge: "All Roles",
    allowedRoles: ["admin", "analyst", "viewer"],
    component: OverviewTab,
  },
  {
    id: "echarts",
    title: "Apache ECharts & Arrow IPC",
    badge: "Binary Stream",
    allowedRoles: ["admin", "analyst"],
    component: EChartsTab,
  },
  {
    id: "grid",
    title: "Polars Data Grid & Filters",
    badge: "Admin & Analyst",
    allowedRoles: ["admin", "analyst"],
    component: DataGridTab,
  },
  {
    id: "audit",
    title: "Executive Audit Log",
    badge: "Admin Only",
    allowedRoles: ["admin"],
    component: ExecutiveAuditTab,
  },
]

export function getVisibleTabs(role: UserRole): TabConfig[] {
  return ANALYTICS_TABS.filter((tab) => tab.allowedRoles.includes(role))
}
