export function printElement(elementId: string, title = "Print") {
  const el = document.getElementById(elementId);
  if (!el) return;
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((n) => n.outerHTML)
    .join("\n");
  w.document.write(`<!doctype html><html><head><title>${title}</title>${styles}
  <style>
    body{padding:24px;background:#fff;color:#111;font-family:system-ui,sans-serif}
    .no-print{display:none!important}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #d4d4d4;padding:6px 8px;text-align:left;font-size:12px}
    th{background:#f4f4f5}
    h1,h2,h3{margin:0 0 6px}
    @page{size:A4 landscape;margin:14mm}
  </style></head><body>${el.outerHTML}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); w.close(); }, 300);
}