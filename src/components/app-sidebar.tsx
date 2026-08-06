import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import sdaLogo from "@/assets/sda-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  Wallet,
  Coins,
  CalendarDays,
  FileText,
  Send,
  Landmark,
  Users,
  BarChart3,
  Building2,
  Settings2,
  ShieldCheck,
  LogOut,
  ChurchIcon,
  ClipboardCheck,
  Tent,
  Trophy,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useUserRoles, canAccess } from "@/lib/access";

const nav = {
  Overview: [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  ],
  Transactions: [
    { title: "Receipts", url: "/receipts", icon: Receipt },
    { title: "Expenses", url: "/expenses", icon: Wallet },
    { title: "Members", url: "/members", icon: Users },
    { title: "Departments", url: "/departments", icon: Layers },
  ],
  Funds: [
    { title: "Trust Funds", url: "/trust-funds", icon: Coins },
    { title: "Local Church Funds", url: "/local-funds", icon: Landmark },
    { title: "Camp Expense Fund", url: "/camp-funds", icon: Tent },
  ],
  Statements: [
    { title: "Cash Statement", url: "/cash-statement", icon: FileSpreadsheet },
    { title: "Weekly Report", url: "/weekly-report", icon: CalendarDays },
    { title: "Monthly Statement", url: "/monthly-statement", icon: FileText },
    { title: "Conference Remittance", url: "/remittance", icon: Send },
  ],
  Insights: [
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "Member Contributions", url: "/member-contributions", icon: Trophy },
  ],
  Administration: [
    { title: "Church Profile", url: "/church-profile", icon: Building2 },
    { title: "Approvals", url: "/approvals", icon: ClipboardCheck },
    { title: "Administration", url: "/admin", icon: Settings2 },
    { title: "Audit Trail", url: "/audit", icon: ShieldCheck },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const { data: roles } = useUserRoles();
  const userRoles = roles ?? [];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <img src={sdaLogo} alt="Seventh-day Adventist Church logo" className="h-9 w-9 shrink-0 object-contain" width={36} height={36} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate text-sidebar-foreground">SDA Treasurer</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Church cash flow</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {Object.entries(nav).map(([group, items]) => {
          const visible = items.filter((item) => canAccess(item.url, userRoles));
          if (visible.length === 0) return null;
          return (
          <SidebarGroup key={group}>
            {!collapsed && <SidebarGroupLabel>{group}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {visible.map((item) => {
                  const active = currentPath === item.url;
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          );
        })}
      </SidebarContent>
      <SidebarFooter>
        {!collapsed && email && (
          <div className="px-2 pb-1 text-[11px] text-sidebar-foreground/60 truncate">{email}</div>
        )}
        <Button
          onClick={signOut}
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}