"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { exportInwardExcel, exportOutwardExcel, exportStockExcel } from "@/lib/exportExcel";

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
  id: number;
  category: string;
  productName: string;
  packingSize: string;
  uom: string;
  directStock: number;
};

// Numeric value of a packing size for serial-wise sorting (chota → bada)
function sizeNum(s: string): number {
  const m = String(s).match(/[\d.]+/);
  return m ? parseFloat(m[0]) : Number.MAX_SAFE_INTEGER;
}

type InwardEntry = {
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

type OutwardEntry = Omit<InwardEntry, "inwardNo" | "inwardDate"> & {
  outwardNo: string;
  outwardDate: string;
};

type Tab = "inward" | "outward" | "stock";

type ItemRow = {
  key: string;
  productId: string;
  cases: string;
  quantity: string;
};

const INWARD_CATEGORIES = ["Purchase", "Free Sample", "Demo", "Stock Transfer", "Return"];
const OUTWARD_CATEGORIES = ["Sale", "Free Sample", "Demo", "Stock Transfer", "Return"];
const DOC_TYPES = ["Invoice", "DC"];

const today = () => new Date().toISOString().split("T")[0];

const blankInward = () => ({
  invoiceNo: "",
  invoiceDate: today(),
  docType: "Invoice",
  inwardNo: "",
  inwardDate: today(),
  partyName: "",
  address: "",
  contactPerson: "",
  contactNumber: "",
  vehicleNo: "",
  docketNo: "",
  category: "Purchase",
  dispatchLocation: "",
  district: "",
});

const blankOutward = () => ({
  invoiceNo: "",
  invoiceDate: today(),
  docType: "Invoice",
  outwardNo: "",
  outwardDate: today(),
  partyName: "",
  address: "",
  contactPerson: "",
  contactNumber: "",
  vehicleNo: "",
  docketNo: "",
  category: "Sale",
  dispatchLocation: "",
  district: "",
});

const newItemRow = (): ItemRow => ({
  key: `${Date.now()}-${Math.floor(Math.random() * 99999)}`,
  productId: "",
  cases: "",
  quantity: "",
});

// ─── Animated number counter ──────────────────────────────────────────────────
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const duration = 650;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

// ─── Small form controls ──────────────────────────────────────────────────────
function Input({
  label, value, onChange, type = "text", placeholder = "", className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-shadow"
      />
    </div>
  );
}

function Select({
  label, value, onChange, options, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <option value="">-- Select --</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Product selector for item rows ───────────────────────────────────────────
function ProductSelect({
  value, onChange, products, productCategories, accent,
}: {
  value: string; onChange: (v: string) => void; products: Product[];
  productCategories: Map<string, Product[]>; accent: "green" | "orange";
}) {
  const ring = accent === "green" ? "focus:ring-green-500" : "focus:ring-orange-500";
  const selected = products.find(p => String(p.id) === value);
  return (
    <div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 ${ring}`}
      >
        <option value="">— Select Product & Packing —</option>
        {Array.from(productCategories.entries()).map(([cat, prods]) => (
          <optgroup key={cat} label={`── ${cat} ──`}>
            {prods.map(p => (
              <option key={p.id} value={String(p.id)}>
                {p.productName} — {p.packingSize} {p.uom}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {selected && (
        <p className={`mt-1 text-[11px] font-semibold ${accent === "green" ? "text-green-700" : "text-slate-500"}`}>
          ✓ {selected.productName} | {selected.packingSize} {selected.uom}
        </p>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState<Tab>("stock");
  const [products, setProducts] = useState<Product[]>([]);
  const [inwards, setInwards] = useState<InwardEntry[]>([]);
  const [outwards, setOutwards] = useState<OutwardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Customer/particulars forms
  const [inForm, setInForm] = useState(blankInward());
  const [outForm, setOutForm] = useState(blankOutward());

  // Multi-product item rows
  const [inItems, setInItems] = useState<ItemRow[]>([newItemRow()]);
  const [outItems, setOutItems] = useState<ItemRow[]>([newItemRow()]);

  // Stock filters
  const [stockSearch, setStockSearch] = useState("");
  const [stockCat, setStockCat] = useState("All");

  // Monthly Excel report date range (default: is mahine ki 1 tarikh → aaj)
  const [repFrom, setRepFrom] = useState(() => `${new Date().toISOString().slice(0, 8)}01`);
  const [repTo, setRepTo] = useState(() => new Date().toISOString().split("T")[0]);

  // History filters
  const [inSearch, setInSearch] = useState("");
  const [inFilterProd, setInFilterProd] = useState("");
  const [outSearch, setOutSearch] = useState("");
  const [outFilterProd, setOutFilterProd] = useState("");

  const showToast = useCallback((type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/inventory");
      const d = await r.json();
      setProducts(d.products || []);
      setInwards(d.inwardEntries || []);
      setOutwards(d.outwardEntries || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stock map: productId → { totalIn, totalOut }
  const stockMap = useMemo(() => {
    const m = new Map<number, { totalIn: number; totalOut: number }>();
    for (const p of products) m.set(p.id, { totalIn: 0, totalOut: 0 });
    for (const i of inwards) {
      const cur = m.get(i.productId);
      if (cur) cur.totalIn += i.quantity;
    }
    for (const o of outwards) {
      const cur = m.get(o.productId);
      if (cur) cur.totalOut += o.quantity;
    }
    return m;
  }, [products, inwards, outwards]);

  const availableOf = useCallback(
    (productId: number) => {
      const s = stockMap.get(productId);
      const prod = products.find(p => p.id === productId);
      const direct = prod?.directStock || 0;
      return direct + (s ? s.totalIn - s.totalOut : 0);
    },
    [stockMap, products]
  );

  // ── Direct main stock (Boxes & Stickers) — seedha stock number daalo ──────
  const [directDraft, setDirectDraft] = useState<Record<number, string>>({});
  const [directSaving, setDirectSaving] = useState<number | null>(null);

  const saveDirectStock = useCallback(
    async (productId: number, val: number) => {
      setDirectSaving(productId);
      try {
        await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "SET_DIRECT_STOCK", payload: { productId, directStock: val } }),
        });
        setProducts(prev => prev.map(p => (p.id === productId ? { ...p, directStock: val } : p)));
        showToast("ok", `Main stock updated — ${val} set`);
      } catch {
        showToast("err", "Direct stock save failed");
      } finally {
        setDirectSaving(null);
      }
    },
    [showToast]
  );

  const commitDirectStock = useCallback(
    (productId: number) => {
      const prod = products.find(p => p.id === productId);
      const raw = directDraft[productId];
      if (raw === undefined) return;
      const val = Math.max(0, Math.floor(Number(raw)) || 0);
      if (prod && val !== (prod.directStock || 0)) saveDirectStock(productId, val);
      setDirectDraft(prev => {
        const n = { ...prev };
        delete n[productId];
        return n;
      });
    },
    [directDraft, products, saveDirectStock]
  );

  // Product categories grouped
  const productCategories = useMemo(() => {
    const cats = new Map<string, Product[]>();
    for (const p of products) {
      if (!cats.has(p.category)) cats.set(p.category, []);
      cats.get(p.category)!.push(p);
    }
    // Serial-wise: choti size pehle, badi size baad me
    for (const [k, list] of cats) {
      list.sort((a, b) => {
        const diff = sizeNum(a.packingSize) - sizeNum(b.packingSize);
        if (diff !== 0) return diff;
        return a.packingSize.localeCompare(b.packingSize);
      });
      cats.set(k, list);
    }
    return cats;
  }, [products]);

  const productOptions = useMemo(
    () => products.map(p => ({ value: String(p.id), label: `${p.productName} — ${p.packingSize} (${p.uom})` })),
    [products]
  );

  // ── Item row helpers ────────────────────────────────────────────────────────
  const addInRow = () => setInItems(prev => [...prev, newItemRow()]);
  const removeInRow = (key: string) =>
    setInItems(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));
  const updateInRow = (key: string, patch: Partial<ItemRow>) =>
    setInItems(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const addOutRow = () => setOutItems(prev => [...prev, newItemRow()]);
  const removeOutRow = (key: string) =>
    setOutItems(prev => (prev.length > 1 ? prev.filter(r => r.key !== key) : prev));
  const updateOutRow = (key: string, patch: Partial<ItemRow>) =>
    setOutItems(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  // Entry totals for summary chips
  const inValidItems = inItems.filter(i => i.productId && Number(i.quantity) > 0);
  const outValidItems = outItems.filter(i => i.productId && Number(i.quantity) > 0);
  const inTotalQty = inValidItems.reduce((s, i) => s + Number(i.quantity), 0);
  const outTotalQty = outValidItems.reduce((s, i) => s + Number(i.quantity), 0);

  // ── Save Inward (multiple products, one customer) ──────────────────────────
  const saveInward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inValidItems.length === 0) {
      showToast("err", "Select at least 1 product and enter its quantity.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_INWARD",
          payload: { ...inForm, items: inItems },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("ok", `${data.inwardNo} saved — ${data.count} product${data.count > 1 ? "s" : ""}, stock +${data.totalQty}`);
      setInForm(blankInward());
      setInItems([newItemRow()]);
      await load();
    } catch (err: any) {
      showToast("err", err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Save Outward (multiple products, one customer) ─────────────────────────
  const saveOutward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (outValidItems.length === 0) {
      showToast("err", "Select at least 1 product and enter its quantity.");
      return;
    }
    // Client-side stock check for every line
    for (const i of outValidItems) {
      const pid = Number(i.productId);
      const avail = availableOf(pid);
      if (Number(i.quantity) > avail) {
        const prod = products.find(p => p.id === pid);
        showToast("err", `Insufficient Stock — ${prod?.productName ?? "Product"} (${prod?.packingSize ?? ""}): available ${avail}, requested ${i.quantity}`);
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "CREATE_OUTWARD",
          payload: { ...outForm, items: outItems },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      showToast("ok", `${data.outwardNo} issued — ${data.count} product${data.count > 1 ? "s" : ""}, stock −${data.totalQty}`);
      setOutForm(blankOutward());
      setOutItems([newItemRow()]);
      await load();
    } catch (err: any) {
      showToast("err", err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteInward = async (id: number) => {
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE_INWARD", payload: { id } }),
    });
    showToast("ok", "Inward line deleted, stock recalculated.");
    await load();
  };

  const deleteOutward = async (id: number) => {
    await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "DELETE_OUTWARD", payload: { id } }),
    });
    showToast("ok", "Outward line deleted, stock restored.");
    await load();
  };

  // ── Derived lists ───────────────────────────────────────────────────────────
  const stockRows = useMemo(() => {
    const catOrder = [
      "BVG Products",
      "Boxes",
      "Stickers",
      "Empty Bottles",
      "Raw Material",
      "Consumables - Empty Bags & Pouches",
    ];
    // Serial-wise sort: chota serial (choti size) se bada serial (badi size) tak
    const sorted = [...products].sort((a, b) => {
      const ai = catOrder.indexOf(a.category);
      const bi = catOrder.indexOf(b.category);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
      const diff = sizeNum(a.packingSize) - sizeNum(b.packingSize);
      if (diff !== 0) return diff;
      return a.packingSize.localeCompare(b.packingSize);
    });
    return sorted
      .filter(p => {
        const matchCat = stockCat === "All" || p.category === stockCat;
        const q = stockSearch.toLowerCase();
        const matchSearch = !q || p.productName.toLowerCase().includes(q) || p.packingSize.toLowerCase().includes(q);
        return matchCat && matchSearch;
      })
      .map(p => {
        const s = stockMap.get(p.id) || { totalIn: 0, totalOut: 0 };
        const direct = p.directStock || 0;
        return { ...p, totalIn: s.totalIn, totalOut: s.totalOut, available: direct + s.totalIn - s.totalOut };
      });
  }, [products, stockMap, stockCat, stockSearch]);

  const allCats = useMemo(
    () => ["All", ...Array.from(new Set(products.map(p => p.category)))],
    [products]
  );

  const filteredInwards = useMemo(
    () =>
      inwards
        .filter(i => {
          const matchProd = !inFilterProd || String(i.productId) === inFilterProd;
          const q = inSearch.toLowerCase();
          const matchSearch =
            !q ||
            i.partyName.toLowerCase().includes(q) ||
            i.inwardNo.toLowerCase().includes(q) ||
            i.invoiceNo.toLowerCase().includes(q) ||
            i.productName.toLowerCase().includes(q);
          return matchProd && matchSearch;
        })
        // Serial chote se bade order me (IN-0001 → IN-0002 → …)
        .sort((a, b) => a.inwardNo.localeCompare(b.inwardNo) || a.id - b.id),
    [inwards, inFilterProd, inSearch]
  );

  const filteredOutwards = useMemo(
    () =>
      outwards
        .filter(o => {
          const matchProd = !outFilterProd || String(o.productId) === outFilterProd;
          const q = outSearch.toLowerCase();
          const matchSearch =
            !q ||
            o.partyName.toLowerCase().includes(q) ||
            o.outwardNo.toLowerCase().includes(q) ||
            o.invoiceNo.toLowerCase().includes(q) ||
            o.productName.toLowerCase().includes(q);
          return matchProd && matchSearch;
        })
        // Serial chote se bade order me (OUT-0001 → OUT-0002 → …)
        .sort((a, b) => a.outwardNo.localeCompare(b.outwardNo) || a.id - b.id),
    [outwards, outFilterProd, outSearch]
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center anim-scale-in">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full anim-spin mx-auto mb-3" />
          <p className="text-slate-600 font-medium">Loading Inventory…</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 anim-toast flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-semibold border max-w-sm
            ${toast.type === "ok" ? "bg-green-50 text-green-800 border-green-300" : "bg-red-50 text-red-800 border-red-300"}`}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${toast.type === "ok" ? "bg-green-500" : "bg-red-500"}`} />
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="anim-fade-up">
            <h1 className="text-lg font-bold tracking-tight">BVG Inventory</h1>
            <p className="text-green-200 text-xs">BVGAT Sagar Complex Store</p>
          </div>
          <div className="flex gap-1 bg-green-800/50 rounded-xl p-1">
            {(["stock", "inward", "outward"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`btn-press px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-300
                  ${tab === t ? "bg-white text-green-800 shadow" : "text-green-100 hover:bg-green-600"}`}
              >
                {t === "stock" ? "All Stock" : t === "inward" ? "Inward Entry" : "Outward Entry"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* ALL STOCK VIEW                                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {tab === "stock" && (
          <div key="stock" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Products", value: products.length, color: "bg-blue-600" },
                { label: "Total Inward", value: inwards.reduce((s, i) => s + i.quantity, 0), color: "bg-green-600" },
                { label: "Total Outward", value: outwards.reduce((s, o) => s + o.quantity, 0), color: "bg-orange-500" },
                {
                  label: "Zero Stock Items",
                  value: products.filter(p => availableOf(p.id) <= 0).length,
                  color: "bg-red-600",
                },
              ].map((c, idx) => (
                <div
                  key={c.label}
                  className={`${c.color} text-white rounded-xl p-4 shadow-sm hover-lift anim-fade-up`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div className="text-2xl font-bold font-mono">
                    <CountUp value={c.value} />
                  </div>
                  <div className="text-xs opacity-80 mt-0.5">{c.label}</div>
                </div>
              ))}
            </div>

            {/* Monthly Excel Report — HR ko bhejne ke liye */}
            <div
              className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden anim-fade-up"
              style={{ animationDelay: "240ms" }}
            >
              <div className="bg-blue-700 px-5 py-2.5 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm">📊 Monthly Excel Report (HR / Office ko bhejne ke liye)</h3>
                  <p className="text-blue-200 text-[11px]">
                    Purani Excel format jaisi — date range chuno, file download karo, direct WhatsApp/Email me forward
                  </p>
                </div>
              </div>
              <div className="p-4 flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">From Date</label>
                  <input
                    type="date"
                    value={repFrom}
                    onChange={e => setRepFrom(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">To Date</label>
                  <input
                    type="date"
                    value={repTo}
                    onChange={e => setRepTo(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => {
                    const n = exportInwardExcel(inwards as any, products, repFrom, repTo);
                    showToast("ok", `Inward Report Excel downloaded (${n} lines)`);
                  }}
                  className="btn-press h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                >
                  ⬇ Inward Report (Excel)
                </button>
                <button
                  onClick={() => {
                    const n = exportOutwardExcel(outwards as any, products, repFrom, repTo);
                    showToast("ok", `Outward Report Excel downloaded (${n} lines)`);
                  }}
                  className="btn-press h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow"
                >
                  ⬇ Outward Report (Excel)
                </button>
                <button
                  onClick={() => {
                    const n = exportStockExcel(products, inwards, outwards, repFrom, repTo);
                    showToast("ok", `Stock Report Excel downloaded (${n} products)`);
                  }}
                  className="btn-press h-9 px-4 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-bold shadow"
                >
                  ⬇ Stock Report (Excel)
                </button>
              </div>
            </div>

            {/* Filters */}
            <div
              className="bg-white rounded-xl border border-slate-200 p-3 flex flex-wrap items-center gap-3 anim-fade-up"
              style={{ animationDelay: "280ms" }}
            >
              <input
                type="text"
                value={stockSearch}
                onChange={e => setStockSearch(e.target.value)}
                placeholder="Search product name / size…"
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex flex-wrap gap-1.5">
                {allCats.map(c => (
                  <button
                    key={c}
                    onClick={() => setStockCat(c)}
                    className={`btn-press px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300
                      ${stockCat === c ? "bg-green-700 text-white shadow" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct stock hint */}
            <div
              className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 font-medium anim-fade-up"
              style={{ animationDelay: "320ms" }}
            >
              <span className="font-bold">📝 Main Stock add karne ka tarika:</span> Kisi bhi product ki row me
              blue{" "}
              <span className="font-mono font-bold text-blue-700">Main Stock (Direct)</span> box me apna
              total stock number daalein (jaise 500) → <span className="font-bold">Enter dabao ya bahar click karo</span> →
              turant save, Available Stock = Main Stock + IN − OUT. Rows chote se bade serial (packing size) order me hain.
            </div>

            {/* Stock table */}
            <div
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden anim-fade-up"
              style={{ animationDelay: "350ms" }}
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-green-700 text-white text-xs uppercase tracking-wide">
                      <th className="px-3 py-3 text-left">Category</th>
                      <th className="px-3 py-3 text-left">Product Name</th>
                      <th className="px-3 py-3 text-center">Packing Size</th>
                      <th className="px-3 py-3 text-center">UOM</th>
                      <th className="px-3 py-3 text-center font-bold">Main Stock (Direct)</th>
                      <th className="px-3 py-3 text-center font-bold">Total IN ↑</th>
                      <th className="px-3 py-3 text-center font-bold">Total OUT ↓</th>
                      <th className="px-3 py-3 text-center font-bold">Available Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">No products found.</td>
                      </tr>
                    ) : (
                      (() => {
                        const rows: React.ReactNode[] = [];
                        let lastCat = "";
                        let lastProd = "";
                        let idx = 0;
                        for (const row of stockRows) {
                          const catChanged = row.category !== lastCat;
                          const prodChanged = row.productName !== lastProd;
                          if (catChanged) {
                            rows.push(
                              <tr key={`cat-${row.category}`} className="bg-yellow-400">
                                <td colSpan={8} className="px-4 py-1.5 text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                                  {row.category}
                                </td>
                              </tr>
                            );
                            lastCat = row.category;
                            lastProd = "";
                          }
                          idx++;
                          rows.push(
                            <tr
                              key={row.id}
                              className={`anim-row border-b border-slate-100 transition-colors
                                ${row.available <= 0 ? "bg-red-50 hover:bg-red-100" : row.available < 5 ? "bg-orange-50 hover:bg-orange-100" : "hover:bg-green-50"}`}
                              style={{ animationDelay: `${Math.min(idx, 25) * 18}ms` }}
                            >
                              <td className="px-3 py-2" />
                              <td className="px-3 py-2 font-semibold text-slate-800">
                                {prodChanged ? row.productName : <span className="text-slate-400 text-xs italic">↳</span>}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-green-800">{row.packingSize}</td>
                              <td className="px-3 py-2 text-center text-slate-500 text-xs">{row.uom}</td>
                              <td className="px-3 py-2 text-center">
                                <div className="inline-flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    value={directDraft[row.id] ?? String(row.directStock || 0)}
                                    onChange={e => setDirectDraft(prev => ({ ...prev, [row.id]: e.target.value }))}
                                    onBlur={() => commitDirectStock(row.id)}
                                    onKeyDown={e => {
                                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                    }}
                                    title="Seedha main stock daalo — Enter ya click karne par save"
                                    className={`w-20 h-7 px-2 text-center rounded-lg border font-mono font-bold text-sm bg-blue-50 border-blue-300 text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                                      ${directSaving === row.id ? "opacity-50" : ""}`}
                                  />
                                  {directSaving === row.id && (
                                    <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full anim-spin" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-green-700">
                                {row.totalIn > 0 ? `+${row.totalIn}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-orange-600">
                                {row.totalOut > 0 ? `-${row.totalOut}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-sm transition-colors
                                    ${row.available <= 0 ? "bg-red-100 text-red-700" : row.available < 5 ? "bg-orange-100 text-orange-700 anim-pulse" : "bg-green-100 text-green-800"}`}
                                >
                                  {row.available}
                                </span>
                              </td>
                            </tr>
                          );
                          lastProd = row.productName;
                        }
                        return rows;
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* INWARD ENTRY — ONE CUSTOMER, MULTIPLE PRODUCTS               */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {tab === "inward" && (
          <div key="inward" className="space-y-5">
            <form
              onSubmit={saveInward}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden anim-fade-up"
            >
              <div className="bg-green-700 px-5 py-3 text-white">
                <h2 className="font-bold text-base">New Inward Entry — One Customer, Multiple Products</h2>
                <p className="text-green-200 text-xs">Add as many products as needed · Stock increases for every product after saving</p>
              </div>

              <div className="p-5">
                {/* Invoice details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Invoice / DC No" value={inForm.invoiceNo} onChange={v => setInForm(p => ({ ...p, invoiceNo: v }))} />
                  <Input label="Invoice / DC Date" value={inForm.invoiceDate} onChange={v => setInForm(p => ({ ...p, invoiceDate: v }))} type="date" />
                  <Select label="Doc. Type" value={inForm.docType} onChange={v => setInForm(p => ({ ...p, docType: v }))} options={DOC_TYPES.map(d => ({ value: d, label: d }))} />
                  <Input label="Inward No" value={inForm.inwardNo} onChange={v => setInForm(p => ({ ...p, inwardNo: v }))} placeholder="Auto if blank" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Inward Date" value={inForm.inwardDate} onChange={v => setInForm(p => ({ ...p, inwardDate: v }))} type="date" />
                  <Input label="Name of Party" value={inForm.partyName} onChange={v => setInForm(p => ({ ...p, partyName: v }))} className="sm:col-span-2" />
                  <Input label="Address" value={inForm.address} onChange={v => setInForm(p => ({ ...p, address: v }))} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Contact Person" value={inForm.contactPerson} onChange={v => setInForm(p => ({ ...p, contactPerson: v }))} />
                  <Input label="Contact Number" value={inForm.contactNumber} onChange={v => setInForm(p => ({ ...p, contactNumber: v }))} type="tel" />
                  <Input label="Vehicle / Transporter" value={inForm.vehicleNo} onChange={v => setInForm(p => ({ ...p, vehicleNo: v }))} />
                  <Input label="Docket / LR No" value={inForm.docketNo} onChange={v => setInForm(p => ({ ...p, docketNo: v }))} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <Select label="Category" value={inForm.category} onChange={v => setInForm(p => ({ ...p, category: v }))} options={INWARD_CATEGORIES.map(c => ({ value: c, label: c }))} />
                  <Input label="Dispatch Location" value={inForm.dispatchLocation} onChange={v => setInForm(p => ({ ...p, dispatchLocation: v }))} />
                  <Input label="District" value={inForm.district} onChange={v => setInForm(p => ({ ...p, district: v }))} />
                  <div />
                </div>

                {/* ── Multi product rows ── */}
                <div className="border-2 border-dashed border-green-300 rounded-xl p-4 bg-green-50/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-green-900">
                      📦 Products in this Inward Entry
                      {inValidItems.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600 text-white text-xs anim-scale-in">
                          {inValidItems.length} product{inValidItems.length > 1 ? "s" : ""} · {inTotalQty} units
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addInRow}
                      className="btn-press px-3.5 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-bold shadow"
                    >
                      + Add Another Product
                    </button>
                  </div>

                  <div className="space-y-3">
                    {inItems.map((row, rowIdx) => {
                      const sel = products.find(p => String(p.id) === row.productId);
                      const avail = sel ? availableOf(sel.id) : null;
                      return (
                        <div
                          key={row.key}
                          className="anim-item-pop bg-white rounded-xl border border-slate-200 p-3 flex flex-col sm:flex-row sm:items-end gap-3 shadow-sm"
                          style={{ animationDelay: `${rowIdx * 40}ms` }}
                        >
                          <div className="flex-1">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                              Product {rowIdx + 1}
                              {sel && avail !== null && (
                                <span className="ml-2 normal-case font-mono text-green-700">current stock: {avail}</span>
                              )}
                            </label>
                            <ProductSelect
                              value={row.productId}
                              onChange={v => updateInRow(row.key, { productId: v })}
                              products={products}
                              productCategories={productCategories}
                              accent="green"
                            />
                          </div>
                          <div className="w-24">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Cases</label>
                            <input
                              type="number"
                              min="0"
                              value={row.cases}
                              onChange={e => updateInRow(row.key, { cases: e.target.value })}
                              placeholder="0"
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div className="w-28">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                              Qty <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e => updateInRow(row.key, { quantity: e.target.value })}
                              placeholder="Qty"
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeInRow(row.key)}
                            disabled={inItems.length === 1}
                            title="Remove product"
                            className={`btn-press h-10 px-3 rounded-lg font-bold text-sm transition
                              ${inItems.length === 1
                                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-press w-full sm:w-auto px-8 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold rounded-xl shadow transition text-sm"
                  >
                    {saving ? "Saving…" : `Save Inward Entry (+${inTotalQty || "stock"})`}
                  </button>
                </div>
              </div>
            </form>

            {/* Inward history */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden anim-fade-up" style={{ animationDelay: "150ms" }}>
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800">Inward History ({filteredInwards.length} lines)</h3>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={inSearch}
                    onChange={e => setInSearch(e.target.value)}
                    placeholder="Search party / inward no / product…"
                    className="h-8 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={inFilterProd}
                    onChange={e => setInFilterProd(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Products</option>
                    {productOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left whitespace-nowrap">Invoice/DC No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Invoice Date</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Doc Type</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Inward No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Inward Date</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Party Name</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Contact Person</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Contact No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Vehicle/LR</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Dispatch / District</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Product</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Packing</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Cases</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap font-bold text-green-700">Qty (+)</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInwards.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="px-4 py-6 text-center text-slate-400">No inward entries yet.</td>
                      </tr>
                    ) : (
                      filteredInwards.map((i, idx) => (
                        <tr
                          key={i.id}
                          className="anim-row border-b border-slate-100 hover:bg-green-50 transition-colors"
                          style={{ animationDelay: `${Math.min(idx, 20) * 22}ms` }}
                        >
                          <td className="px-3 py-2 font-mono">{i.invoiceNo}</td>
                          <td className="px-3 py-2 font-mono">{i.invoiceDate}</td>
                          <td className="px-3 py-2">{i.docType}</td>
                          <td className="px-3 py-2 font-mono font-bold text-green-700">{i.inwardNo}</td>
                          <td className="px-3 py-2 font-mono">{i.inwardDate}</td>
                          <td className="px-3 py-2 font-semibold">{i.partyName}</td>
                          <td className="px-3 py-2">{i.contactPerson}</td>
                          <td className="px-3 py-2 font-mono">{i.contactNumber}</td>
                          <td className="px-3 py-2">{i.vehicleNo}{i.docketNo ? ` / ${i.docketNo}` : ""}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">{i.category}</span>
                          </td>
                          <td className="px-3 py-2">{[i.dispatchLocation, i.district].filter(Boolean).join(", ")}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{i.productName}</td>
                          <td className="px-3 py-2 font-mono font-bold text-green-800">{i.packingSize}</td>
                          <td className="px-3 py-2 text-center font-mono">{i.cases}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-green-700 text-sm">+{i.quantity}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => deleteInward(i.id)}
                              className="btn-press text-red-500 hover:text-red-700 text-base leading-none font-bold"
                              title="Delete line"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* OUTWARD ENTRY — ONE CUSTOMER, MULTIPLE PRODUCTS              */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {tab === "outward" && (
          <div key="outward" className="space-y-5">
            <form
              onSubmit={saveOutward}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden anim-fade-up"
            >
              <div className="bg-orange-600 px-5 py-3 text-white">
                <h2 className="font-bold text-base">New Outward Entry — One Customer, Multiple Products</h2>
                <p className="text-orange-100 text-xs">Stock decreases for every product · Negative stock is blocked on all lines</p>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Invoice / DC No" value={outForm.invoiceNo} onChange={v => setOutForm(p => ({ ...p, invoiceNo: v }))} />
                  <Input label="Invoice / DC Date" value={outForm.invoiceDate} onChange={v => setOutForm(p => ({ ...p, invoiceDate: v }))} type="date" />
                  <Select label="Doc. Type" value={outForm.docType} onChange={v => setOutForm(p => ({ ...p, docType: v }))} options={DOC_TYPES.map(d => ({ value: d, label: d }))} />
                  <Input label="Outward No" value={outForm.outwardNo} onChange={v => setOutForm(p => ({ ...p, outwardNo: v }))} placeholder="Auto if blank" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Outward Date" value={outForm.outwardDate} onChange={v => setOutForm(p => ({ ...p, outwardDate: v }))} type="date" />
                  <Input label="Name of Party" value={outForm.partyName} onChange={v => setOutForm(p => ({ ...p, partyName: v }))} className="sm:col-span-2" />
                  <Input label="Address" value={outForm.address} onChange={v => setOutForm(p => ({ ...p, address: v }))} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <Input label="Contact Person" value={outForm.contactPerson} onChange={v => setOutForm(p => ({ ...p, contactPerson: v }))} />
                  <Input label="Contact Number" value={outForm.contactNumber} onChange={v => setOutForm(p => ({ ...p, contactNumber: v }))} type="tel" />
                  <Input label="Vehicle / Transporter" value={outForm.vehicleNo} onChange={v => setOutForm(p => ({ ...p, vehicleNo: v }))} />
                  <Input label="Docket / LR No" value={outForm.docketNo} onChange={v => setOutForm(p => ({ ...p, docketNo: v }))} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <Select label="Category" value={outForm.category} onChange={v => setOutForm(p => ({ ...p, category: v }))} options={OUTWARD_CATEGORIES.map(c => ({ value: c, label: c }))} />
                  <Input label="Dispatch Location" value={outForm.dispatchLocation} onChange={v => setOutForm(p => ({ ...p, dispatchLocation: v }))} />
                  <Input label="District" value={outForm.district} onChange={v => setOutForm(p => ({ ...p, district: v }))} />
                  <div />
                </div>

                {/* ── Multi product rows with live stock check ── */}
                <div className="border-2 border-dashed border-orange-300 rounded-xl p-4 bg-orange-50/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-bold text-orange-900">
                      🚚 Products to Issue
                      {outValidItems.length > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-600 text-white text-xs anim-scale-in">
                          {outValidItems.length} product{outValidItems.length > 1 ? "s" : ""} · {outTotalQty} units
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={addOutRow}
                      className="btn-press px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow"
                    >
                      + Add Another Product
                    </button>
                  </div>

                  <div className="space-y-3">
                    {outItems.map((row, rowIdx) => {
                      const sel = products.find(p => String(p.id) === row.productId);
                      const avail = sel ? availableOf(sel.id) : null;
                      const qty = Number(row.quantity) || 0;
                      const exceeds = sel !== null && avail !== null && row.quantity !== "" && qty > avail;
                      return (
                        <div
                          key={row.key}
                          className={`anim-item-pop rounded-xl border p-3 flex flex-col sm:flex-row sm:items-end gap-3 shadow-sm transition-colors duration-300
                            ${exceeds ? "bg-red-50 border-red-300" : "bg-white border-slate-200"}`}
                          style={{ animationDelay: `${rowIdx * 40}ms` }}
                        >
                          <div className="flex-1">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                              Product {rowIdx + 1}
                              {sel && avail !== null && (
                                <span className={`ml-2 normal-case font-mono ${avail <= 0 ? "text-red-600 font-bold" : "text-slate-500"}`}>
                                  available: {avail} {sel.uom}
                                </span>
                              )}
                            </label>
                            <ProductSelect
                              value={row.productId}
                              onChange={v => updateOutRow(row.key, { productId: v })}
                              products={products}
                              productCategories={productCategories}
                              accent="orange"
                            />
                            {exceeds && (
                              <p className="mt-1 text-xs font-bold text-red-600 anim-scale-in">
                                ⚠ Insufficient Stock Available! (max {avail})
                              </p>
                            )}
                          </div>
                          <div className="w-24">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Cases</label>
                            <input
                              type="number"
                              min="0"
                              value={row.cases}
                              onChange={e => updateOutRow(row.key, { cases: e.target.value })}
                              placeholder="0"
                              className="w-full h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                          <div className="w-28">
                            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                              Qty <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={row.quantity}
                              onChange={e => updateOutRow(row.key, { quantity: e.target.value })}
                              placeholder="Qty"
                              className={`w-full h-10 px-3 rounded-lg border text-sm font-mono font-bold focus:outline-none focus:ring-2 transition-colors
                                ${exceeds ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-slate-300 focus:ring-orange-500"}`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOutRow(row.key)}
                            disabled={outItems.length === 1}
                            title="Remove product"
                            className={`btn-press h-10 px-3 rounded-lg font-bold text-sm transition
                              ${outItems.length === 1
                                ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                                : "bg-red-50 text-red-600 hover:bg-red-100"}`}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5">
                  <button
                    type="submit"
                    disabled={saving || outValidItems.some(i => {
                      const sel = products.find(p => String(p.id) === i.productId);
                      const avail = sel ? availableOf(sel.id) : 0;
                      return Number(i.quantity) > avail;
                    })}
                    className="btn-press w-full sm:w-auto px-8 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow transition text-sm"
                  >
                    {saving ? "Saving…" : `Issue Stock (−${outTotalQty || "?"})`}
                  </button>
                </div>
              </div>
            </form>

            {/* Outward history */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden anim-fade-up" style={{ animationDelay: "150ms" }}>
              <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800">Outward History ({filteredOutwards.length} lines)</h3>
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="text"
                    value={outSearch}
                    onChange={e => setOutSearch(e.target.value)}
                    placeholder="Search party / outward no / product…"
                    className="h-8 px-3 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <select
                    value={outFilterProd}
                    onChange={e => setOutFilterProd(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">All Products</option>
                    {productOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600 uppercase tracking-wide">
                      <th className="px-3 py-2 text-left whitespace-nowrap">Invoice/DC No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Invoice Date</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Doc Type</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Outward No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Outward Date</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Party Name</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Contact Person</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Contact No</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Vehicle/LR</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Category</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Dispatch / District</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Product</th>
                      <th className="px-3 py-2 text-left whitespace-nowrap">Packing</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Cases</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap font-bold text-orange-700">Qty (−)</th>
                      <th className="px-3 py-2 text-center whitespace-nowrap">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOutwards.length === 0 ? (
                      <tr>
                        <td colSpan={16} className="px-4 py-6 text-center text-slate-400">No outward entries yet.</td>
                      </tr>
                    ) : (
                      filteredOutwards.map((o, idx) => (
                        <tr
                          key={o.id}
                          className="anim-row border-b border-slate-100 hover:bg-orange-50 transition-colors"
                          style={{ animationDelay: `${Math.min(idx, 20) * 22}ms` }}
                        >
                          <td className="px-3 py-2 font-mono">{o.invoiceNo}</td>
                          <td className="px-3 py-2 font-mono">{o.invoiceDate}</td>
                          <td className="px-3 py-2">{o.docType}</td>
                          <td className="px-3 py-2 font-mono font-bold text-orange-700">{o.outwardNo}</td>
                          <td className="px-3 py-2 font-mono">{o.outwardDate}</td>
                          <td className="px-3 py-2 font-semibold">{o.partyName}</td>
                          <td className="px-3 py-2">{o.contactPerson}</td>
                          <td className="px-3 py-2 font-mono">{o.contactNumber}</td>
                          <td className="px-3 py-2">{o.vehicleNo}{o.docketNo ? ` / ${o.docketNo}` : ""}</td>
                          <td className="px-3 py-2">
                            <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">{o.category}</span>
                          </td>
                          <td className="px-3 py-2">{[o.dispatchLocation, o.district].filter(Boolean).join(", ")}</td>
                          <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">{o.productName}</td>
                          <td className="px-3 py-2 font-mono font-bold text-orange-800">{o.packingSize}</td>
                          <td className="px-3 py-2 text-center font-mono">{o.cases}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-orange-700 text-sm">−{o.quantity}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => deleteOutward(o.id)}
                              className="btn-press text-red-500 hover:text-red-700 text-base leading-none font-bold"
                              title="Delete line"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
