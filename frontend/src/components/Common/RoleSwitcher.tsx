import { Shield } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export function getActiveRole(): "admin" | "analyst" | "viewer" {
  const role = localStorage.getItem("demo_role")
  if (role === "analyst" || role === "viewer") {
    return role
  }
  return "admin"
}

export function RoleSwitcher() {
  const queryClient = useQueryClient()
  const [currentRole, setCurrentRole] = useState<string>("admin")

  useEffect(() => {
    setCurrentRole(getActiveRole())
  }, [])

  const handleRoleChange = (newRole: string) => {
    setCurrentRole(newRole)
    localStorage.setItem("demo_role", newRole)
    // Invalidate everything to trigger re-fetch with new role headers
    queryClient.invalidateQueries()
  }

  const roleColors: Record<string, string> = {
    admin: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    analyst: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    viewer: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  }

  return (
    <div className="flex items-center gap-2 bg-card/60 backdrop-blur border border-border/80 px-2.5 py-1 rounded-full text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground font-medium">
        <Shield className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Role:</span>
      </div>

      <Select value={currentRole} onValueChange={handleRoleChange}>
        <SelectTrigger className="h-6 border-0 bg-transparent px-1.5 text-xs font-semibold focus:ring-0 gap-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectItem value="admin">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={roleColors.admin}>
                👑 Admin
              </Badge>
              <span className="text-muted-foreground text-[11px]">(All Tabs & Audit)</span>
            </div>
          </SelectItem>
          <SelectItem value="analyst">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={roleColors.analyst}>
                📊 Analyst
              </Badge>
              <span className="text-muted-foreground text-[11px]">(Charts & Data Grid)</span>
            </div>
          </SelectItem>
          <SelectItem value="viewer">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={roleColors.viewer}>
                👁️ Viewer
              </Badge>
              <span className="text-muted-foreground text-[11px]">(Overview Only)</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
