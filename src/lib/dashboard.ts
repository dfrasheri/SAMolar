import { and, asc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { appointments, invoices, patients, recalls } from "@/db/schema";
import { totals } from "@/lib/invoices";

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const from = Math.floor(start.getTime() / 1000);
  return { from, to: from + 86400 };
}

export function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getToday() {
  const { from, to } = todayRange();
  return db
    .select({
      id: appointments.id,
      startsAt: appointments.startsAt,
      title: appointments.title,
      status: appointments.status,
      patientId: appointments.patientId,
      firstName: patients.firstName,
      lastName: patients.lastName,
    })
    .from(appointments)
    .leftJoin(patients, eq(patients.id, appointments.patientId))
    .where(and(gte(appointments.startsAt, from), lt(appointments.startsAt, to), ne(appointments.status, "cancelled")))
    .orderBy(asc(appointments.startsAt))
    .all();
}

export function getCounts() {
  const { from, to } = todayRange();
  const activePatients = db.select().from(patients).where(eq(patients.status, "active")).all().length;
  const appointmentsToday = db
    .select()
    .from(appointments)
    .where(and(gte(appointments.startsAt, from), lt(appointments.startsAt, to), ne(appointments.status, "cancelled")))
    .all().length;
  const overdueRecalls = db
    .select()
    .from(recalls)
    .where(and(inArray(recalls.status, ["pending", "contacted"]), lt(recalls.dueDate, todayDate())))
    .all().length;
  const owed = db
    .select()
    .from(invoices)
    .where(eq(invoices.status, "open"))
    .all()
    .reduce((sum, i) => sum + totals(i.id).balance, 0);
  return { activePatients, appointmentsToday, overdueRecalls, owed: Math.round(owed * 100) / 100 };
}
