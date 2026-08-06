import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_KINDS, type PeriodKind } from "@/lib/periods";

export function PeriodPicker({
  kind, anchor, onKind, onAnchor, label,
}: {
  kind: PeriodKind;
  anchor: string;
  onKind: (k: PeriodKind) => void;
  onAnchor: (d: string) => void;
  label?: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3 no-print">
      <div>
        <Label>Report period</Label>
        <Select value={kind} onValueChange={(v) => onKind(v as PeriodKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_KINDS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Within date</Label>
        <Input type="date" value={anchor} onChange={(e) => onAnchor(e.target.value)} />
      </div>
      {label && (
        <div className="flex flex-col justify-end">
          <Label>Covering</Label>
          <div className="h-9 flex items-center text-sm font-medium">{label}</div>
        </div>
      )}
    </div>
  );
}
