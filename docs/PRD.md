You are building a production-grade travel route visualization web app using:

- Next.js (App Router)
- TailwindCSS
- shadcn/ui
- mapcn (map component library) https://www.mapcn.dev
- Zustand for state management

---

# PRODUCT

A Xinjiang self-driving travel route planner.

The app visualizes a 13-day itinerary with:
- Daily routes (D1–D13)
- Map-based polyline rendering
- Interactive synchronization between map, sidebar, and timeline

---

# CORE FEATURES

## 1. Map First Experience
- Default view shows full Xinjiang route overview
- Render all day routes (D1–D13) as polylines
- Each day has a distinct color
- Hover highlights route

---

## 2. Sidebar (Right Panel)
A fixed sidebar shows:
- List of days (D1–D13)
- Each item shows:
  - Day title
  - Start point
  - End point
  - Short route description

Clicking a day:
- zoom map to route bounds
- highlight selected route
- show route details in sidebar expanded view

---

## 3. Bottom Timeline Slider
- Horizontal scrollable day selector (D1–D13)
- Sync with map and sidebar
- Selecting a day updates:
  - map highlight
  - sidebar focus

---

## 4. Map Interactions
Using mapcn:
- Render polylines per day
- On click route:
  - highlight selected day
  - scroll sidebar to that day
- Auto-fit bounds when selecting a day

---

## 5. Data Model

Use static JSON for now:

Trip {
  title: "Xinjiang Self Drive"
  days: Day[]
}

Each Day:
- id: D1...D13
- title
- start
- end
- routeSummary
- polyline coordinates
- points (optional future extension)

---

# ROUTE DATA (HARD CODE)

Include these 13 days:

D1 乌鲁木齐落地，租车 住在乌鲁木齐
D2 天山天池，晚上 S21开到福海县
D3 阿禾公路 开到禾木吃饭 晚上S232开到贾登峪景区住宿
D4 喀纳斯景区（坐景观车） 晚上住在布尔津
D5 布尔津县出发，五彩滩 然后高速直接开到奎屯 路过有魔鬼城的地貌
D6 修整 修无人机 住宿住在赛里木湖东侧的精河县
D7 精河县出发，开到赛里木湖 晚上住伊宁市
D8 薰衣草园 + 六星街  昭苏公路没开，走S12 + G577国道 晚上住在昭苏县
D9 夏塔 晚上住在新源县
D10 从新源县出发 去库尔德宁
D11 从新源县出发 去喀拉峻
D12 上午S315 百里画廊 + 下午走独库公路中段到巴音布鲁克
D13 从巴音布鲁克出发走G218 + G0711 回到乌鲁木齐

---

# STATE MANAGEMENT (ZUSTAND)

Store:
- activeDayId
- hoveredDayId
- selectedRoute
- map instance reference

All UI components must sync via Zustand.

---

# UI DESIGN

Style direction:
- map-centric (Google Maps + travel journal hybrid)
- clean modern UI
- soft shadows
- glassmorphism sidebar
- smooth transitions

Use shadcn/ui for:
- Card
- ScrollArea
- Button
- Separator

---

# INTERACTION RULES

- clicking sidebar → update map
- clicking map route → update sidebar
- timeline scroll → updates active day
- only ONE active day at a time

---

# PERFORMANCE

- preload all route data
- memoize polyline rendering
- avoid re-rendering map on sidebar state change

---

# OUTPUT

Generate:
1. Next.js project structure
2. Map component (MapView)
3. Sidebar component (DaySidebar)
4. Timeline component (DaySlider)
5. Zustand store
6. mock route dataset (above)
