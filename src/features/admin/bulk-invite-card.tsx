import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { bulkInviteChurchUsers } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Role = "admin" | "pastor" | "elder" | "treasurer" | "auditor" | "member";
type Result = {
  email: string; fullName: string; role: string;
  password?: string; ok: boolean; error?: string;
};

const ROLES: Role[] = ["admin", "pastor", "elder", "treasurer", "auditor", "member"];

function parseRows(text: string, fallback: Role) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", email = "", role = ""] = line.split(",").map((p) => p.trim());
      const r = ROLES.includes(role.toLowerCase() as Role) ? (role.toLowerCase() as Role) : fallback;
      return { fullName: name, email, role: r };
    })
    .filter((r) => r.fullName.length >= 2 && r.email.includes("@"));
}

export function BulkInviteCard({ churchId }: { churchId: string }) {
  const qc = useQueryClient();
  const invite = useServerFn(bulkInviteChurchUsers);
  const [text, setText] = useState("");
  const [defaultRole, setDefaultRole] = useState<Role>("member");
  const [results, setResults] = useState<Result[]>([]);

  const rows = parseRows(text, defaultRole);

  const run = useMutation({
    mutationFn: async () => {
      if (rows.length === 0) throw new Error("Add at least one line: Full name, email, role");
      return invite({ data: { churchId, defaultRole, invites: rows } }) as Promise<Result[]>;
    },
    onSuccess: (res) => {
      setResults(res);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`${ok} of ${res.length} accounts created`);
      qc.invalidateQueries({ queryKey: ["church-accounts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Bulk invitation failed"),
  });

  function downloadCredentials() {
    const head = ["Full name", "Email", "Role", "Temporary password", "Status"];
    const body = results.map((r) => [r.fullName, r.email, r.role, r.password ?? "", r.ok ? "created" : r.error ?? "failed"]);
    const csv = [head, ...body].map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "invited-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Bulk user invitation</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <div>
            <Label>One person per line — Full name, email, role (role optional)</Label>
            <Textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Jane Mwikali, jane@example.com, member\nPeter Kioko, peter@example.com, elder"}
            />
          </div>
          <div>
            <Label>Default role</Label>
            <Select value={defaultRole} onValueChange={(v) => setDefaultRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">
              {rows.length} valid line{rows.length === 1 ? "" : "s"} detected.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? "Inviting…" : "Invite users"}
          </Button>
          {results.length > 0 && (
            <Button variant="secondary" onClick={downloadCredentials}>Download credentials CSV</Button>
          )}
        </div>

        {results.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Role</th><th className="py-2 pr-4">Temp password</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.email} className="border-t border-border">
                    <td className="py-1 pr-4">{r.fullName}</td>
                    <td className="py-1 pr-4">{r.email}</td>
                    <td className="py-1 pr-4 capitalize">{r.role}</td>
                    <td className="py-1 pr-4 font-mono text-xs">{r.password ?? "—"}</td>
                    <td className="py-1 pr-4">{r.ok ? "Created" : r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">
              Share each temporary password privately; ask users to change it after first sign-in.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
