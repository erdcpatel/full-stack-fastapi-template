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
  Code2,
  Radio,
  Copy,
  Check,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
  const [isLiveStreaming, setIsLiveStreaming] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [stats, setStats] = useState<ArrowStats | null>(null)

  // 7 Chart DOM refs
  const streamChartRef = useRef<HTMLDivElement>(null)
  const barLineChartRef = useRef<HTMLDivElement>(null)
  const stackedAreaChartRef = useRef<HTMLDivElement>(null)
  const heatmapChartRef = useRef<HTMLDivElement>(null)
  const radarChartRef = useRef<HTMLDivElement>(null)
  const candlestickChartRef = useRef<HTMLDivElement>(null)
  const gaugeChartRef = useRef<HTMLDivElement>(null)

  // 7 ECharts instances
  const streamInstance = useRef<echarts.ECharts | null>(null)
  const barLineInstance = useRef<echarts.ECharts | null>(null)
  const stackedAreaInstance = useRef<echarts.ECharts | null>(null)
  const heatmapInstance = useRef<echarts.ECharts | null>(null)
  const radarInstance = useRef<echarts.ECharts | null>(null)
  const candlestickInstance = useRef<echarts.ECharts | null>(null)
  const gaugeInstance = useRef<echarts.ECharts | null>(null)

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
      const cpuUsage = Array.from(table.getChild("cpu_usage")!.toArray()).map(Number)
      const memoryMb = Array.from(table.getChild("memory_mb")!.toArray()).map(Number)
      const networkMbps = Array.from(table.getChild("network_mbps")!.toArray()).map(Number)
      const rps = Array.from(table.getChild("requests_per_sec")!.toArray()).map(Number)
      const latency = Array.from(table.getChild("latency_p99")!.toArray()).map(Number)

      // Aggregates for summary gauges
      const avgCpu = Math.round(cpuUsage.reduce((a, b) => a + b, 0) / cpuUsage.length)
      const avgMemPct = Math.round(memoryMb.reduce((a, b) => a + b, 0) / memoryMb.length / 163.84)
      const avgLatency = (latency.reduce((a, b) => a + b, 0) / latency.length).toFixed(1)

      setStats({
        payloadSizeBytes: buffer.byteLength,
        fetchTimeMs: Math.round(tFetch - t0),
        parseTimeMs: Math.round((tParse - tFetch) * 10) / 10,
        pointCount: table.numRows,
        totalCount,
        page,
        totalPages,
      })

      // Downsampled buckets for hourly/aggregated charts
      const bucketCount = 12
      const step = Math.max(1, Math.floor(table.numRows / bucketCount))
      const bucketLabels: string[] = []
      const bucketRpsSum: number[] = []
      const bucketLatencyAvg: number[] = []
      const candleData: [number, number, number, number][] = [] // [open, close, lowest, highest]

      for (let i = 0; i < bucketCount; i++) {
        const sliceStart = i * step
        const sliceEnd = Math.min((i + 1) * step, table.numRows)
        const subTimestamps = timestamps.slice(sliceStart, sliceEnd)
        const subRps = rps.slice(sliceStart, sliceEnd)
        const subLat = latency.slice(sliceStart, sliceEnd)

        bucketLabels.push(subTimestamps[0]?.split(" ")[1] || `${i * 2}:00`)
        const totalR = subRps.reduce((a, b) => a + b, 0)
        bucketRpsSum.push(Math.round(totalR / subRps.length))

        const avgL = subLat.length ? subLat.reduce((a, b) => a + b, 0) / subLat.length : 20
        bucketLatencyAvg.push(Math.round(avgL * 10) / 10)

        const minL = subLat.length ? Math.min(...subLat) : 10
        const maxL = subLat.length ? Math.max(...subLat) : 40
        const openL = subLat[0] || minL
        const closeL = subLat[subLat.length - 1] || maxL
        candleData.push([openL, closeL, minL, maxL])
      }

      // ----------------------------------------------------
      // 1. Telemetry Stream Area/Line Chart with dataZoom
      // ----------------------------------------------------
      if (streamChartRef.current) {
        if (!streamInstance.current) {
          streamInstance.current = echarts.init(streamChartRef.current, "dark", {
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
          grid: { left: 55, right: 55, top: 70, bottom: 60 },
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
            { type: "inside", start: 0, end: 100 },
            {
              type: "slider",
              start: 0,
              end: 100,
              height: 20,
              bottom: 8,
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

        streamInstance.current.setOption(option1, true)
      }

      // ----------------------------------------------------
      // 2. Mixed Bar + Line Chart (Throughput Volume + Latency Curve)
      // ----------------------------------------------------
      if (barLineChartRef.current) {
        if (!barLineInstance.current) {
          barLineInstance.current = echarts.init(barLineChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option2: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "Mixed Bar + Line: Throughput vs P99 Latency",
            subtext: "Dual Y-Axis: Volume distribution with SLA latency trend",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          legend: {
            data: ["Request Volume (RPS)", "P99 Latency SLA (ms)"],
            top: 10,
            right: 10,
            textStyle: { color: "#cbd5e1", fontSize: 11 },
          },
          grid: { left: 50, right: 50, top: 65, bottom: 35 },
          xAxis: {
            type: "category",
            data: bucketLabels,
            axisLine: { lineStyle: { color: "#334155" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: [
            {
              type: "value",
              name: "Volume (RPS)",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.4)" } },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
            {
              type: "value",
              name: "Latency (ms)",
              nameTextStyle: { color: "#94a3b8", fontSize: 10 },
              splitLine: { show: false },
              axisLabel: { color: "#94a3b8", fontSize: 10 },
            },
          ],
          series: [
            {
              name: "Request Volume (RPS)",
              type: "bar",
              data: bucketRpsSum,
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: "#38bdf8" },
                  { offset: 1, color: "#0284c7" },
                ]),
                borderRadius: [4, 4, 0, 0],
              },
            },
            {
              name: "P99 Latency SLA (ms)",
              type: "line",
              yAxisIndex: 1,
              smooth: true,
              data: bucketLatencyAvg,
              lineStyle: { color: "#f59e0b", width: 2.5 },
              itemStyle: { color: "#f59e0b" },
              symbol: "circle",
              symbolSize: 6,
            },
          ],
        }

        barLineInstance.current.setOption(option2, true)
      }

      // ----------------------------------------------------
      // 3. Stacked Gradient Area Chart (Regional Cluster Load)
      // ----------------------------------------------------
      if (stackedAreaChartRef.current) {
        if (!stackedAreaInstance.current) {
          stackedAreaInstance.current = echarts.init(stackedAreaChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const regions = ["US-East", "US-West", "EU-Central", "AP-South", "AP-East"]
        const colors = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"]

        const regionalSeries = regions.map((reg, idx) => {
          const factor = 0.6 + idx * 0.15
          const dataPoints = bucketRpsSum.map((v, i) =>
            Math.round(v * (0.15 + (Math.sin(i + idx) + 1) * 0.08 * factor))
          )
          return {
            name: reg,
            type: "line" as const,
            stack: "Total",
            smooth: true,
            lineStyle: { width: 1.5, color: colors[idx] },
            showSymbol: false,
            areaStyle: {
              opacity: 0.7,
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: colors[idx] },
                { offset: 1, color: "rgba(15, 23, 42, 0.1)" },
              ]),
            },
            emphasis: { focus: "series" as const },
            data: dataPoints,
          }
        })

        const option3: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "Stacked Gradient Area: Multi-Region Workload",
            subtext: "Cumulative traffic distribution across 5 global clusters",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "cross", label: { backgroundColor: "#334155" } },
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          legend: {
            data: regions,
            top: 10,
            right: 10,
            textStyle: { color: "#cbd5e1", fontSize: 11 },
          },
          grid: { left: 50, right: 30, top: 65, bottom: 35 },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: bucketLabels,
            axisLine: { lineStyle: { color: "#334155" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.4)" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          series: regionalSeries,
        }

        stackedAreaInstance.current.setOption(option3, true)
      }

      // ----------------------------------------------------
      // 4. Node Latency Matrix (2D Heatmap)
      // ----------------------------------------------------
      if (heatmapChartRef.current) {
        if (!heatmapInstance.current) {
          heatmapInstance.current = echarts.init(heatmapChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const nodes = ["us-east-1a", "us-east-1b", "eu-central-1a", "ap-south-1a", "ap-south-1b"]
        const heatmapData: [number, number, number][] = []

        nodes.forEach((_, nIdx) => {
          bucketLabels.forEach((_, hIdx) => {
            const val = Math.round(
              15 + Math.sin((hIdx + nIdx) / 2) * 20 + ((hIdx * 7 + nIdx * 13) % 45)
            )
            heatmapData.push([hIdx, nIdx, val])
          })
        })

        const option4: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "2D Cluster Node Latency Heatmap",
            subtext: "Response latency matrix across regional clusters",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          tooltip: {
            position: "top",
            formatter: (params: any) => {
              const [h, n, v] = params.data
              return `<strong>${nodes[n]}</strong> @ ${bucketLabels[h]}<br/>Latency: <strong>${v} ms</strong>`
            },
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          grid: { left: 85, right: 20, top: 60, bottom: 45 },
          xAxis: {
            type: "category",
            data: bucketLabels,
            splitArea: { show: true },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: {
            type: "category",
            data: nodes,
            splitArea: { show: true },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          visualMap: {
            min: 10,
            max: 85,
            calculable: true,
            orient: "horizontal",
            left: "center",
            bottom: 5,
            inRange: {
              color: ["#0f172a", "#0284c7", "#38bdf8", "#f59e0b", "#ef4444"],
            },
            textStyle: { color: "#94a3b8", fontSize: 10 },
          },
          series: [
            {
              name: "Latency",
              type: "heatmap",
              data: heatmapData,
              label: { show: true, color: "#fff", fontSize: 9 },
              emphasis: {
                itemStyle: { shadowBlur: 10, shadowColor: "rgba(0, 0, 0, 0.5)" },
              },
            },
          ],
        }

        heatmapInstance.current.setOption(option4, true)
      }

      // ----------------------------------------------------
      // 5. System Reliability SLA Scorecard (Radar Chart)
      // ----------------------------------------------------
      if (radarChartRef.current) {
        if (!radarInstance.current) {
          radarInstance.current = echarts.init(radarChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option5: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "System Reliability SLA Radar",
            subtext: "Operational Health & Resilience Scorecard",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          tooltip: {
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          radar: {
            indicator: [
              { name: "Availability SLA", max: 100 },
              { name: "Throughput Headroom", max: 100 },
              { name: "Memory Efficiency", max: 100 },
              { name: "P99 SLA (<25ms)", max: 100 },
              { name: "Error Budget", max: 100 },
              { name: "Security Posture", max: 100 },
            ],
            shape: "polygon",
            radius: 65,
            center: ["50%", "58%"],
            axisName: { color: "#94a3b8", fontSize: 10 },
            splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.6)" } },
            splitArea: { show: false },
          },
          series: [
            {
              name: "SLA Health",
              type: "radar",
              data: [
                {
                  value: [99.8, 88.5, 92.0, 85.0, 94.2, 97.5],
                  name: "Current Window",
                  itemStyle: { color: "#06b6d4" },
                  areaStyle: { color: "rgba(6, 182, 212, 0.25)" },
                },
                {
                  value: [95.0, 75.0, 80.0, 78.0, 85.0, 90.0],
                  name: "Target Baseline",
                  itemStyle: { color: "#64748b" },
                  lineStyle: { type: "dashed" },
                },
              ],
            },
          ],
        }

        radarInstance.current.setOption(option5, true)
      }

      // ----------------------------------------------------
      // 6. Latency Envelope Candlestick / Volatility (K-Line)
      // ----------------------------------------------------
      if (candlestickChartRef.current) {
        if (!candlestickInstance.current) {
          candlestickInstance.current = echarts.init(candlestickChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option6: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "Latency Envelope (OHLC / Candlestick)",
            subtext: "Min, Max, P50 & P90 Latency Spreads",
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          tooltip: {
            trigger: "axis",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderColor: "#334155",
            textStyle: { color: "#f8fafc", fontSize: 11 },
          },
          grid: { left: 45, right: 20, top: 60, bottom: 35 },
          xAxis: {
            type: "category",
            data: bucketLabels,
            axisLine: { lineStyle: { color: "#334155" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          yAxis: {
            type: "value",
            splitLine: { lineStyle: { color: "rgba(51, 65, 85, 0.4)" } },
            axisLabel: { color: "#94a3b8", fontSize: 10 },
          },
          series: [
            {
              name: "Latency Spread (ms)",
              type: "candlestick",
              data: candleData,
              itemStyle: {
                color: "#10b981",
                color0: "#ef4444",
                borderColor: "#10b981",
                borderColor0: "#ef4444",
              },
            },
          ],
        }

        candlestickInstance.current.setOption(option6, true)
      }

      // ----------------------------------------------------
      // 7. Real-Time Gauge Speedometers
      // ----------------------------------------------------
      if (gaugeChartRef.current) {
        if (!gaugeInstance.current) {
          gaugeInstance.current = echarts.init(gaugeChartRef.current, "dark", {
            renderer: "canvas",
          })
        }

        const option7: echarts.EChartsOption = {
          backgroundColor: "transparent",
          title: {
            text: "Core Health & Uptime Gauges",
            subtext: `Avg Latency: ${avgLatency}ms • Real-time Saturation`,
            left: 10,
            top: 10,
            textStyle: { color: "#f8fafc", fontSize: 12, fontWeight: "bold" },
            subtextStyle: { color: "#94a3b8", fontSize: 10 },
          },
          series: [
            {
              type: "gauge",
              center: ["30%", "60%"],
              radius: "75%",
              min: 0,
              max: 100,
              progress: { show: true, width: 9 },
              pointer: { show: false },
              axisLine: { lineStyle: { width: 9, color: [[1, "rgba(51, 65, 85, 0.4)"]] } },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              anchor: { show: false },
              title: {
                show: true,
                offsetCenter: [0, "70%"],
                fontSize: 10,
                color: "#94a3b8",
              },
              detail: {
                valueAnimation: true,
                offsetCenter: [0, "0%"],
                fontSize: 18,
                fontWeight: "bolder",
                formatter: "{value}%",
                color: "#06b6d4",
              },
              data: [{ value: avgCpu, name: "CPU Load" }],
            },
            {
              type: "gauge",
              center: ["72%", "60%"],
              radius: "75%",
              min: 0,
              max: 100,
              progress: { show: true, width: 9 },
              pointer: { show: false },
              axisLine: { lineStyle: { width: 9, color: [[1, "rgba(51, 65, 85, 0.4)"]] } },
              axisTick: { show: false },
              splitLine: { show: false },
              axisLabel: { show: false },
              anchor: { show: false },
              title: {
                show: true,
                offsetCenter: [0, "70%"],
                fontSize: 10,
                color: "#94a3b8",
              },
              detail: {
                valueAnimation: true,
                offsetCenter: [0, "0%"],
                fontSize: 18,
                fontWeight: "bolder",
                formatter: "{value}%",
                color: "#10b981",
              },
              data: [{ value: avgMemPct, name: "Memory %" }],
            },
          ],
        }

        gaugeInstance.current.setOption(option7, true)
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

  // Live Auto-Streaming Simulation Mode
  useEffect(() => {
    if (!isLiveStreaming) return
    const interval = setInterval(() => {
      setPage((prev) => (prev >= 10 ? 1 : prev + 1))
    }, 2500)
    return () => clearInterval(interval)
  }, [isLiveStreaming])

  // Responsive window resize
  useEffect(() => {
    const handleResize = () => {
      streamInstance.current?.resize()
      barLineInstance.current?.resize()
      stackedAreaInstance.current?.resize()
      heatmapInstance.current?.resize()
      radarInstance.current?.resize()
      candlestickInstance.current?.resize()
      gaugeInstance.current?.resize()
    }
    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
      streamInstance.current?.dispose()
      barLineInstance.current?.dispose()
      stackedAreaInstance.current?.dispose()
      heatmapInstance.current?.dispose()
      radarInstance.current?.dispose()
      candlestickInstance.current?.dispose()
      gaugeInstance.current?.dispose()
    }
  }, [])

  const codeSnippet = `// ⚡ Consume Apache Arrow IPC stream from Polars backend in TypeScript:
import { tableFromIPC } from "apache-arrow";

const response = await fetch("/api/v1/analytics/arrow-metrics?page=1&page_size=2000", {
  headers: { "Authorization": "Bearer <TOKEN>" }
});

// Binary zero-copy deserialization:
const table = tableFromIPC(await response.arrayBuffer());

// Direct access to high-performance typed arrays (Float64Array / Int32Array):
const timestamps = table.getChild("timestamp")!.toArray();
const cpuUsage   = table.getChild("cpu_usage")!.toArray();
const latencyP99 = table.getChild("latency_p99")!.toArray();

// Feed directly into Apache ECharts series:
myChart.setOption({
  xAxis: { data: Array.from(timestamps) },
  series: [{ data: Array.from(cpuUsage) }]
});`

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Telemetry & Control Banner */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between bg-card/40 p-3.5 rounded-xl border border-border/80 gap-3 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
            <Binary className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight">
                Apache ECharts Operations Suite
              </h2>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-mono">
                7 DIVERSE VISUALIZATIONS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Line, Mixed Bar+Line, Stacked Area, Heatmap, Radar, Candlestick & Gauges via Polars Arrow IPC
            </p>
          </div>
        </div>

        {/* Telemetry Stats & Live Stream Controls */}
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

          {/* Live Stream Simulation Toggle */}
          <Button
            variant={isLiveStreaming ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`h-8 gap-1.5 text-xs ${isLiveStreaming ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse" : ""}`}
          >
            <Radio className="h-3.5 w-3.5" />
            {isLiveStreaming ? "Streaming Live" : "Live Stream"}
          </Button>

          {/* Developer Code Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Code2 className="h-3.5 w-3.5" />
                API Code
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-sm font-mono">
                  <Binary className="h-4 w-4 text-cyan-400" />
                  Apache Arrow IPC Client Consumption
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Zero-copy typed array extraction from FastAPI Polars endpoint
                </DialogDescription>
              </DialogHeader>
              <div className="relative mt-2">
                <pre className="bg-muted/70 p-3.5 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto max-h-[340px]">
                  {codeSnippet}
                </pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => {
                    navigator.clipboard.writeText(codeSnippet)
                    setCopiedCode(true)
                    setTimeout(() => setCopiedCode(false), 2000)
                  }}
                >
                  {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={loadArrowData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Row 1: High-Frequency Telemetry Stream (Hero Chart with dataZoom) */}
      <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur w-full">
        <CardContent className="p-3">
          <div ref={streamChartRef} className="w-full h-[320px]" />
        </CardContent>
      </Card>

      {/* Row 2: Mixed Bar+Line & Stacked Area (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {/* Chart 2: Mixed Bar + Line Dual Axis */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={barLineChartRef} className="w-full h-[270px]" />
          </CardContent>
        </Card>

        {/* Chart 3: Stacked Gradient Area */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={stackedAreaChartRef} className="w-full h-[270px]" />
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Heatmap + Radar + Candlestick + Gauges (4 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 w-full">
        {/* Chart 4: 2D Node Latency Heatmap */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={heatmapChartRef} className="w-full h-[250px]" />
          </CardContent>
        </Card>

        {/* Chart 5: Reliability SLA Radar */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={radarChartRef} className="w-full h-[250px]" />
          </CardContent>
        </Card>

        {/* Chart 6: Latency Envelope Candlestick */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={candlestickChartRef} className="w-full h-[250px]" />
          </CardContent>
        </Card>

        {/* Chart 7: Core Health & Uptime Gauges */}
        <Card className="overflow-hidden border-border/80 bg-card/30 backdrop-blur">
          <CardContent className="p-3">
            <div ref={gaugeChartRef} className="w-full h-[250px]" />
          </CardContent>
        </Card>
      </div>

      {/* Stream Window Pagination & Batch Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground bg-card/30 p-3 rounded-xl border border-border/80 w-full">
        <div className="flex items-center gap-3">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span>Batch Window:</span>
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
