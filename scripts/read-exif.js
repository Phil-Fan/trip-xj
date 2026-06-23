const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');

const photosDir = path.join(__dirname, '..', 'public', 'photos');
const files = fs.readdirSync(photosDir)
  .filter(f => /^IMG_/i.test(f))
  .filter(f => /\.(jpg|jpeg|png|heic)$/i.test(f))
  .sort();

async function main() {
  for (const file of files) {
    const filePath = path.join(photosDir, file);
    try {
      const tags = await ExifReader.load(filePath);
      const lat = tags.GPSLatitude;
      const lon = tags.GPSLongitude;
      const date = tags.DateTimeOriginal || tags.DateTime;
      console.log('---');
      console.log('file:', file);
      console.log('date:', date?.description || date);
      if (lat && lon) {
        console.log('lat:', lat.description);
        console.log('lon:', lon.description);
      } else {
        console.log('gps: not available');
      }
    } catch (err) {
      console.log('---');
      console.log('file:', file);
      console.log('error:', err.message);
    }
  }
}

main();
