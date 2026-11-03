import crypto from "crypto";
import { db } from "../src/db/client";
import { like } from "drizzle-orm";
import { users, patients, calendars, appointments, services } from "../src/db/schema";
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

console.log("login: admin@example.com /", password);
