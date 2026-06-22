export type Point = {
  name: string;
  coordinates: [number, number];
  type: "start" | "end" | "scenic";
};

export type Day = {
  id: string;
  title: string;
  start: string;
  end: string;
  routeSummary: string;
  color: string;
  startColor: string;
  endColor: string;
  coordinates: [number, number][];
  bounds: [[number, number], [number, number]];
  points: Point[];
  startCoordinates: [number, number];
  distanceKm: number;
  durationMin: number;
};

export type Trip = {
  title: string;
  days: Day[];
};

import routeGeometries from "./route-geometries.json";

const WAYPOINTS: Record<string, [number, number]> = {
  乌鲁木齐: [87.6168, 43.8256],
  五家渠: [87.542852, 44.166489],
  阜康: [87.953826, 44.164525],
  天山天池: [88.100149, 43.947409],
  "103团": [87.25, 44.75],
  "183团": [87.55, 46.05],
  北屯: [87.834419, 47.326733],
  福海县: [87.4948, 47.113],
  阿勒泰: [88.131842, 47.827308],
  禾木: [87.441886, 48.57357],
  贾登峪: [87.155579, 48.499305],
  布尔津: [86.8649, 47.7005],
  五彩滩: [86.869855, 47.706654],
  乌尔禾魔鬼城: [85.733205, 46.135149],
  克拉玛依: [84.8737, 45.5792],
  奎屯: [84.9023, 44.4269],
  独山子: [84.883, 44.328],
  精河县: [82.894, 44.607],
  赛里木湖: [81.172193, 44.604112],
  果子沟: [81.167568, 44.459601],
  霍城: [80.872, 44.053],
  伊宁市: [81.277715, 43.908021],
  薰衣草园: [80.900097, 44.276581],
  六星街: [81.310102, 43.932803],
  昭苏县: [81.134, 43.157],
  特克斯: [81.837, 43.217],
  夏塔: [80.668138, 42.597704],
  新源县: [83.233002, 43.434803],
  库尔德宁: [82.663906, 43.283534],
  喀拉峻: [82.088099, 43.065713],
  那拉提: [84.004044, 43.328611],
  百里画廊: [83.919793, 43.718426],
  乔尔玛: [84.338121, 43.661625],
  巴音布鲁克: [84.14412, 43.025805],
  巴伦台: [86.31492, 42.75331],
  和静: [86.39, 42.31],
  托克逊: [88.655, 42.793],
  达坂城: [88.311099, 43.363668],
  天山国际机场: [87.481092, 43.917012],
  喀纳斯湖: [87.055797, 48.82663],
  "阿禾公路186公里驿站": [87.566884, 48.462574],
};

const DAY_COLORS: string[] = [
  "#f97316", // D1  orange
  "#ef4444", // D2  red
  "#7dd3fc", // D3  baby blue
  "#84cc16", // D4  lime
  "#000000", // D5  black
  "#10b981", // D6  emerald
  "#9ca3af", // D7  gray
  "#c3b091", // D8  khaki
  "#facc15", // D9  yellow
  "#f472b6", // D10 pink
  "#d1d5db", // D11 light gray
  "#ef4444", // D12 red
  "#a855f7", // D13 purple
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixColors(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return rgbToHex(
    Math.round(ca.r + (cb.r - ca.r) * t),
    Math.round(ca.g + (cb.g - ca.g) * t),
    Math.round(ca.b + (cb.b - ca.b) * t),
  );
}

function tintColor(hex: string, factor: number): string {
  return mixColors(hex, "#ffffff", factor);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateRoute(
  points: [number, number][],
  segmentsPerLeg = 30,
): [number, number][] {
  if (points.length < 2) return points;
  const result: [number, number][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [lng1, lat1] = points[i];
    const [lng2, lat2] = points[i + 1];
    for (let s = 0; s <= segmentsPerLeg; s++) {
      const t = s / segmentsPerLeg;
      result.push([lerp(lng1, lng2, t), lerp(lat1, lat2, t)]);
    }
  }
  return result;
}

function computeBounds(
  coordinates: [number, number][],
): [[number, number], [number, number]] {
  if (coordinates.length === 0) {
    return [
      [0, 0],
      [0, 0],
    ];
  }
  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];
  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function haversine(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function estimateDistanceKm(coordinates: [number, number][]): number {
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    total += haversine(coordinates[i], coordinates[i + 1]);
  }
  return Math.round(total);
}

function estimateDurationMin(coordinates: [number, number][]): number {
  // Rough fallback: 60 km/h average over the interpolated straight-line path.
  const km = estimateDistanceKm(coordinates);
  return Math.round((km / 60) * 60);
}

function buildDay(
  index: number,
  title: string,
  start: string,
  end: string,
  routeSummary: string,
  waypoints: [number, number][],
  points: Point[],
): Day {
  const osrm = (
    routeGeometries as unknown as Record<
      string,
      { coordinates: [number, number][]; distance: number; duration: number } | null
    >
  )[`D${index}`];

  // Day 1 is arrival/loop in Urumqi; no route line should be drawn.
  const isArrivalDay = index === 1;
  const coordinates = isArrivalDay
    ? []
    : (osrm?.coordinates ?? interpolateRoute(waypoints));
  const distanceKm = isArrivalDay
    ? 0
    : (osrm?.distance ?? estimateDistanceKm(coordinates));
  const durationMin = isArrivalDay
    ? 0
    : (osrm?.duration ?? estimateDurationMin(coordinates));
  const endColor = DAY_COLORS[(index - 1) % DAY_COLORS.length];
  const startColor = tintColor(endColor, 0.65);
  const startCoordinates = (WAYPOINTS[start] ?? waypoints[0]) as [number, number];

  return {
    id: `D${index}`,
    title,
    start,
    end,
    routeSummary,
    color: endColor,
    startColor,
    endColor,
    coordinates,
    bounds: computeBounds(coordinates),
    points,
    startCoordinates,
    distanceKm,
    durationMin,
  };
}

const W = WAYPOINTS;

export const trip: Trip = {
  title: "北疆自驾路书",
  days: [
    buildDay(
      1,
      "乌鲁木齐落地",
      "乌鲁木齐",
      "乌鲁木齐",
      "落地乌鲁木齐，租车，休整后住在市区。",
      [
        [W["天山国际机场"][0] - 0.08, W["天山国际机场"][1] - 0.06],
        [W["天山国际机场"][0] + 0.05, W["天山国际机场"][1] - 0.04],
        [W["天山国际机场"][0] + 0.06, W["天山国际机场"][1] + 0.05],
        [W["天山国际机场"][0] - 0.04, W["天山国际机场"][1] + 0.06],
        [W["天山国际机场"][0] - 0.08, W["天山国际机场"][1] - 0.06],
      ],
      [{ name: "天山国际机场", coordinates: W["天山国际机场"], type: "start" }],
    ),
    buildDay(
      2,
      "天山天池 → 福海县",
      "乌鲁木齐",
      "福海县",
      "上午游览天山天池，傍晚经 S21 沙漠公路抵达福海县。",
      [
        W["乌鲁木齐"],
        W["阜康"],
        W["天山天池"],
        W["阜康"],
        W["乌鲁木齐"],
        W["五家渠"],
        W["103团"],
        W["183团"],
        W["北屯"],
        W["福海县"],
      ],
      [
        { name: "天山天池", coordinates: W["天山天池"], type: "scenic" },
        { name: "福海县", coordinates: W["福海县"], type: "end" },
      ],
    ),
    buildDay(
      3,
      "阿禾公路 → 禾木 → 贾登峪",
      "福海县",
      "贾登峪",
      "沿阿禾公路北上到禾木用餐，傍晚经 S232 到贾登峪住宿。",
      [
        W["福海县"],
        W["北屯"],
        W["阿勒泰"],
        W["阿禾公路186公里驿站"],
        W["禾木"],
        W["贾登峪"],
      ],
      [
        { name: "禾木", coordinates: W["禾木"], type: "scenic" },
        { name: "贾登峪", coordinates: W["贾登峪"], type: "end" },
      ],
    ),
    buildDay(
      4,
      "喀纳斯 → 布尔津",
      "贾登峪",
      "布尔津",
      "贾登峪乘景区区间车至喀纳斯湖游览，晚上返回布尔津住宿。",
      [W["贾登峪"], W["喀纳斯湖"], W["贾登峪"], W["布尔津"]],
      [
        { name: "贾登峪", coordinates: W["贾登峪"], type: "start" },
        { name: "喀纳斯湖", coordinates: W["喀纳斯湖"], type: "scenic" },
        { name: "布尔津", coordinates: W["布尔津"], type: "end" },
      ],
    ),
    buildDay(
      5,
      "五彩滩 → 奎屯",
      "布尔津",
      "奎屯",
      "五彩滩日出后经高速南下奎屯，途经魔鬼城地貌。",
      [
        W["布尔津"],
        W["五彩滩"],
        W["布尔津"],
        W["乌尔禾魔鬼城"],
        W["克拉玛依"],
        W["奎屯"],
      ],
      [
        { name: "五彩滩", coordinates: W["五彩滩"], type: "scenic" },
        { name: "魔鬼城", coordinates: W["乌尔禾魔鬼城"], type: "scenic" },
        { name: "奎屯", coordinates: W["奎屯"], type: "end" },
      ],
    ),
    buildDay(
      6,
      "休整 → 精河县",
      "奎屯",
      "精河县",
      "休整并检修无人机，傍晚前往赛里木湖东侧的精河县住宿。",
      [W["奎屯"], W["独山子"], [83.5, 44.5], W["精河县"]],
      [{ name: "精河县", coordinates: W["精河县"], type: "end" }],
    ),
    buildDay(
      7,
      "赛里木湖 → 伊宁市",
      "精河县",
      "伊宁市",
      "精河出发环湖赛里木湖，晚上抵达伊宁市。",
      [
        W["精河县"],
        [81.2, 44.6],
        W["赛里木湖"],
        W["果子沟"],
        W["霍城"],
        W["伊宁市"],
      ],
      [
        { name: "赛里木湖", coordinates: W["赛里木湖"], type: "scenic" },
        { name: "伊宁市", coordinates: W["伊宁市"], type: "end" },
      ],
    ),
    buildDay(
      8,
      "薰衣草 → 六星街 → 昭苏",
      "伊宁市",
      "昭苏县",
      "上午薰衣草园和六星街，昭苏公路未通，改走 S12 + G577 到昭苏。",
      [
        W["伊宁市"],
        W["六星街"],
        W["薰衣草园"],
        [81.5, 43.5],
        W["昭苏县"],
      ],
      [
        { name: "薰衣草园", coordinates: W["薰衣草园"], type: "scenic" },
        { name: "六星街", coordinates: W["六星街"], type: "scenic" },
        { name: "昭苏县", coordinates: W["昭苏县"], type: "end" },
      ],
    ),
    buildDay(
      9,
      "夏塔 → 新源县",
      "昭苏县",
      "新源县",
      "夏塔古道景区游览后，经特克斯抵达新源县住宿。",
      [
        W["昭苏县"],
        W["夏塔"],
        W["昭苏县"],
        W["特克斯"],
        [82.5, 43.2],
        W["新源县"],
      ],
      [
        { name: "夏塔", coordinates: W["夏塔"], type: "scenic" },
        { name: "新源县", coordinates: W["新源县"], type: "end" },
      ],
    ),
    buildDay(
      10,
      "库尔德宁一日游",
      "新源县",
      "新源县",
      "从新源县出发前往库尔德宁景区，当日返回新源。",
      [W["新源县"], W["库尔德宁"], W["新源县"]],
      [{ name: "库尔德宁", coordinates: W["库尔德宁"], type: "scenic" }],
    ),
    buildDay(
      11,
      "喀拉峻一日游",
      "新源县",
      "新源县",
      "从新源县出发前往喀拉峻大草原，当日返回新源。",
      [W["新源县"], W["特克斯"], W["喀拉峻"], W["特克斯"], W["新源县"]],
      [{ name: "喀拉峻", coordinates: W["喀拉峻"], type: "scenic" }],
    ),
    buildDay(
      12,
      "百里画廊 → 独库中段 → 巴音布鲁克",
      "新源县",
      "巴音布鲁克",
      "上午 S315 百里画廊，下午走独库公路中段到巴音布鲁克。",
      [
        W["新源县"],
        W["百里画廊"],
        W["乔尔玛"],
        W["巴音布鲁克"],
      ],
      [
        { name: "百里画廊", coordinates: W["百里画廊"], type: "scenic" },
        { name: "巴音布鲁克", coordinates: W["巴音布鲁克"], type: "end" },
      ],
    ),
    buildDay(
      13,
      "巴音布鲁克 → 天山国际机场",
      "巴音布鲁克",
      "天山国际机场",
      "经 G218 与 G0711 高速返回乌鲁木齐天山国际机场，结束行程。",
      [W["巴音布鲁克"], W["天山国际机场"]],
      [{ name: "天山国际机场", coordinates: W["天山国际机场"], type: "end" }],
    ),
  ],
};
