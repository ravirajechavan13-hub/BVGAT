// ─────────────────────────────────────────────────────────────────────────────
// BVGAT Sagar Store — Google Sheets Data Layer
// - Data aapki Google Sheet me save hota hai (Inward / Outward / MainStock tabs)
// - Google Apps Script Web App URL app ke andar "📗 Sheet" button se set hota hai
// - Offline / no-URL mode: data phone ke localStorage me (demo mode)
// ─────────────────────────────────────────────────────────────────────────────

export type InwardEntry = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  docType: string;
  inwardNo: string;
  inwardDate: string;
  partyName: string;
  address: string;
  contactPerson: string;
  contactNumber: string;
  vehicleNo: string;
  docketNo: string;
  category: string;
  dispatchLocation: string;
  district: string;
  productId: number;
  productName: string;
  packingSize: string;
  cases: number;
  quantity: number;
};

export type OutwardEntry = Omit<InwardEntry, "inwardNo" | "inwardDate"> & {
  outwardNo: string;
  outwardDate: string;
};

export type StoreData = {
  inwards: InwardEntry[];
  outwards: OutwardEntry[];
  mainStock: Record<number, number>; // productId → direct stock
};

const LS_URL_KEY = "bvgat_script_url_v1";
const LS_DATA_KEY = "bvgat_store_data_v2";

// ── Script URL (App ke andar settings se set hota hai) ───────────────────────
export function getScriptUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LS_URL_KEY) || "";
  } catch {
    return "";
  }
}

export function setScriptUrl(url: string) {
  try {
    const u = url.trim().replace(/\/+$/, "");
    if (u) localStorage.setItem(LS_URL_KEY, u);
    else localStorage.removeItem(LS_URL_KEY);
  } catch {
    /* ignore */
  }
}

// ── Local (offline) cache ────────────────────────────────────────────────────
export function loadLocal(): StoreData {
  if (typeof window === "undefined")
    return { inwards: [], outwards: [], mainStock: {} };
  try {
    const raw = localStorage.getItem(LS_DATA_KEY);
    if (!raw) return { inwards: [], outwards: [], mainStock: {} };
    const d = JSON.parse(raw);
    return {
      inwards: d.inwards || [],
      outwards: d.outwards || [],
      mainStock: d.mainStock || {},
    };
  } catch {
    return { inwards: [], outwards: [], mainStock: {} };
  }
}

export function saveLocal(data: StoreData) {
  try {
    localStorage.setItem(LS_DATA_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// ── Sheet se data load (GET) ─────────────────────────────────────────────────
function normalizeNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function normalizeData(j: any): StoreData {
  const inwards: InwardEntry[] = (j.inwards || []).map((r: any) => ({
    id: normalizeNum(r.id),
    invoiceNo: r.invoiceNo || "",
    invoiceDate: r.invoiceDate || "",
    docType: r.docType || "Invoice",
    inwardNo: r.inwardNo || "",
    inwardDate: r.inwardDate || "",
    partyName: r.partyName || "",
    address: r.address || "",
    contactPerson: r.contactPerson || "",
    contactNumber: r.contactNumber || "",
    vehicleNo: r.vehicleNo || "",
    docketNo: r.docketNo || "",
    category: r.category || "Purchase",
    dispatchLocation: r.dispatchLocation || "",
    district: r.district || "",
    productId: normalizeNum(r.productId),
    productName: r.productName || "",
    packingSize: r.packingSize || "",
    cases: normalizeNum(r.cases),
    quantity: normalizeNum(r.quantity),
  }));

  const outwards: OutwardEntry[] = (j.outwards || []).map((r: any) => ({
    id: normalizeNum(r.id),
    invoiceNo: r.invoiceNo || "",
    invoiceDate: r.invoiceDate || "",
    docType: r.docType || "Invoice",
    outwardNo: r.outwardNo || "",
    outwardDate: r.outwardDate || "",
    partyName: r.partyName || "",
    address: r.address || "",
    contactPerson: r.contactPerson || "",
    contactNumber: r.contactNumber || "",
    vehicleNo: r.vehicleNo || "",
    docketNo: r.docketNo || "",
    category: r.category || "Sale",
    dispatchLocation: r.dispatchLocation || "",
    district: r.district || "",
    productId: normalizeNum(r.productId),
    productName: r.productName || "",
    packingSize: r.packingSize || "",
    cases: normalizeNum(r.cases),
    quantity: normalizeNum(r.quantity),
  }));

  const mainStock: Record<number, number> = {};
  for (const r of j.mainStock || []) {
    mainStock[normalizeNum(r.productId)] = normalizeNum(r.directStock);
  }

  return { inwards, outwards, mainStock };
}

export async function fetchFromSheet(url?: string): Promise<StoreData | null> {
  const u = url ?? getScriptUrl();
  if (!u) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${u}?action=load`, {
      method: "GET",
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || (j.error)) return null;
    return normalizeData(j);
  } catch {
    return null;
  }
}

// ── Sheet me push (POST — text/plain taaki CORS preflight na ho) ────────────
export async function pushOp(payload: object): Promise<{ ok: boolean; error?: string }> {
  const u = getScriptUrl();
  if (!u) return { ok: false, error: "Google Sheet connect nahi hai" };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(u, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    const j = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
    if (!res.ok || !j.ok) return { ok: false, error: j.error || "Sheet save failed" };
    return { ok: true };
  } catch {
    return { ok: false, error: "Internet / Script se connect nahi hua" };
  }
}

// ── Serial number: max existing + 1 (IN-0001 → IN-0002) ─────────────────────
export function nextSerial(entries: { inwardNo?: string; outwardNo?: string }[], prefix: "IN" | "OUT"): string {
  let max = 0;
  for (const e of entries) {
    const no = e.inwardNo || e.outwardNo || "";
    const m = String(no).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

// ── Test connection (Settings modal me) ──────────────────────────────────────
export async function testConnection(url: string): Promise<{ ok: boolean; msg: string }> {
  if (!url.trim()) return { ok: false, msg: "Pehle Web App URL paste karo" };
  const data = await fetchFromSheet(url.trim().replace(/\/+$/, ""));
  if (!data) return { ok: false, msg: "Connect nahi hua! Script deploy sahi hai ya nahi check karo" };
  return {
    ok: true,
    msg: `Connected! Sheet me abhi ${data.inwards.length} inward, ${data.outwards.length} outward entries hain`,
  };
}
