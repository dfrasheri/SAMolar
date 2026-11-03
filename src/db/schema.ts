import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  expiresAt: integer("expires_at").notNull(),
});

export type User = typeof users.$inferSelect;

export const patients = sqliteTable("patients", {
  id: text("id").primaryKey(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  email: text("email"),
  country: text("country"),
  city: text("city"),
  language: text("language"),
  notes: text("notes"),
  status: text("status").notNull().default("active"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export type Patient = typeof patients.$inferSelect;

export const calendars = sqliteTable("calendars", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  durationMin: integer("duration_min").notNull().default(30),
});

export const appointments = sqliteTable("appointments", {
  id: text("id").primaryKey(),
  calendarId: text("calendar_id").notNull(),
  patientId: text("patient_id").notNull(),
  title: text("title"),
  startsAt: integer("starts_at").notNull(),
  endsAt: integer("ends_at").notNull(),
  status: text("status").notNull().default("booked"),
  notes: text("notes"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  updatedAt: integer("updated_at").default(sql`(unixepoch())`),
});

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  price: real("price").notNull().default(0),
  durationMin: integer("duration_min").notNull().default(30),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const treatments = sqliteTable("treatments", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  serviceId: text("service_id"),
  name: text("name").notNull(),
  tooth: integer("tooth"),
  price: real("price").notNull().default(0),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  invoiceId: text("invoice_id"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  doneAt: integer("done_at"),
});

export const invoices = sqliteTable("invoices", {
  id: text("id").primaryKey(),
  number: text("number").notNull().unique(),
  patientId: text("patient_id").notNull(),
  status: text("status").notNull().default("open"),
  note: text("note"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
  paidAt: integer("paid_at"),
});

export const invoiceLines = sqliteTable("invoice_lines", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  description: text("description").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: real("unit_price").notNull().default(0),
  treatmentId: text("treatment_id"),
});

export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  invoiceId: text("invoice_id").notNull(),
  amount: real("amount").notNull(),
  method: text("method").notNull(),
  ref: text("ref"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const recalls = sqliteTable("recalls", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  dueDate: text("due_date").notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"),
  contactedAt: integer("contacted_at"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  userName: text("user_name"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id"),
  summary: text("summary"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const patientImages = sqliteTable("patient_images", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  filename: text("filename").notNull(),
  mime: text("mime").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  caption: text("caption"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const segmentations = sqliteTable("segmentations", {
  id: text("id").primaryKey(),
  imageId: text("image_id").notNull(),
  prompt: text("prompt").notNull(),
  source: text("source").notNull(),
  objects: text("objects").notNull().default("[]"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});

export const patientNotes = sqliteTable("patient_notes", {
  id: text("id").primaryKey(),
  patientId: text("patient_id").notNull(),
  body: text("body").notNull(),
  authorName: text("author_name"),
  createdAt: integer("created_at").default(sql`(unixepoch())`),
});
