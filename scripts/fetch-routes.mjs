import fs from "node:fs/promises";
import path from "node:path";

export const days = [
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
      [87.1, 48.2],
      [86.8649, 47.7005],
    ],
  },
  {
    id: "D5",
    waypoints: [
      [86.8649, 47.7005],
      [86.869855, 47.706654],
      [86.8649, 47.7005],
      [86.3, 47.3],
      [85.733205, 46.135149],
      [84.8737, 45.5792],
      [84.9023, 44.4269],
    ],
  },
  {
    id: "D6",
    waypoints: [
      [84.9023, 44.4269],
      [87.620762, 43.878519],
      [84.9023, 44.4269],
      [82.894, 44.607],
    ],
  },
  {
    id: "D7",
    waypoints: [
      [82.894, 44.607],
      [81.2, 44.6],
      [81.172193, 44.604112],
      [81.167568, 44.459601],
      [80.872, 44.053],
      [81.277715, 43.908021],
    ],
  },
  {
    id: "D8",
    waypoints: [
      [81.277715, 43.908021],
      [81.5, 43.5],
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
      [82.5, 43.2],
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
      [83.919793, 43.718426],
      [84.338121, 43.661625],
      [84.14412, 43.025805],
    ],
  },
  {
    id: "D13",
    waypoints: [
      [84.14412, 43.025805],
      [87.481092, 43.917012],
    ],
  },
];

const AMAP_KEY = process.env.AMAP_API_KEY || process.env.NEXT_PUBLIC_AMAP_KEY;
if (!AMAP_KEY) {
  throw new Error("AMAP_API_KEY or NEXT_PUBLIC_AMAP_KEY must be set in the environment");
}

function formatCoord([lng, lat]) {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

async function fetchRoute(waypoints) {
  const origin = formatCoord(waypoints[0]);
  const destination = formatCoord(waypoints[waypoints.length - 1]);
  const via = waypoints.slice(1, -1);
  const params = new URLSearchParams({
    origin,
    destination,
    output: "JSON",
    extensions: "all",
    key: AMAP_KEY,
  });
  if (via.length > 0) {
    params.set("waypoints", via.map(formatCoord).join(";"));
  }
  const url = `https://restapi.amap.com/v3/direction/driving?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  if (json.status !== "1") {
    throw new Error(json.info || json.infocode || "Amap request failed");
  }
  const path = json.route.paths[0];
  const coordinates = [];
  let last = null;
  for (const step of path.steps) {
    for (const pt of step.polyline.split(";")) {
      const [lng, lat] = pt.split(",").map(Number);
      if (!last || last[0] !== lng || last[1] !== lat) {
        coordinates.push([lng, lat]);
        last = [lng, lat];
      }
    }
  }
  return {
    coordinates,
    distance: Math.round(parseInt(path.distance, 10) / 1000),
    duration: Math.round(parseInt(path.duration, 10) / 60),
  };
}

async function main() {
  const targetDay = process.argv[2];
  const daysToFetch = targetDay ? days.filter((d) => d.id === targetDay) : days;
  if (targetDay && daysToFetch.length === 0) {
    throw new Error(`Unknown day: ${targetDay}`);
  }

  const data = JSON.parse(await fs.readFile("lib/data/route-geometries.json", "utf8"));
  for (const day of daysToFetch) {
    try {
      const result = await fetchRoute(day.waypoints);
      data[day.id] = result;
      console.log(`${day.id}: ${result.coordinates.length} points, ${result.distance} km`);
    } catch (err) {
      console.error(`${day.id}: failed - ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 1200));
  }
  const outPath = path.resolve(process.cwd(), "lib/data/route-geometries.json");
  await fs.writeFile(outPath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${outPath}`);
}

if (import.meta.url === new URL(process.argv[1], "file://").href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
