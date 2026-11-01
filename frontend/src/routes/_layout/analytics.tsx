import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { getActiveRole } from "@/components/Common/RoleSwitcher"
import { getVisibleTabs } from "@/components/Analytics/tabsConfig"
import type { UserRole } from "@/components/Analytics/types"

export const Route = createFileRoute("/_layout/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      {
        title: "Analytics & Polars Grid - FastAPI Template",
      },
    ],
  }),
})

function AnalyticsPage() {
  const [activeRole, setActiveRole] = useState<UserRole>(getActiveRole())
  const [selectedTab, setSelectedTab] = useState<string>("overview")

  // Sync role when switched from header or localStorage
  useEffect(() => {
    const handleStorage = () => {
      const current = getActiveRole()
      setActiveRole(current)
    }
    window.addEventListener("storage", handleStorage)
    const interval = setInterval(handleStorage, 500)
    return () => {
      window.removeEventListener("storage", handleStorage)
      clearInterval(interval)
    }
  }, [])

  const visibleTabs = getVisibleTabs(activeRole)

  // If active tab was restricted after role switch, fall back to first visible tab
  useEffect(() => {
    const isStillVisible = visibleTabs.some((t) => t.id === selectedTab)
    if (!isStillVisible && visibleTabs.length > 0) {
      setSelectedTab(visibleTabs[0].id)
    }
  }, [visibleTabs, selectedTab])

  return (
    <div className="flex flex-col gap-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Data Engine</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Role-managed tabs powered by Polars 1.26 lazy queries & Plotly visualizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Current Active Role:</span>
          <Badge
            variant="outline"
            className={
              activeRole === "admin"
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : activeRole === "analyst"
                ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
            }
          >
            {activeRole.toUpperCase()} ({visibleTabs.length} tabs accessible)
          </Badge>
        </div>
      </div>

      {/* Dynamic Role-Managed Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 flex-wrap h-auto gap-1">
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="text-xs px-3.5 py-1.5 data-[state=active]:bg-background gap-2"
            >
              <span>{tab.title}</span>
              {tab.badge && (
                <span className="text-[10px] opacity-70 bg-muted px-1.5 py-0.5 rounded font-mono">
                  {tab.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => {
          const Component = tab.component
          return (
            <TabsContent key={tab.id} value={tab.id} className="outline-none focus:ring-0">
              <Component />
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
