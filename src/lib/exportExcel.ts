import * as XLSX from "xlsx";

type Product = {
  id: number;
  category: string;
  productName: string;
  packingSize: string;
  uom: string;
};

type EntryRow = {
  id: number;
  invoiceNo: string;
  invoiceDate: string;
  docType: string;
  entryNo: string;
  entryDate: string;
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

function makeSheet(
  title: string,
  note: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const wsData = [
    [title],
    [note],
    ["BVGAT Sagar Complex Store — Inward / Outward / Stock Record"],
    [],
    headers,
    ...rows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = headers.map(h => ({ wch: Math.min(30, Math.max(14, h.length + 3)) }));
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
  ];
  return ws;
}

function monthLabel(from: string, to: string) {
  const m = to.slice(0, 7) || new Date().toISOString().slice(0, 7);
  return m;
}

// ── Inward Report Excel (purani format) ───────────────────────────────────────
export function exportInwardExcel(
  inwards: Array<Omit<EntryRow, "entryNo" | "entryDate"> & { inwardNo: string; inwardDate: string }>,
  products: Product[],
  from: string,
  to: string
) {
  const uomOf = (id: number) => products.find(p => p.id === id)?.uom || "";

  const rows = inwards
    .filter(i => i.inwardDate >= from && i.inwardDate <= to)
    .sort((a, b) => a.inwardDate.localeCompare(b.inwardDate) || a.inwardNo.localeCompare(b.inwardNo) || a.id - b.id)
    .map(i => [
      i.invoiceNo,
      i.inwardDate,
      i.docType,
      i.inwardNo,
      i.inwardDate,
      i.partyName,
      i.address,
      i.contactPerson,
      i.contactNumber,
      i.vehicleNo,
      i.docketNo,
      i.category,
      i.dispatchLocation,
      i.district,
      i.productName,
      i.packingSize,
      uomOf(i.productId),
      i.cases,
      `+${i.quantity}`,
    ]);

  const headers = [
    "Invoice / DC No:",
    "Invoice / DC Date",
    "Doc. type (Invoice, DC)",
    "Inward No",
    "Inward Date",
    "Name of Party",
    "Address",
    "Name Of Contact Person",
    "Contact Number",
    "Vehicle No. / Transporter Name",
    "Docket / LR No.",
    "Category: Purchase/Free Sample/Demo/Stock Transfer/Return",
    "Dispatch Location",
    "District",
    "Product Name",
    "Packing Size",
    "UOM",
    "Cases",
    "Quantity (+)",
  ];

  const ws = makeSheet(
    `Inward Report : ${from} to ${to}`,
    "Note : Please maintain series with date",
    headers,
    rows
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inward Report");
  XLSX.writeFile(wb, `BVGAT_Inward_Report_${monthLabel(from, to)}.xlsx`);
  return rows.length;
}

// ── Outward Report Excel (purani format) ──────────────────────────────────────
export function exportOutwardExcel(
  outwards: Array<Omit<EntryRow, "entryNo" | "entryDate"> & { outwardNo: string; outwardDate: string }>,
  products: Product[],
  from: string,
  to: string
) {
  const uomOf = (id: number) => products.find(p => p.id === id)?.uom || "";

  const rows = outwards
    .filter(o => o.outwardDate >= from && o.outwardDate <= to)
    .sort((a, b) => a.outwardDate.localeCompare(b.outwardDate) || a.outwardNo.localeCompare(b.outwardNo) || a.id - b.id)
    .map(o => [
      o.invoiceNo,
      o.outwardDate,
      o.docType,
      o.outwardNo,
      o.outwardDate,
      o.partyName,
      o.address,
      o.contactPerson,
      o.contactNumber,
      o.vehicleNo,
      o.docketNo,
      o.category,
      o.dispatchLocation,
      o.district,
      o.productName,
      o.packingSize,
      uomOf(o.productId),
      o.cases,
      `-${o.quantity}`,
    ]);

  const headers = [
    "Invoice / DC No:",
    "Invoice / DC Date",
    "Doc. type (Invoice, DC)",
    "Outward No",
    "Outward Date",
    "Name of Party",
    "Address",
    "Name Of Contact Person",
    "Contact Number",
    "Vehicle No. / Transporter Name",
    "Docket / LR No.",
    "Category: Sale/Free Sample/Demo/Stock Transfer/Return",
    "Dispatch Location",
    "District",
    "Product Name",
    "Packing Size",
    "UOM",
    "Cases",
    "Quantity (-)",
  ];

  const ws = makeSheet(
    `Outward Report : ${from} to ${to}`,
    "Note : Please maintain series with date",
    headers,
    rows
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Outward Report");
  XLSX.writeFile(wb, `BVGAT_Outward_Report_${monthLabel(from, to)}.xlsx`);
  return rows.length;
}

// ── Stock Report Excel (mahine ka closing stock) ─────────────────────────────
export function exportStockExcel(
  products: Product[],
  inwards: Array<{ productId: number; inwardDate: string; quantity: number }>,
  outwards: Array<{ productId: number; outwardDate: string; quantity: number }>,
  from: string,
  to: string,
  mainStock: Record<number, number> = {}
) {
  const catOrder = [
    "BVG Products",
    "Boxes",
    "Stickers",
    "Empty Bottles",
    "Raw Material",
    "Consumables - Empty Bags & Pouches",
  ];
  const sizeNum = (s: string) => {
    const m = String(s).match(/[\d.]+/);
    return m ? parseFloat(m[0]) : Number.MAX_SAFE_INTEGER;
  };

  const sorted = [...products].sort((a, b) => {
    const ai = catOrder.indexOf(a.category);
    const bi = catOrder.indexOf(b.category);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
    const diff = sizeNum(a.packingSize) - sizeNum(b.packingSize);
    if (diff !== 0) return diff;
    return a.packingSize.localeCompare(b.packingSize);
  });

  let totIn = 0;
  let totOut = 0;
  let totAvail = 0;

  const rows = sorted.map(p => {
    const monthIn = inwards
      .filter(i => i.productId === p.id && i.inwardDate >= from && i.inwardDate <= to)
      .reduce((s, i) => s + i.quantity, 0);
    const monthOut = outwards
      .filter(o => o.productId === p.id && o.outwardDate >= from && o.outwardDate <= to)
      .reduce((s, o) => s + o.quantity, 0);
    const allIn = inwards.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
    const allOut = outwards.filter(o => o.productId === p.id).reduce((s, o) => s + o.quantity, 0);
    const direct = mainStock[p.id] || 0;
    const avail = direct + allIn - allOut;
    totIn += monthIn;
    totOut += monthOut;
    totAvail += Math.max(0, avail);
    return [
      p.category,
      p.productName,
      p.packingSize,
      p.uom,
      direct,
      `+${monthIn}`,
      `-${monthOut}`,
      avail,
    ];
  });

  const headers = [
    "Category",
    "Product Name",
    "Packing Size",
    "UOM",
    "Main Stock (Direct)",
    `Total Inward (${from} to ${to})`,
    `Total Outward (${from} to ${to})`,
    "Available Stock",
  ];

  const ws = makeSheet(
    `Stock Report : ${from} to ${to} (Closing Stock)`,
    "Current Stock = Main Stock + Total Inward - Total Outward",
    headers,
    [
      ...rows,
      ["TOTAL", "", "", "", "", `+${totIn}`, `-${totOut}`, totAvail],
    ]
  );
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Stock Report");
  XLSX.writeFile(wb, `BVGAT_Stock_Report_${monthLabel(from, to)}.xlsx`);
  return rows.length;
}
