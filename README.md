# SAMolar

Segment anything. Mostly molars.

A simplified demo of a clinic CRM, built as a portfolio project. It is not a production product and it is not meant for real patient data. Everything in it is fake.

## What it does

- Waiting room: a dashboard with today's appointments, overdue recalls, open tasks and open invoices
- Patients: list, search, create, edit, archive, with notes, tasks, appointment and invoice history
- Appointments book: month view, booking with a double booking check, status changes
- Services: a simple price list
- Treatments: per patient, with a tooth chart (planned and done)
- Invoices: built from done treatments or free lines, with payments
- Recall list: patients who are due back
- To do: small tasks tied to patients, with due dates
- Audit log: who changed what
- X-rays: upload a panoramic image, run segmentation, see the masks on the image

## How it is simplified

- One clinic, one login, no roles
- SQLite file database
- Plain pages, not a polished UI
- Outside services are stubbed. Card payments and recall messages only log what they would do in the terminal, nothing is charged or sent.
- X-ray segmentation uses Meta's SAM 3.1 when `MODEL_API_KEY` is set. Without a key it draws placeholder shapes and says so on screen. The live call has not been tested against the real API.

## Run

```
npm install
cp .env.example .env
npm run db:push
npm run xrays
npm run db:seed
npm run dev
```

Then open http://localhost:4300 and log in with the admin the seed script prints. If something else already uses port 4300, change the port in `package.json`.

`npm run xrays` is optional. Without it the seed skips the demo images. Re-running `npm run db:seed` is safe and prints a new admin password each time.

## Demo X-rays

No images are stored in this repo. `npm run xrays` downloads three panoramic X-rays from Wikimedia Commons into `data/xrays/` (ignored by git) and writes a `CREDITS.txt` next to them. It checks each file's licence on Commons before downloading.

- Basic panoramic radiograph, Coronation Dental Specialty Group, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Basic_panoramic_radiograph.jpg
- Mixed dentition pan, Coronation Dental Specialty Group, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Mixed_dentition_pan.jpg
- Deciduous teeth-boy-OPG-10,10,2019, Gang65, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Deciduous_teeth-boy-OPG-10%2C10%2C2019.jpg

The images are real radiographs shared by their authors. They are not the fictional demo patients they get attached to.

## Notes

- Segmentation results from the Meta API are decoded with `@meta-sam/parser`, which Meta publishes under its own SAM License. It is installed from npm and not included in this repo.
- Uploaded files are stored in `data/uploads/`, outside `public/`, and served only to logged in users. Only png, jpeg and webp files are accepted, checked by their contents.
