import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { createChurchUser, listChurchUsers } from "@/lib/users.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Role = "admin" | "pastor" | "elder" | "treasurer" | "auditor" | "member";

const ROLE_HELP: Record<Role, string> = {
  admin: "Full access, including this administration page.",
  treasurer: "Full rights across every module.",
  elder: "Full rights across every module.",
  pastor: "Can view and download all reports and statements (read-only).",
  auditor: "Read-only access to reports and the audit trail.",
  member: "Can only view their own contributions and download their receipts.",
};

export function UserAccountsCard({ churchId }: { churchId: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createChurchUser);
  const list = useServerFn(listChurchUsers);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("treasurer");
  const [memberId, setMemberId] = useState<string>("none");

  const { data: accounts = [] } = useQuery({
    queryKey: ["church-accounts", churchId],
    queryFn: () => list({ data: { churchId } }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["accounts-members", churchId],
    queryFn: async () => {
      const { data } = await supabase
        .from("church_members")
        .select("id,full_name,membership_number")
        .eq("church_id", churchId)
        .order("full_name");
      return data ?? [];
    },
  });

  const addUser = useMutation({
    mutationFn: async () =>
      create({
        data: {
          email: email.trim(),
          password,
          fullName: fullName.trim(),
          role,
          churchId,
          phone: phone.trim() || null,
          memberId: memberId === "none" ? null : memberId,
        },
      }),
    onSuccess: () => {
      toast.success("Account created");
      setFullName(""); setEmail(""); setPassword(""); setPhone(""); setMemberId("none");
      qc.invalidateQueries({ queryKey: ["church-accounts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not create the account"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">User accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Mwikali" />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 8 characters" />
          </div>
          <div>
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="pastor">Pastor</SelectItem>
                <SelectItem value="elder">Elder</SelectItem>
                <SelectItem value="treasurer">Treasurer</SelectItem>
                <SelectItem value="auditor">Auditor</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link to member record{role === "member" ? "" : " (optional)"}</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger><SelectValue placeholder="Not linked" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not linked</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}{m.membership_number ? ` · ${m.membership_number}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
        <Button onClick={() => addUser.mutate()} disabled={addUser.isPending}>
          {addUser.isPending ? "Creating…" : "Create account"}
        </Button>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr><th className="py-2 pr-4">Name</th><th className="py-2 pr-4">Email</th><th className="py-2 pr-4">Role</th></tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-1 pr-4">{a.fullName}</td>
                  <td className="py-1 pr-4">{a.email}</td>
                  <td className="py-1 pr-4 capitalize">{a.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}