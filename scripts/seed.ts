import crypto from "crypto";
import { db } from "../src/db/client";
import { users, patients } from "../src/db/schema";
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

console.log("login: admin@example.com /", password);
