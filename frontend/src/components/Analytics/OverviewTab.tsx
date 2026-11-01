import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { TrendingUp, DollarSign, CheckCircle2, Activity, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getActiveRole } from "@/components/Common/RoleSwitcher"

export default function OverviewTab() {
  const [role, setRole] = useState(getActiveRole())

  useEffect(() => {
    setRole(getActiveRole())
  }, [])

  const { data: chartData, isLoading: chartsLoading, refetch: refetchCharts } = useQuery({
    queryKey: ["analyticsCharts", role],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/charts", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`,
          "X-User-Role": getActiveRole(),
        },
      })
      if (!res.ok) throw new Error("Failed to load charts")
      return res.json() as Promise<{ category_chart: string; region_chart: string; trend_chart: string }>
    },
  })

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ["analyticsMetrics", role],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/grid?page=1&page_size=5", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token") || ""}`,
          "X-User-Role": getActiveRole(),
        },
      })
      if (!res.ok) throw new Error("Failed to load metrics")
      const json = await res.json()
      return json.metrics
    },
  })

  return (
    <div className="flex flex-col gap-6">
      {/* Top Metrics Cards - Computed by Polars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Processed Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : `$${(metricsData?.total_volume || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Aggregated with Polars</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Transaction</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : `$${(metricsData?.avg_amount || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mean ticket value</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Dataset Transactions</CardTitle>
            <Activity className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : (metricsData?.total_records || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In-memory Polars dataset</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsLoading ? "..." : `${metricsData?.success_rate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Completed vs failed ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Plotly Visualizations Section */}
      <div className="flex items-center justify-between mt-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Interactive Visualizations</h2>
          <p className="text-sm text-muted-foreground">
            Rendered with Plotly Python backend on Polars DataFrames
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchCharts()}
          disabled={chartsLoading}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${chartsLoading ? "animate-spin" : ""}`} />
          Refresh Charts
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revenue by Category */}
        <Card className="overflow-hidden border-border/80 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue by Service Category</CardTitle>
            <CardDescription>Hover, pan, or zoom directly on the graph</CardDescription>
          </CardHeader>
          <CardContent className="p-2 min-h-[340px] flex items-center justify-center">
            {chartsLoading ? (
              <div className="text-muted-foreground text-sm animate-pulse">Rendering Polars Bar Chart...</div>
            ) : chartData?.category_chart ? (
              <iframe
                title="Category Revenue Chart"
                srcDoc={chartData.category_chart}
                className="w-full h-[320px] border-0"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No chart data</div>
            )}
          </CardContent>
        </Card>

        {/* Chart 2: Regional Distribution */}
        <Card className="overflow-hidden border-border/80 bg-card/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Regional Volume Share</CardTitle>
            <CardDescription>Interactive Plotly Donut Breakdown</CardDescription>
          </CardHeader>
          <CardContent className="p-2 min-h-[340px] flex items-center justify-center">
            {chartsLoading ? (
              <div className="text-muted-foreground text-sm animate-pulse">Rendering Polars Donut Chart...</div>
            ) : chartData?.region_chart ? (
              <iframe
                title="Regional Share Chart"
                srcDoc={chartData.region_chart}
                className="w-full h-[320px] border-0"
              />
            ) : (
              <div className="text-muted-foreground text-sm">No chart data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart 3: Timeline Area Chart */}
      <Card className="overflow-hidden border-border/80 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Transaction Timeline & Peak Load</CardTitle>
          <CardDescription>Time-series aggregation computed via Polars date grouping</CardDescription>
        </CardHeader>
        <CardContent className="p-2 min-h-[340px] flex items-center justify-center">
          {chartsLoading ? (
            <div className="text-muted-foreground text-sm animate-pulse">Rendering Polars Time Series...</div>
          ) : chartData?.trend_chart ? (
            <iframe
              title="Transaction Trend Chart"
              srcDoc={chartData.trend_chart}
              className="w-full h-[320px] border-0"
            />
          ) : (
            <div className="text-muted-foreground text-sm">No chart data</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
