import { createFileRoute } from "@tanstack/react-router";
import { RoleGate } from "@/components/role-gate";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

function AuditPage() {
  const { data: rows = [] } = useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as any[];
    },
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Trail" description="Recent system events, timestamped." />
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Table</th><th className="p-3">Record</th><th className="p-3">User</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No events yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-3">{r.action}</td>
                  <td className="p-3">{r.table_name ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.record_id ?? "—"}</td>
                  <td className="p-3 font-mono text-xs">{r.user_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit Trail — SDA Treasurer" }] }),
  component: () => (<RoleGate allow={["admin", "auditor"]}><AuditPage /></RoleGate>),
});