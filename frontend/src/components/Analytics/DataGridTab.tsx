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
  const [pageSize, setPageSize] = useState(15)

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
        return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Completed</Badge>
      case "Processing":
        return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">Processing</Badge>
      case "Failed":
        return <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30">Failed</Badge>
      case "Refunded":
        return <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30">Refunded</Badge>
      default:
        return <Badge variant="outline">{statusVal}</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between bg-card/40 p-4 rounded-xl border border-border/80">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Global Search Bar */}
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ID, client, category..."
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
            <SelectTrigger className="w-[150px] h-9 text-xs">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {data?.facets?.categories?.map((c) => (
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
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {data?.facets?.statuses?.map((s) => (
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
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {data?.facets?.regions?.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {r.name} ({r.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset button */}
          {(search || category !== "all" || status !== "all" || region !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-2.5 text-xs text-muted-foreground gap-1"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Polars Speed Tag & Export */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <Badge variant="outline" className="text-[11px] gap-1 font-mono text-muted-foreground">
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

      {/* Data Table */}
      <div className="rounded-xl border border-border/80 overflow-hidden bg-card/20 backdrop-blur">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead
                className="cursor-pointer select-none text-xs"
                onClick={() => toggleSort("id")}
              >
                <div className="flex items-center gap-1.5">
                  ID <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs"
                onClick={() => toggleSort("timestamp")}
              >
                <div className="flex items-center gap-1.5">
                  Timestamp <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-xs"
                onClick={() => toggleSort("customer")}
              >
                <div className="flex items-center gap-1.5">
                  Client <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="text-xs">Category</TableHead>
              <TableHead className="text-xs">Region</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right text-xs"
                onClick={() => toggleSort("amount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Amount <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                </div>
              </TableHead>
              <TableHead className="text-right text-xs">Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Querying Polars DataFrame...
                  </div>
                </TableCell>
              </TableRow>
            ) : data?.items?.length ? (
              data.items.map((row: AnalyticsRecord) => (
                <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {row.id}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.timestamp}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {row.customer}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium">{row.category}</span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.region}
                  </TableCell>
                  <TableCell className="text-xs">
                    {getStatusBadge(row.status)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold">
                    ${row.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {row.duration_ms}ms
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  No matching records found in Polars dataset.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground px-1">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(val) => {
              setPageSize(Number(val))
              setPage(1)
            }}
          >
            <SelectTrigger className="h-8 w-16 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="15">15</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, data?.total_count || 0)} of {data?.total_count || 0}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span>
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
