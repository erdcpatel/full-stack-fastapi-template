import { useEffect, useRef, useState, useCallback } from "react"
import { tableFromIPC } from "apache-arrow"
import * as echarts from "echarts"
import {
  Zap,
  Network,
  Activity,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Binary,
  SlidersHorizontal,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getActiveRole } from "@/components/Common/RoleSwitcher"

interface ArrowStats {
  payloadSizeBytes: number
  fetchTimeMs: number
  parseTimeMs: number
  pointCount: number
  totalCount: number
  page: number
  totalPages: number
}

export default function EChartsTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(2000)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<ArrowStats | null>(null)

  const streamChartRef = useRef<HTMLDivElement>(null)
  const resourceChartRef = useRef<HTMLDivElement>(null)
  const streamChartInstance = useRef<echarts.ECharts | null>(null)
  const resourceChartInstance = useRef<echarts.ECharts | null>(null)

  const activeRole = getActiveRole()

  const loadArrowData = useCallback(async () => {
    setLoading(true)
    const t0 = performance.now()

    try {
      const res = await fetch(
        `/api/v1/analytics/arrow-metrics?page=${page}&page_size=${pageSize}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
            "X-User-Role": activeRole,
          },
        }
      )

      if (!res.ok) throw new Error("Failed to load Arrow IPC metrics")

      const totalCount = Number(res.headers.get("X-Total-Count") || "20000")
      const totalPages = Number(res.headers.get("X-Total-Pages") || "10")

      const buffer = await res.arrayBuffer()
      const tFetch = performance.now()

      // Zero-copy binary parse with apache-arrow
      const table = tableFromIPC(buffer)
      const tParse = performance.now()

      const timestamps = Array.from(table.getChild("timestamp")!.toArray()) as string[]
      const cpuUsage = Array.from(table.getChild("cpu_usage")!.toArray()) as number[]
      const memoryMb = Array.from(table.getChild("memory_mb")!.toArray()) as number[]
      const networkMbps = Array.from(table.getChild("network_mbps")!.toArray()) as number[]
      const rps = Array.from(table.getChild("requests_per_sec")!.toArray()) as number[]
      const latency = Array.from(table.getChild("latency_p99")!.toArray()) as number[]

      setStats({
        payloadSizeBytes: buffer.byteLength,
        fetchTimeMs: Math.round(tFetch - t0),
        parseTimeMs: Math.round((tParse - tFetch) * 10) / 10,
        pointCount: table.numRows,
        totalCount,
        page,
        totalPages,
      })

      // Render Chart 1: High-Frequency Stream
      if (streamChartRef.current) {
        if (!streamChartInstance.current) {
          streamChartInstance.current = echarts.init(streamChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option1: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: `High-Frequency Telemetry Stream (${table.numRows.toLocaleString()} Points)`,
            subtext: "Native Apache Arrow IPC zero-copy deserialization • Canvas 60 FPS",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 13, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 11 },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross", label: { backgroundColor: "#334155" } },
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          legend: {
            data: ["Requests/sec", "Network (MB/s)", "CPU Usage (%)", "Latency P99 (ms)"],
            top: 10,
            right: 10,
            textStyle: { color: "#cbd5e1", fontSize: 11 },
          },
          grid: { left: 55, right: 55, top: 75, bottom: 65 },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: timestamps,
            axisLine: { lineStyle: { color: "#334155" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: [
            {
              type: "value",
              name: "Throughput (RPS / MB/s)",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.4)" } },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
            {
              type: "value",
              name: "CPU % / Latency (ms)",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { show: false },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
          ],
          dataZoom: [
            {
              type: "inside",
              start: 0,
              end: 100,
            },
            {
              type: "slider",
              start: 0,
              end: 100,
              height: 22,
              bottom: 12,
              borderColor: "#334155",
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              fillerColor: "rgba(6, 182, 212, 0.2)",
              handleStyle: { color: "#06b6d4" },
              textStyle: { color: "#94a3b8", fontSize: 10 },
            },
          ],
          series: [
            {
              name: "Requests/sec",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: rps,
              lineStyle: { color: "#06b6d4", width: 1.5 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(6, 182, 212, 0.35)" },
                  { offset: 1, color: "rgba(6, 182, 212, 0.0)" },
                ]),
              },
            },
            {
              name: "Network (MB/s)",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: networkMbps,
              lineStyle: { color: "#8b5cf6", width: 1.5 },
            },
            {
              name: "CPU Usage (%)",
              type: "line",
              yAxisIndex: 1,
              smooth: true,
              showSymbol: false,
              data: cpuUsage,
              lineStyle: { color: "#f59e0b", width: 1.5 },
            },
            {
              name: "Latency P99 (ms)",
              type: "line",
              yAxisIndex: 1,
              smooth: true,
              showSymbol: false,
              data: latency,
              lineStyle: { color: "#ef4444", width: 1.5 },
            },
          ],
        }

        streamChartInstance.current.setOption(option1, true)
      }

      // Render Chart 2: Resource Correlation
      if (resourceChartRef.current) {
        if (!resourceChartInstance.current) {
          resourceChartInstance.current = echarts.init(resourceChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option2: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "Memory Allocation & Workload Saturation",
            subtext: "Direct typed array feeding from Arrow RecordBatches",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 13, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 11 },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(15, 23, 42, 0.9)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          legend: {
            data: ["Memory (MB)", "CPU Usage (%)"],
            top: 10,
            right: 10,
            textStyle: { color: "#cbd5e1", fontSize: 11 },
          },
          grid: { left: 60, right: 50, top: 70, bottom: 35 },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: timestamps,
            axisLine: { lineStyle: { color: "#334155" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: [
            {
              type: "value",
              name: "Memory (MB)",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.4)" } },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
            {
              type: "value",
              name: "CPU %",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { show: false },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
          ],
          series: [
            {
              name: "Memory (MB)",
              type: "line",
              smooth: true,
              showSymbol: false,
              data: memoryMb,
              lineStyle: { color: "#10b981", width: 1.5 },
              areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "rgba(16, 185, 129, 0.25)" },
                  { offset: 1, color: "rgba(16, 185, 129, 0.0)" },
                ]),
              },
            },
            {
              name: "CPU Usage (%)",
              type: "line",
              yAxisIndex: 1,
              smooth: true,
              showSymbol: false,
              data: cpuUsage,
              lineStyle: { color: "#f59e0b", width: 1.2 },
            },
          ],
        }

        resourceChartInstance.current.setOption(option2, true)
      }
    } catch (err) {
      console.error("Error in Arrow IPC loading:", err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, activeRole])

  useEffect(() => {
    loadArrowData()
  }, [loadArrowData])

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      streamChartInstance.current?.resize()
      resourceChartInstance.current?.resize()
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      streamChartInstance.current?.dispose()
      resourceChartInstance.current?.dispose()
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* High-Throughput Arrow Banner */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-card/40 p-4 rounded-xl border border-border/80 gap-4 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Binary className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">
                Apache ECharts with Apache Arrow IPC
              </h2>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-mono">
                BINARY IPC STREAM
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Polars natively streams Feather / Arrow IPC bytes with zero JSON serialization overhead
            </p>
          </div>
        </div>

        {/* Telemetry Stats Pill */}
        <div className="flex flex-wrap items-center gap-2">
          {stats && (
            <>
              <Badge variant="outline" className="bg-background/60 border-border py-1 px-2.5 font-mono text-xs gap-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Parse: <span className="font-semibold text-foreground">{stats.parseTimeMs}ms</span>
              </Badge>
              <Badge variant="outline" className="bg-background/60 border-border py-1 px-2.5 font-mono text-xs gap-1.5">
                <Network className="h-3.5 w-3.5 text-cyan-400" />
                Payload: <span className="font-semibold text-foreground">{(stats.payloadSizeBytes / 1024).toFixed(1)} KB</span>
              </Badge>
              <Badge variant="outline" className="bg-background/60 border-border py-1 px-2.5 font-mono text-xs gap-1.5">
                <Activity className="h-3.5 w-3.5 text-emerald-400" />
                Viewport: <span className="font-semibold text-foreground">{stats.pointCount.toLocaleString()} pts</span>
              </Badge>
            </>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadArrowData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs ml-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh Stream
          </Button>
        </div>
      </div>

      {/* Main ECharts Graph 1 */}
      <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur w-full">
        <CardContent className="p-3">
          <div ref={streamChartRef} className="w-full h-[380px]" />
        </CardContent>
      </Card>

      {/* Second ECharts Graph 2 */}
      <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur w-full">
        <CardContent className="p-3">
          <div ref={resourceChartRef} className="w-full h-[260px]" />
        </CardContent>
      </Card>

      {/* Pagination & Stream Batch Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-card/30 p-3 rounded-xl border border-border/80 w-full">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span>Batch Window Size:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              setPageSize(Number(val))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">500 points</SelectItem>
              <SelectItem value="1000">1,000 points</SelectItem>
              <SelectItem value="2000">2,000 points</SelectItem>
              <SelectItem value="5000">5,000 points</SelectItem>
            </SelectContent>
          </Select>
          <span className="font-mono text-muted-foreground ml-2">
            Showing points {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, stats?.totalCount || 20000)} of{" "}
            {(stats?.totalCount || 20000).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono">
            Batch Window {page} of {stats?.totalPages || 10}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(p + 1, stats?.totalPages || 10))}
            disabled={page >= (stats?.totalPages || 10) || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
