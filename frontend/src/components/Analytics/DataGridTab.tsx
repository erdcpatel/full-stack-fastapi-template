import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  RotateCcw,
} from "lucide-react"
import { Input } from "@/components/ui/input"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getActiveRole } from "@/components/Common/RoleSwitcher"
import type { AnalyticsGridResponse, AnalyticsRecord } from "./types"

export default function DataGridTab() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [region, setRegion] = useState("all")
  const [sortBy, setSortBy] = useState("timestamp")
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const activeRole = getActiveRole()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "analyticsGrid",
      activeRole,
      search,
      category,
      status,
      region,
      sortBy,
      sortDesc,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        sort_by: sortBy,
        sort_desc: sortDesc ? "true" : "false",
      })
      if (search) params.set("search", search)
      if (category !== "all") params.set("category", category)
      if (status !== "all") params.set("status", status)
      if (region !== "all") params.set("region", region)

      const res = await fetch(`/api/v1/analytics/grid?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          "X-User-Role": activeRole,
        },
      })
      if (!res.ok) throw new Error("Failed to load grid data")
      return res.json() as Promise<AnalyticsGridResponse>
    },
  })

  const resetFilters = () => {
    setSearch("")
    setCategory("all")
    setStatus("all")
    setRegion("all")
    setPage(1)
  }

  const toggleSort = (column: string) => {
    if (sortBy === column) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(column)
      setSortDesc(true)
    }
  }

  const exportCSV = () => {
    if (!data?.items?.length) return
    const headers = Object.keys(data.items[0]).join(",")
    const rows = data.items.map((row: AnalyticsRecord) => Object.values(row).join(",")).join("\n")
    const blob = new Blob([`${headers}\n${rows}`], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `polars_analytics_page_${page}.csv`
    a.click()
  }

  const getStatusBadge = (statusVal: string) => {
    switch (statusVal) {
      case "Completed":
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] py-0 px-2 font-medium">Completed</Badge>
      case "Processing":
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[11px] py-0 px-2 font-medium">Processing</Badge>
      case "Failed":
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 text-[11px] py-0 px-2 font-medium">Failed</Badge>
      case "Refunded":
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px] py-0 px-2 font-medium">Refunded</Badge>
      default:
        return <Badge variant="outline" className="text-[11px]">{statusVal}</Badge>
    }
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "Enterprise":
        return <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] py-0 px-1.5 font-mono">Enterprise</Badge>
      case "Growth":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 font-mono">Growth</Badge>
      default:
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-400 border-sky-500/30 text-[10px] py-0 px-1.5 font-mono">Startup</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card/40 p-3.5 rounded-xl border border-border/80 w-full">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Global Search Bar */}
          <div className="relative min-w-[240px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, client, category, cluster..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Category Filter */}
          <Select
            value={category}
            onValueChange={(val) => {
              setCategory(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {data?.facets?.categories.map((c) => (
                <SelectItem key={c.name} value={c.name}>
                  {c.name} ({c.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {data?.facets?.statuses.map((s) => (
                <SelectItem key={s.name} value={s.name}>
                  {s.name} ({s.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Region Filter */}
          <Select
            value={region}
            onValueChange={(val) => {
              setRegion(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {data?.facets?.regions.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name} ({r.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(search || category !== "all" || status !== "all" || region !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Polars Meta & Actions */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <Badge variant="outline" className="gap-1.5 py-1 px-2.5 font-mono text-[11px] bg-background/50 border-border">
            <Database className="h-3 w-3 text-cyan-400" />
            Polars Engine ({data?.total_count || 0} hits)
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            className="h-9 gap-1.5 text-xs"
            disabled={!data?.items?.length}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* High-Density Full-Width Data Table */}
      <div className="rounded-xl border border-border/80 overflow-hidden bg-card/20 backdrop-blur w-full">
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur z-10 border-b border-border/80">
              <TableRow className="hover:bg-transparent">
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold py-2.5 px-3 min-w-[100px]"
                  onClick={() => toggleSort("id")}
                >
                  <div className="flex items-center gap-1">
                    ID <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold py-2.5 px-3 min-w-[130px]"
                  onClick={() => toggleSort("timestamp")}
                >
                  <div className="flex items-center gap-1">
                    Timestamp <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-xs font-semibold py-2.5 px-3 min-w-[140px]"
                  onClick={() => toggleSort("customer")}
                >
                  <div className="flex items-center gap-1">
                    Client <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[90px]">Tier</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[120px]">Category</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[110px]">Channel</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[100px]">Cluster</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[95px]">Region</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[105px]">Status</TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right text-xs font-semibold py-2.5 px-3 min-w-[80px]"
                  onClick={() => toggleSort("fee")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Fee <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right text-xs font-semibold py-2.5 px-3 min-w-[95px]"
                  onClick={() => toggleSort("amount")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                  </div>
                </TableHead>
                <TableHead className="text-right text-xs font-semibold py-2.5 px-3 min-w-[85px]">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={12} className="h-40 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Querying Polars DataFrame across 12 data dimensions...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.items?.length ? (
                data.items.map((row: AnalyticsRecord) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors border-b border-border/40">
                    <TableCell className="font-mono text-xs font-medium text-primary py-2 px-3 whitespace-nowrap">
                      {row.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {row.timestamp}
                    </TableCell>
                    <TableCell className="text-xs font-medium py-2 px-3 whitespace-nowrap">
                      {row.customer}
                    </TableCell>
                    <TableCell className="py-2 px-3 whitespace-nowrap">
                      {getTierBadge(row.tier)}
                    </TableCell>
                    <TableCell className="text-xs py-2 px-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{row.category}</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {row.channel}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {row.cluster}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {row.region}
                    </TableCell>
                    <TableCell className="py-2 px-3 whitespace-nowrap">
                      {getStatusBadge(row.status)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      ${row.fee.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold text-emerald-400 py-2 px-3 whitespace-nowrap">
                      ${row.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {row.duration_ms}ms
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="h-36 text-center text-muted-foreground">
                    No matching records found in Polars dataset.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1 py-1">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              setPageSize(Number(val))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-2 font-mono">
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, data?.total_count || 0)} of {data?.total_count || 0} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono">
            Page {page} of {data?.total_pages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page <= 1 || isFetching}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setPage((p) => Math.min(p + 1, data?.total_pages || 1))}
            disabled={page >= (data?.total_pages || 1) || isFetching}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
