import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, inwardEntries, outwardEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";

export async function GET() {
  try {
    await ensureSeeded();

    const allProducts = await db.select().from(products).orderBy(products.category, products.productName);
    const allInward = await db.select().from(inwardEntries).orderBy(desc(inwardEntries.id));
    const allOutward = await db.select().from(outwardEntries).orderBy(desc(outwardEntries.id));

    return NextResponse.json({ products: allProducts, inwardEntries: allInward, outwardEntries: allOutward });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}

// Sequential serial: find the highest existing number suffix, return next as 4-digit padded
async function nextSerial(table: typeof inwardEntries | typeof outwardEntries, col: any) {
  const rows = await db.select().from(table);
  let max = 0;
  for (const r of rows as any[]) {
    const m = String(r[col]).match(/(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return String(max + 1).padStart(4, "0");
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const body = await req.json();
    const { action, payload } = body;
    const allProducts = await db.select().from(products);

    // ── Direct main stock set (Boxes & Stickers) ─────────────────────────────
    if (action === "SET_DIRECT_STOCK") {
      const { productId, directStock } = payload;
      const val = Math.max(0, Number(directStock) || 0);
      await db
        .update(products)
        .set({ directStock: val })
        .where(eq(products.id, Number(productId)));
      return NextResponse.json({ success: true, directStock: val });
    }

    if (action === "CREATE_INWARD") {
      const { items } = payload as {
        items: { productId: string | number; cases: string; quantity: string }[];
        invoiceNo: string; invoiceDate: string; docType: string; inwardNo: string; inwardDate: string;
        partyName: string; address: string; contactPerson: string; contactNumber: string;
        vehicleNo: string; docketNo: string; category: string; dispatchLocation: string; district: string;
      };

      const validItems = (items || []).filter(
        (i) => i.productId && Number(i.quantity) > 0
      );
      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "Add at least one product with quantity" },
          { status: 400 }
        );
      }

      const inwardNo = payload.inwardNo || `IN-${await nextSerial(inwardEntries, "inwardNo")}`;

      const rows = validItems.map((i) => {
        const prod = allProducts.find((p) => p.id === Number(i.productId))!;
        return {
          invoiceNo: payload.invoiceNo || "-",
          invoiceDate: payload.invoiceDate || new Date().toISOString().split("T")[0],
          docType: payload.docType || "Invoice",
          inwardNo,
          inwardDate: payload.inwardDate || new Date().toISOString().split("T")[0],
          partyName: payload.partyName || "-",
          address: payload.address || "",
          contactPerson: payload.contactPerson || "",
          contactNumber: payload.contactNumber || "",
          vehicleNo: payload.vehicleNo || "",
          docketNo: payload.docketNo || "",
          category: payload.category || "Purchase",
          dispatchLocation: payload.dispatchLocation || "",
          district: payload.district || "",
          productId: prod.id,
          productName: prod.productName,
          packingSize: prod.packingSize,
          cases: Number(i.cases) || 0,
          quantity: Number(i.quantity),
        };
      });

      await db.insert(inwardEntries).values(rows);

      return NextResponse.json({
        success: true,
        inwardNo,
        count: rows.length,
        totalQty: rows.reduce((s, r) => s + r.quantity, 0),
      });
    }

    if (action === "CREATE_OUTWARD") {
      const { items } = payload as {
        items: { productId: string | number; cases: string; quantity: string }[];
        invoiceNo: string; invoiceDate: string; docType: string; outwardNo: string; outwardDate: string;
        partyName: string; address: string; contactPerson: string; contactNumber: string;
        vehicleNo: string; docketNo: string; category: string; dispatchLocation: string; district: string;
      };

      const validItems = (items || []).filter(
        (i) => i.productId && Number(i.quantity) > 0
      );
      if (validItems.length === 0) {
        return NextResponse.json(
          { error: "Add at least one product with quantity" },
          { status: 400 }
        );
      }

      // Check stock for EVERY product in this customer order
      const allInward = await db.select().from(inwardEntries);
      const allOutward = await db.select().from(outwardEntries);

      const stockOf = (pid: number) => {
        const ti = allInward.filter((i) => i.productId === pid).reduce((s, i) => s + i.quantity, 0);
        const to = allOutward.filter((o) => o.productId === pid).reduce((s, o) => s + o.quantity, 0);
        return ti - to;
      };

      for (const i of validItems) {
        const pid = Number(i.productId);
        const avail = stockOf(pid);
        const prod = allProducts.find((p) => p.id === pid);
        if (Number(i.quantity) > avail) {
          return NextResponse.json(
            {
              error: `Insufficient Stock Available — ${prod?.productName ?? "Product"} (${
                prod?.packingSize ?? ""
              })`,
              currentStock: avail,
              requestedQty: Number(i.quantity),
            },
            { status: 400 }
          );
        }
      }

      const outwardNo = payload.outwardNo || `OUT-${await nextSerial(outwardEntries, "outwardNo")}`;

      const rows = validItems.map((i) => {
        const prod = allProducts.find((p) => p.id === Number(i.productId))!;
        return {
          invoiceNo: payload.invoiceNo || "-",
          invoiceDate: payload.invoiceDate || new Date().toISOString().split("T")[0],
          docType: payload.docType || "Invoice",
          outwardNo,
          outwardDate: payload.outwardDate || new Date().toISOString().split("T")[0],
          partyName: payload.partyName || "-",
          address: payload.address || "",
          contactPerson: payload.contactPerson || "",
          contactNumber: payload.contactNumber || "",
          vehicleNo: payload.vehicleNo || "",
          docketNo: payload.docketNo || "",
          category: payload.category || "Sale",
          dispatchLocation: payload.dispatchLocation || "",
          district: payload.district || "",
          productId: prod.id,
          productName: prod.productName,
          packingSize: prod.packingSize,
          cases: Number(i.cases) || 0,
          quantity: Number(i.quantity),
        };
      });

      await db.insert(outwardEntries).values(rows);

      return NextResponse.json({
        success: true,
        outwardNo,
        count: rows.length,
        totalQty: rows.reduce((s, r) => s + r.quantity, 0),
      });
    }

    if (action === "DELETE_INWARD") {
      await db.delete(inwardEntries).where(eq(inwardEntries.id, Number(payload.id)));
      return NextResponse.json({ success: true });
    }

    if (action === "DELETE_OUTWARD") {
      await db.delete(outwardEntries).where(eq(outwardEntries.id, Number(payload.id)));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 });
  }
}
