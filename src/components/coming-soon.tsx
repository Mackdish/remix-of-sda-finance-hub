import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
import { type ReactNode } from "react";

export function ComingSoon({ title, description, icon }: { title: string; description: string; icon?: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-gold/20 text-gold-foreground grid place-items-center">
            {icon ?? <Sparkles className="h-5 w-5" />}
          </div>
          <div className="font-semibold">Module coming next</div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The foundation, design system, roles and secure database are ready. This module is scheduled for the next
            phase — the data model already supports it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}