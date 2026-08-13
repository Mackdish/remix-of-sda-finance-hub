import { Megaphone } from "lucide-react";
import { useCurrentChurch } from "@/lib/church";
import { useNotices, useSiteSettings } from "@/lib/settings";

/** Scrolling notice bar, controlled from the admin control panel. */
export function NoticeMarquee() {
  const { data: church } = useCurrentChurch();
  const { data: settings } = useSiteSettings(church?.id);
  const { data: notices = [] } = useNotices(church?.id, true);

  if (settings && !settings.marquee_enabled) return null;
  if (notices.length === 0) return null;

  const speed = Math.max(10, Math.min(180, settings?.marquee_speed ?? 40));
  const items = notices.map((n) => `${n.title}: ${n.message}`);

  return (
    <div className="no-print flex items-stretch border-b border-border bg-primary text-primary-foreground">
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold shrink-0 bg-primary/90">
        <Megaphone className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Notices</span>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="marquee-track py-1.5 text-xs" style={{ animationDuration: `${speed}s` }}>
          {[0, 1].map((copy) => (
            <span key={copy} className="flex" aria-hidden={copy === 1}>
              {items.map((text, i) => (
                <span key={`${copy}-${i}`} className="px-6">
                  {text}
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
