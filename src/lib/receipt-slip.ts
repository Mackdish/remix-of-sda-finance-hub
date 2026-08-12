/** Renders an official SDA offering receipt slip that mirrors the printed booklet. */
export type ReceiptSlip = {
  receiptNumber: string;
  transactionDate: string;
  memberName: string;
  category: string;
  fund: string;
  amount: number;
  paymentMethod: string;
  description: string | null;
  churchName: string;
  fieldName: string | null;
  address: string | null;
  treasurerName: string | null;
};

const LEFT_ROWS = ["Tithe 10%", "", "", "Combined Offering 10%++", "", "Camp Meeting Offerings"];
const RIGHT_ROWS = ["", "", "Building Fund", "", "", ""];

function money(n: number) {
  const shs = Math.floor(n);
  const cts = Math.round((n - shs) * 100);
  return { shs: shs.toLocaleString("en-KE"), cts: String(cts).padStart(2, "0") };
}

function esc(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
}

/** Best-effort mapping of the receipt category onto one of the printed rows. */
function matchRow(rows: string[], category: string) {
  const c = category.toLowerCase();
  return rows.findIndex((r) => {
    if (!r) return false;
    const k = r.toLowerCase().split(" ")[0]!;
    return c.includes(k);
  });
}

export function receiptSlipHtml(r: ReceiptSlip): string {
  const { shs, cts } = money(r.amount);
  const leftIdx = matchRow(LEFT_ROWS, r.category);
  const rightIdx = leftIdx === -1 ? matchRow(RIGHT_ROWS, r.category) : -1;
  const writeIn = leftIdx === -1 && rightIdx === -1;

  const cell = (label: string, filled: boolean, editable: boolean) => `
    <tr>
      <td class="label">${editable && filled ? esc(r.category) : esc(label)}</td>
      <td class="num">${filled ? shs : ""}</td>
      <td class="num sm">${filled ? cts : ""}</td>
    </tr>`;

  const leftBody = LEFT_ROWS.map((l, i) => cell(l, i === leftIdx, false)).join("");
  const rightBody = RIGHT_ROWS.map((l, i) =>
    cell(writeIn && i === 1 ? r.category : l, i === rightIdx || (writeIn && i === 1), true),
  ).join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <title>Receipt ${esc(r.receiptNumber)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:14mm}
    .slip{border:1px solid #000;padding:10px;max-width:640px;margin:0 auto}
    .hd{text-align:center;font-weight:700;line-height:1.25}
    .hd .l1{font-size:15px;letter-spacing:.5px}
    .hd .l2{font-size:14px}
    .hd .l3{font-size:12px;font-weight:600}
    .no{position:relative;display:flex;justify-content:space-between;align-items:flex-end;margin-top:2px}
    .no .num{color:#c00;font-size:22px;font-weight:700;letter-spacing:2px}
    .name{margin:8px 0 6px;font-size:13px;font-weight:700}
    .name span{font-weight:400;border-bottom:1px dotted #000;display:inline-block;min-width:60%;padding-left:6px}
    .cols{display:flex;gap:10px}
    .cols table{width:100%;border-collapse:collapse}
    td{border:1px solid #000;height:22px;font-size:11px;padding:1px 4px}
    td.label{border-left:none;border-top:none;border-right:1px solid #000;font-weight:700;width:52%}
    td.num{width:34%}
    td.num.sm{width:14%}
    .capt{display:flex;justify-content:flex-end;gap:26px;font-size:11px;font-weight:700;padding-right:8px}
    .total td{font-weight:700;font-size:12px}
    .foot{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:11px;font-weight:700}
    .foot span{font-weight:400;border-bottom:1px dotted #000;display:inline-block;min-width:110px;padding-left:4px}
    .meta{margin-top:8px;font-size:10px;color:#444}
    @page{size:A5 landscape;margin:8mm}
  </style></head><body>
  <div class="slip">
    <div class="hd">
      <div class="l1">SEVENTH-DAY ADVENTIST CHURCH</div>
      <div class="l2">${esc(r.fieldName ?? r.churchName)}</div>
      ${r.address ? `<div class="l3">${esc(r.address)}</div>` : ""}
    </div>
    <div class="no"><div style="font-size:12px;font-weight:700">No.</div><div class="num">${esc(r.receiptNumber)}</div></div>
    <div class="name">NAME <span>${esc(r.memberName || "")}</span></div>
    <div class="capt"><div>Shs.</div><div>Cts.</div></div>
    <div class="cols">
      <table><tbody>${leftBody}</tbody></table>
      <table><tbody>${rightBody}
        <tr class="total"><td class="label">TOTAL</td><td class="num">${shs}</td><td class="num sm">${cts}</td></tr>
      </tbody></table>
    </div>
    <div class="foot">
      <div>Church/Kikundi <span>${esc(r.churchName)}</span></div>
      <div>Treasurer <span>${esc(r.treasurerName ?? "")}</span></div>
      <div>Date <span>${esc(r.transactionDate)}</span></div>
    </div>
    <div class="meta">Fund: ${esc(r.fund)} &middot; Payment: ${esc(r.paymentMethod.replace("_", " "))}${r.description ? ` &middot; ${esc(r.description)}` : ""}</div>
  </div>
  </body></html>`;
}
