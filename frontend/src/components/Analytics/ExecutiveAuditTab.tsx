import { useQuery } from "@tanstack/react-query"
import { ShieldAlert, Lock, CheckCircle } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getActiveRole } from "@/components/Common/RoleSwitcher"
import type { AuditRecord } from "./types"

export default function ExecutiveAuditTab() {
  const activeRole = getActiveRole()

  const { data, isLoading, isError } = useQuery({
    queryKey: ["executiveAudit", activeRole],
    queryFn: async () => {
      const res = await fetch("/api/v1/analytics/audit", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token") || ""}`,
          "X-User-Role": activeRole,
        },
      })
      if (!res.ok) {
        throw new Error("Unauthorized or Forbidden")
      }
      return res.json() as Promise<AuditRecord[]>
    },
    retry: false,
  })

  if (activeRole !== "admin" || isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-destructive/5 border border-destructive/20 rounded-xl text-center w-full">
        <div className="p-3 bg-destructive/10 rounded-full text-destructive mb-3">
          <Lock className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Access Restricted to Administrators</h3>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          You are currently in the <strong>{activeRole}</strong> role. This sensitive audit table is governed by the RBAC matrix and is only accessible by users with the <strong>admin</strong> role.
        </p>
        <div className="mt-4 text-xs font-mono bg-muted/60 px-3 py-1.5 rounded text-muted-foreground">
          HTTP 403 Forbidden - Role: {activeRole}
        </div>
      </div>
    )
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "CRITICAL":
        return <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/40 text-[10px] py-0 px-1.5 font-bold">CRITICAL</Badge>
      case "HIGH":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] py-0 px-1.5 font-bold">HIGH</Badge>
      case "MEDIUM":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/40 text-[10px] py-0 px-1.5 font-medium">MEDIUM</Badge>
      case "LOW":
        return <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/40 text-[10px] py-0 px-1.5 font-medium">LOW</Badge>
      default:
        return <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-muted-foreground">INFO</Badge>
    }
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Audit Banner Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card/40 p-4 rounded-xl border border-border/80 gap-3 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Executive Security & Compliance Audit Log</h3>
            <p className="text-xs text-muted-foreground">
              Immutable audit trail tracking critical role mutations, data exports, policy updates, and intrusion probes
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1.5 py-1 px-2.5">
            <CheckCircle className="h-3.5 w-3.5" /> Admin Verified
          </Badge>
          <Badge variant="outline" className="font-mono text-xs py-1 px-2 text-muted-foreground">
            {data?.length || 0} Events
          </Badge>
        </div>
      </div>

      {/* Full-Width High-Density Audit Table */}
      <div className="rounded-xl border border-border/80 overflow-hidden bg-card/20 backdrop-blur w-full">
        <div className="overflow-x-auto w-full">
          <Table className="w-full">
            <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur z-10 border-b border-border/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[95px]">Event ID</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[130px]">Timestamp</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[160px]">Actor</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[75px]">Role</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[90px]">Severity</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[170px]">Action</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[220px]">Target Entity</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[110px]">IP Address</TableHead>
                <TableHead className="text-xs font-semibold py-2.5 px-3 min-w-[170px]">Client / User Agent</TableHead>
                <TableHead className="text-right text-xs font-semibold py-2.5 px-3 min-w-[75px]">Latency</TableHead>
                <TableHead className="text-right text-xs font-semibold py-2.5 px-3 min-w-[95px]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-36 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      Verifying role permissions and loading compliance audit trail...
                    </div>
                  </TableCell>
                </TableRow>
              ) : data?.length ? (
                data.map((log: AuditRecord) => (
                  <TableRow key={log.id} className="hover:bg-muted/30 transition-colors border-b border-border/40">
                    <TableCell className="font-mono text-xs font-medium text-primary py-2 px-3 whitespace-nowrap">
                      {log.id}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {log.timestamp}
                    </TableCell>
                    <TableCell className="text-xs font-medium py-2 px-3 whitespace-nowrap">
                      {log.actor}
                    </TableCell>
                    <TableCell className="py-2 px-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                        {log.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 px-3 whitespace-nowrap">
                      {getSeverityBadge(log.severity)}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-medium text-foreground py-2 px-3 whitespace-nowrap">
                      {log.action}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {log.target}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {log.ip_address}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {log.user_agent}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs text-muted-foreground py-2 px-3 whitespace-nowrap">
                      {log.latency_ms}ms
                    </TableCell>
                    <TableCell className="text-right py-2 px-3 whitespace-nowrap">
                      <Badge
                        className={
                          log.status === "SUCCESS" || log.status === "APPROVED"
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[11px] py-0 px-2 font-medium"
                            : "bg-rose-500/15 text-rose-400 border-rose-500/30 text-[11px] py-0 px-2 font-medium"
                        }
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
