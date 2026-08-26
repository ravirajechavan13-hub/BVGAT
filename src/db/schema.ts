import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
} from "drizzle-orm/pg-core";

export const products = pgTable("products2", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),      // "Boxes", "Stickers", "Empty Bottles", "BVG Products"
  productName: text("product_name").notNull(),
  packingSize: text("packing_size").notNull(), // "200 ml", "400 ml", "1 kg", etc.
  uom: text("uom").notNull().default("ml"),    // ml, gm, kg, nos, etc.
  directStock: integer("direct_stock").notNull().default(0), // Direct main stock (Boxes & Stickers)
});

export const inwardEntries = pgTable("inward_entries2", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  docType: text("doc_type").notNull().default("Invoice"), // Invoice / DC
  inwardNo: text("inward_no").notNull(),
  inwardDate: text("inward_date").notNull(),
  partyName: text("party_name").notNull(),
  address: text("address").notNull().default(""),
  contactPerson: text("contact_person").notNull().default(""),
  contactNumber: text("contact_number").notNull().default(""),
  vehicleNo: text("vehicle_no").notNull().default(""),
  docketNo: text("docket_no").notNull().default(""),
  category: text("category").notNull().default("Purchase"), // Purchase/Free Sample/Demo/Stock Transfer/Return
  dispatchLocation: text("dispatch_location").notNull().default(""),
  district: text("district").notNull().default(""),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  packingSize: text("packing_size").notNull(),
  cases: integer("cases").notNull().default(0),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const outwardEntries = pgTable("outward_entries2", {
  id: serial("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull(),
  invoiceDate: text("invoice_date").notNull(),
  docType: text("doc_type").notNull().default("Invoice"), // Invoice / DC
  outwardNo: text("outward_no").notNull(),
  outwardDate: text("outward_date").notNull(),
  partyName: text("party_name").notNull(),
  address: text("address").notNull().default(""),
  contactPerson: text("contact_person").notNull().default(""),
  contactNumber: text("contact_number").notNull().default(""),
  vehicleNo: text("vehicle_no").notNull().default(""),
  docketNo: text("docket_no").notNull().default(""),
  category: text("category").notNull().default("Sale"), // Sale/Free Sample/Demo/Stock Transfer/Return
  dispatchLocation: text("dispatch_location").notNull().default(""),
  district: text("district").notNull().default(""),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  packingSize: text("packing_size").notNull(),
  cases: integer("cases").notNull().default(0),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
