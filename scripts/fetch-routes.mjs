import fs from "node:fs/promises";
import path from "node:path";

const days = [
  {
    id: "D1",
    waypoints: [
      [87.5368, 43.7656],
      [87.6668, 43.7856],
      [87.6768, 43.8756],
      [87.5768, 43.8856],
      [87.5368, 43.7656],
    ],
  },
  {
    id: "D2",
    waypoints: [
      [87.6168, 43.8256],
      [88.100149, 43.947409],
      [87.6168, 43.8256],
      [87.4948, 47.113],
    ],
  },
  {
    id: "D3",
    waypoints: [
      [87.4948, 47.113],
      [88.131842, 47.827308],
      [87.441886, 48.57357],
      [87.155579, 48.499305],
    ],
  },
  {
    id: "D4",
    waypoints: [
      [87.155579, 48.499305],
      [86.8649, 47.7005],
    ],
  },
  {
    id: "D5",
    waypoints: [
      [86.8649, 47.7005],
      [86.869855, 47.706654],
      [86.8649, 47.7005],
      [85.733205, 46.135149],
      [84.9023, 44.4269],
    ],
  },
  {
    id: "D6",
    waypoints: [
      [84.9023, 44.4269],
      [82.894, 44.607],
    ],
  },
  {
    id: "D7",
    waypoints: [
      [82.894, 44.607],
      [81.172193, 44.604112],
      [81.277715, 43.908021],
    ],
  },
  {
    id: "D8",
    waypoints: [
      [81.277715, 43.908021],
      [80.75656, 44.169989],
      [81.310102, 43.932803],
      [81.277715, 43.908021],
      [81.837, 43.217],
      [81.134, 43.157],
    ],
  },
  {
    id: "D9",
    waypoints: [
      [81.134, 43.157],
      [80.668138, 42.597704],
      [81.134, 43.157],
      [81.837, 43.217],
      [83.233002, 43.434803],
    ],
  },
  {
    id: "D10",
    waypoints: [
      [83.233002, 43.434803],
      [82.663906, 43.283534],
      [83.233002, 43.434803],
    ],
  },
  {
    id: "D11",
    waypoints: [
      [83.233002, 43.434803],
      [81.837, 43.217],
      [82.088099, 43.065713],
      [81.837, 43.217],
      [83.233002, 43.434803],
    ],
  },
  {
    id: "D12",
    waypoints: [
      [83.233002, 43.434803],
      [84.004044, 43.328611],
      [83.919793, 43.718426],
      [84.14412, 43.025805],
    ],
  },
  {
    id: "D13",
    waypoints: [
      [84.14412, 43.025805],
      [86.31492, 42.75331],
      [88.655, 42.793],
      [88.311099, 43.363668],
      [87.6168, 43.8256],
    ],
  },
];

async function fetchRoute(waypoints) {
  const coords = waypoints.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.code !== "Ok") {
    throw new Error(json.message || json.code);
  }
  const route = json.routes[0];
  return {
    coordinates: route.geometry.coordinates,
    distance: Math.round(route.distance / 1000),
  };
}

async function main() {
  const data = {};
  for (const day of days) {
    try {
      const result = await fetchRoute(day.waypoints);
      data[day.id] = result;
      console.log(`${day.id}: ${result.coordinates.length} points, ${result.distance} km`);
    } catch (err) {
      console.error(`${day.id}: failed - ${err.message}`);
      data[day.id] = null;
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  const outPath = path.resolve(process.cwd(), "lib/data/route-geometries.json");
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
