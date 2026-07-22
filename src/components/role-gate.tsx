import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUserRoles, hasAnyRole, type AppRole } from "@/lib/access";

export function RoleGate({
  allow,
  children,
}: {
  allow: AppRole[];
  children: ReactNode;
}) {
  const { data: roles, isLoading } = useUserRoles();

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Checking access…</div>;
  }

  if (!roles || !hasAnyRole(roles, allow)) {
    return (
      <div className="grid place-items-center py-16">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full bg-destructive/10 text-destructive grid place-items-center">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">Access restricted</h2>
            <p className="text-sm text-muted-foreground">
              Your role doesn't grant access to this module. Contact an administrator if
              you believe this is a mistake.
            </p>
            <Button asChild variant="secondary" size="sm">
              <Link to="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}