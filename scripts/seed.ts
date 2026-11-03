import crypto from "crypto";
import fs from "fs";
import path from "path";
import { db } from "../src/db/client";
import { eq, like } from "drizzle-orm";
import { users, patients, calendars, appointments, services, treatments, invoices, invoiceLines, payments, recalls, auditLog, patientImages } from "../src/db/schema";
import { saveUpload, sniffImage } from "../src/lib/storage";
import { hashPassword } from "../src/lib/password";

const password = crypto.randomBytes(6).toString("hex");

db.insert(users)
  .values({
    id: "usr_admin",
    name: "Demo Admin",
    email: "admin@example.com",
    passwordHash: hashPassword(password),
  })
  .onConflictDoUpdate({ target: users.id, set: { passwordHash: hashPassword(password) } })
  .run();

const fakePatients = [
  { firstName: "Test", lastName: "Patient 1", phone: "555-0101", email: "patient1@example.com", country: "Albania", city: "Tirana", language: "sq", notes: "fake patient, wants a cleaning" },
  { firstName: "Test", lastName: "Patient 2", phone: "555-0102", email: "patient2@example.com", country: "Italy", city: "Milan", language: "it", notes: "fake patient, asks about implants" },
  { firstName: "Test", lastName: "Patient 3", phone: "555-0103", email: "patient3@example.com", country: "Germany", city: "Berlin", language: "de", notes: "fake patient, whitening" },
  { firstName: "Test", lastName: "Patient 4", phone: "555-0104", email: "patient4@example.com", country: "Albania", city: "Durres", language: "en", notes: "" },
  { firstName: "Test", lastName: "Patient 5", phone: "555-0105", email: "patient5@example.com", country: "UK", city: "London", language: "en", notes: "fake patient, crown check" },
];

fakePatients.forEach((p, i) => {
  db.insert(patients).values({ id: `pat_test_${i + 1}`, ...p }).onConflictDoNothing().run();
});

db.insert(calendars).values({ id: "cal_general", name: "General", durationMin: 30 }).onConflictDoNothing().run();
db.insert(calendars).values({ id: "cal_hygiene", name: "Hygiene", durationMin: 45 }).onConflictDoNothing().run();

const day = new Date();
day.setHours(0, 0, 0, 0);
const at = (offset: number, hour: number) => Math.floor(new Date(day.getTime() + offset * 86400000 + hour * 3600000).getTime() / 1000);

const fakeAppointments = [
  { calendarId: "cal_general", patientId: "pat_test_1", title: "checkup", offset: 0, hour: 9, mins: 30, status: "confirmed" },
  { calendarId: "cal_hygiene", patientId: "pat_test_2", title: "cleaning", offset: 0, hour: 11, mins: 45, status: "booked" },
  { calendarId: "cal_general", patientId: "pat_test_3", title: "whitening consult", offset: 1, hour: 10, mins: 30, status: "booked" },
  { calendarId: "cal_general", patientId: "pat_test_4", title: "filling", offset: 2, hour: 14, mins: 30, status: "booked" },
  { calendarId: "cal_hygiene", patientId: "pat_test_5", title: "cleaning", offset: -3, hour: 9, mins: 45, status: "showed" },
  { calendarId: "cal_general", patientId: "pat_test_1", title: "crown fitting", offset: -5, hour: 15, mins: 30, status: "no-show" },
  { calendarId: "cal_general", patientId: "pat_test_2", title: "extraction", offset: -8, hour: 10, mins: 30, status: "cancelled" },
];

db.delete(appointments).where(like(appointments.id, "apt_test_%")).run();
fakeAppointments.forEach((a, i) => {
  const startsAt = at(a.offset, a.hour);
  db.insert(appointments)
    .values({ id: `apt_test_${i + 1}`, calendarId: a.calendarId, patientId: a.patientId, title: a.title, startsAt, endsAt: startsAt + a.mins * 60, status: a.status })
    .run();
});

const fakeServices = [
  { name: "Checkup", price: 30, durationMin: 30 },
  { name: "Cleaning", price: 50, durationMin: 45 },
  { name: "Filling", price: 80, durationMin: 30 },
  { name: "Whitening", price: 150, durationMin: 60 },
  { name: "Crown", price: 400, durationMin: 60 },
  { name: "Implant", price: 900, durationMin: 90 },
];

fakeServices.forEach((s, i) => {
  db.insert(services).values({ id: `svc_test_${i + 1}`, ...s }).onConflictDoNothing().run();
});

const now = Math.floor(Date.now() / 1000);
const fakeTreatments = [
  { patientId: "pat_test_1", serviceId: "svc_test_3", name: "Filling", tooth: 36, price: 80, status: "done", doneAt: now - 20 * 86400 },
  { patientId: "pat_test_1", serviceId: "svc_test_5", name: "Crown", tooth: 46, price: 400, status: "planned", doneAt: null },
  { patientId: "pat_test_1", serviceId: "svc_test_2", name: "Cleaning", tooth: null, price: 50, status: "done", doneAt: now - 60 * 86400 },
  { patientId: "pat_test_2", serviceId: "svc_test_6", name: "Implant", tooth: 14, price: 900, status: "planned", doneAt: null },
  { patientId: "pat_test_3", serviceId: "svc_test_4", name: "Whitening", tooth: null, price: 150, status: "planned", doneAt: null },
  { patientId: "pat_test_5", serviceId: "svc_test_3", name: "Filling", tooth: 25, price: 80, status: "done", doneAt: now - 10 * 86400 },
];

fakeTreatments.forEach((t, i) => {
  db.insert(treatments).values({ id: `trt_test_${i + 1}`, ...t }).onConflictDoNothing().run();
});

db.insert(invoices).values({ id: "inv_test_1", number: "INV-0001", patientId: "pat_test_1", status: "paid", createdAt: now - 19 * 86400, paidAt: now - 18 * 86400 }).onConflictDoNothing().run();
db.insert(invoiceLines).values({ id: "inl_test_1", invoiceId: "inv_test_1", description: "Filling (tooth 36)", quantity: 1, unitPrice: 80, treatmentId: "trt_test_1" }).onConflictDoNothing().run();
db.insert(payments).values({ id: "pay_test_1", invoiceId: "inv_test_1", amount: 80, method: "cash", ref: "stub-cash-1", createdAt: now - 18 * 86400 }).onConflictDoNothing().run();
db.update(treatments).set({ invoiceId: "inv_test_1" }).where(eq(treatments.id, "trt_test_1")).run();

db.insert(invoices).values({ id: "inv_test_2", number: "INV-0002", patientId: "pat_test_5", status: "open", createdAt: now - 9 * 86400 }).onConflictDoNothing().run();
db.insert(invoiceLines).values({ id: "inl_test_2", invoiceId: "inv_test_2", description: "Filling (tooth 25)", quantity: 1, unitPrice: 80, treatmentId: "trt_test_6" }).onConflictDoNothing().run();
db.insert(payments).values({ id: "pay_test_2", invoiceId: "inv_test_2", amount: 30, method: "card", ref: "stub-card-2", createdAt: now - 8 * 86400 }).onConflictDoNothing().run();
db.update(treatments).set({ invoiceId: "inv_test_2" }).where(eq(treatments.id, "trt_test_6")).run();

const dateOffset = (days: number) => {
  const x = new Date(day.getTime() + days * 86400000);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
};

const fakeRecalls = [
  { patientId: "pat_test_1", dueDate: dateOffset(-12), reason: "6 month cleaning", status: "pending", contactedAt: null },
  { patientId: "pat_test_3", dueDate: dateOffset(10), reason: "whitening follow up", status: "pending", contactedAt: null },
  { patientId: "pat_test_2", dueDate: dateOffset(-2), reason: "implant check", status: "contacted", contactedAt: now - 86400 },
  { patientId: "pat_test_5", dueDate: dateOffset(30), reason: "yearly checkup", status: "pending", contactedAt: null },
  { patientId: "pat_test_4", dueDate: dateOffset(-40), reason: "cleaning", status: "done", contactedAt: now - 45 * 86400 },
];

db.delete(recalls).where(like(recalls.id, "rcl_test_%")).run();
fakeRecalls.forEach((r, i) => {
  db.insert(recalls).values({ id: `rcl_test_${i + 1}`, ...r }).run();
});

const fakeAudit = [
  { action: "create", entity: "patient", entityId: "pat_test_1", summary: "created patient Test Patient 1", ago: 70 },
  { action: "create", entity: "appointment", entityId: "apt_test_1", summary: "booked checkup for Test Patient 1", ago: 40 },
  { action: "update", entity: "treatment", entityId: "trt_test_1", summary: "marked Filling (tooth 36) done", ago: 20 },
  { action: "create", entity: "invoice", entityId: "inv_test_1", summary: "created invoice INV-0001", ago: 19 },
  { action: "create", entity: "payment", entityId: "pay_test_1", summary: "recorded 80.00 cash on INV-0001", ago: 18 },
  { action: "update", entity: "appointment", entityId: "apt_test_6", summary: "set crown fitting to no-show", ago: 5 },
];

db.delete(auditLog).where(like(auditLog.id, "aud_test_%")).run();
fakeAudit.forEach((a, i) => {
  db.insert(auditLog)
    .values({ id: `aud_test_${i + 1}`, userId: "usr_admin", userName: "Demo Admin", action: a.action, entity: a.entity, entityId: a.entityId, summary: a.summary, createdAt: now - a.ago * 86400 })
    .run();
});

const xrayDir = path.resolve(process.env.DATA_DIR || "./data", "xrays");
for (let i = 1; i <= 3; i++) {
  const file = path.join(xrayDir, `panoramic-${i}.jpg`);
  const id = `img_test_${i}`;
  if (!fs.existsSync(file) || db.select().from(patientImages).where(eq(patientImages.id, id)).get()) continue;
  const bytes = fs.readFileSync(file);
  const sniffed = sniffImage(bytes);
  if (!sniffed || !sniffed.width || !sniffed.height) continue;
  db.insert(patientImages)
    .values({ id, patientId: `pat_test_${i}`, filename: saveUpload(bytes, sniffed.mime), mime: sniffed.mime, width: sniffed.width, height: sniffed.height, caption: `demo panoramic ${i}` })
    .run();
}

console.log("login: admin@example.com /", password);
