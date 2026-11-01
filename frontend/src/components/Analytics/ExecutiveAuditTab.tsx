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
      <div className="flex flex-col items-center justify-center p-12 bg-destructive/5 border border-destructive/20 rounded-xl text-center">
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between bg-card/40 p-4 rounded-xl border border-border/80">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-5 w-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold">Executive Security & Compliance Audit Log</h3>
            <p className="text-xs text-muted-foreground">
              Internal audit trail tracking critical role mutations and system actions
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs gap-1">
          <CheckCircle className="h-3 w-3" /> Admin Verified
        </Badge>
      </div>

      <div className="rounded-xl border border-border/80 overflow-hidden bg-card/20 backdrop-blur">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs">Event ID</TableHead>
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Actor</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Target Entity</TableHead>
              <TableHead className="text-xs">IP Address</TableHead>
              <TableHead className="text-right text-xs">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-28 text-center text-muted-foreground">
                  Verifying role permissions and fetching audit log...
                </TableCell>
              </TableRow>
            ) : data?.length ? (
              data.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30">
                  <TableCell className="font-mono text-xs font-medium text-primary">{log.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.timestamp}</TableCell>
                  <TableCell className="text-xs font-medium">{log.actor}</TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {log.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-foreground">
                    {log.action}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{log.target}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.ip_address}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className={
                        log.status === "SUCCESS" || log.status === "APPROVED"
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-400 border-rose-500/30"
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
  )
}
