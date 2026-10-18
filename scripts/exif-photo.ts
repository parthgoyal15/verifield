// Writes GPS + capture time EXIF into a photo, for preparing demo evidence (genuine or fraudulent).
// Usage: npx tsx scripts/exif-photo.ts <in.jpg|-> <lat> <lng> "<YYYY:MM:DD HH:MM:SS>" <out.jpg>
//   Use "-" as input to generate a plain test image.
import sharp from "sharp";

const [input, lat, lng, taken, out] = process.argv.slice(2);
if (!out) {
  console.error('Usage: npx tsx scripts/exif-photo.ts <in.jpg|-> <lat> <lng> "2024:09:08 09:12:00" <out.jpg>');
  process.exit(1);
}

const dms = (v: number) => {
  v = Math.abs(v);
  const d = Math.floor(v);
  const m = Math.floor((v - d) * 60);
  const s = ((v - d) * 60 - m) * 60;
  return `${d}/1 ${m}/1 ${Math.round(s * 100)}/100`;
};

// Random noise, so every generated test photo has a different perceptual hash.
const testImage = () => sharp({ create: { width: 800, height: 600, channels: 3, background: "#777", noise: { type: "gaussian", mean: 120, sigma: 60 } } }).png();

const la = Number(lat);
const ln = Number(lng);
(input === "-" ? testImage() : sharp(input))
  .jpeg({ quality: 90 })
  .withExif({
    IFD0: { Make: "Samsung", Model: "Galaxy A14" },
    IFD2: { DateTimeOriginal: taken },
    IFD3: { GPSLatitudeRef: la >= 0 ? "N" : "S", GPSLatitude: dms(la), GPSLongitudeRef: ln >= 0 ? "E" : "W", GPSLongitude: dms(ln) },
  })
  .toFile(out)
  .then(() => console.log("wrote", out));
