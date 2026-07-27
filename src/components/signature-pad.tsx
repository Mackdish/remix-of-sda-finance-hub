import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eraser } from "lucide-react";

export function SignaturePad({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#0a0a0a";
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = value;
      setEmpty(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current!.x, last.current!.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    const url = canvasRef.current!.toDataURL("image/png");
    setEmpty(false);
    onChange(url);
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Button type="button" size="sm" variant="ghost" onClick={clear} className="h-6 px-2 text-xs">
          <Eraser className="h-3 w-3 mr-1" /> Clear
        </Button>
      </div>
      <div className="relative rounded border border-border bg-background">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none"
          style={{ height: 90 }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
            Sign here
          </div>
        )}
      </div>
    </div>
  );
}