# SAMolar

Segment anything. Mostly molars.

A simplified demo of a clinic CRM, built as a portfolio project. It is not a production product and it is not meant for real patient data. Everything in it is fake.

## Run

```
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Then open http://localhost:4300 and log in with the admin the seed script prints.

## Demo X-rays

No images are stored in this repo. To get a few panoramic X-rays for trying out the imaging panel, run:

```
npm run xrays
```

It downloads three images from Wikimedia Commons into `data/xrays/` (ignored by git) and writes a `CREDITS.txt` next to them. It checks each file's licence on Commons before downloading.

- Basic panoramic radiograph, Coronation Dental Specialty Group, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Basic_panoramic_radiograph.jpg
- Mixed dentition pan, Coronation Dental Specialty Group, CC BY 3.0, https://commons.wikimedia.org/wiki/File:Mixed_dentition_pan.jpg
- Deciduous teeth-boy-OPG-10,10,2019, Gang65, CC BY-SA 4.0, https://commons.wikimedia.org/wiki/File:Deciduous_teeth-boy-OPG-10%2C10%2C2019.jpg

The images are real radiographs shared by their authors. They are not the fictional demo patients they get attached to.
