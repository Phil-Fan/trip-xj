const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');

const photosDir = path.join(__dirname, '..', 'public', 'photos');
const routeGeometries = require('../lib/data/route-geometries.json');

function haversineKm(lon1, lat1, lon2, lat2) {
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseGps(gpsValue) {
  if (typeof gpsValue === 'number') return gpsValue;
  if (typeof gpsValue === 'string') return parseFloat(gpsValue);
  return null;
}

async function readPhotos() {
  const files = fs
    .readdirSync(photosDir)
    .filter((f) => /^IMG_/i.test(f))
    .filter((f) => /\.(jpg|jpeg|png|heic)$/i.test(f))
    .sort();

  const photos = [];
  for (const file of files) {
    const filePath = path.join(photosDir, file);
    const tags = await ExifReader.load(filePath);
    const lat = parseGps(tags.GPSLatitude?.description);
    const lon = parseGps(tags.GPSLongitude?.description);
    const dateStr = tags.DateTimeOriginal?.description || tags.DateTime?.description;
    const date = dateStr ? new Date(dateStr.replace(/^\d{4}:\d{2}:\d{2}/, (m) => m.replace(/:/g, '-'))) : null;

    if (lat == null || lon == null) {
      console.log(`Skip ${file}: no GPS`);
      continue;
    }

    photos.push({ file, path: filePath, lat, lon, date });
  }
  return photos;
}

function findBestDay(photo) {
  let bestDay = null;
  let bestDist = Infinity;

  for (const [dayId, data] of Object.entries(routeGeometries)) {
    if (!data?.coordinates) continue;
    for (const [lon, lat] of data.coordinates) {
      const d = haversineKm(photo.lon, photo.lat, lon, lat);
      if (d < bestDist) {
        bestDist = d;
        bestDay = dayId;
      }
    }
  }

  return { bestDay, bestDist };
}

async function main() {
  const photos = await readPhotos();
  const assigned = photos.map((p) => ({ ...p, ...findBestDay(p) }));

  console.log('\nAssignments:');
  for (const p of assigned) {
    console.log(`${p.file} -> ${p.bestDay} (dist ${p.bestDist.toFixed(1)} km) at ${p.date?.toISOString()}`);
  }

  // Group by day and sort by time
  const groups = {};
  for (const p of assigned) {
    if (!groups[p.bestDay]) groups[p.bestDay] = [];
    groups[p.bestDay].push(p);
  }

  const copies = [];
  for (const [dayId, list] of Object.entries(groups)) {
    list.sort((a, b) => (a.date || 0) - (b.date || 0));
    list.forEach((p, idx) => {
      const ext = path.extname(p.file);
      const target = path.join(photosDir, `${dayId}-${idx + 1}${ext}`);
      copies.push({ from: p.path, to: target, dayId, idx: idx + 1, file: p.file });
    });
  }

  console.log('\nCopies:');
  for (const c of copies) {
    console.log(`${c.file} -> ${path.basename(c.to)}`);
    fs.copyFileSync(c.from, c.to);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
