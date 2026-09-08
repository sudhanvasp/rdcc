import {
  LayoutDashboard,
  Lightbulb,
  FolderKanban,
  ListChecks,
  Users,
  Calendar,
  Boxes,
  Warehouse,
  FlaskConical,
  ClipboardCheck,
  Files,
  Sparkles,
  BarChart3,
  Settings,
  Plug,
  CreditCard,
  History,
} from "lucide-react";

export const PRIMARY_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/team", label: "Team", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/bom", label: "BOM", icon: Boxes },
  { href: "/inventory", label: "Inventory", icon: Warehouse },
  { href: "/experiments", label: "Experiments", icon: FlaskConical },
  { href: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { href: "/files", label: "Files", icon: Files },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/billing", label: "Billing", icon: CreditCard },
] as const;

export const SECONDARY_NAV = [
  { href: "/integrations", label: "Integrations", icon: Plug },
  { href: "/audit-log", label: "Audit Log", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

// Phase 1 + Phase 2 routes are fully wired; the rest are structured stubs.
export const PHASE_1_ROUTES = new Set([
  "/dashboard",
  "/ideas",
  "/projects",
  "/tasks",
  "/team",
  "/bom",
  "/inventory",
  "/experiments",
  "/checklists",
  "/calendar",
  "/reports",
  "/files",
  "/ai",
  "/billing",
  "/audit-log",
]);
