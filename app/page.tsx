import DaySidebar from "@/components/day-sidebar";
import DaySlider from "@/components/day-slider";
import MapShell from "@/components/map-shell";

export default function Home() {
  return (
    <main className="flex h-screen w-screen overflow-hidden bg-background">
      <section className="flex min-w-0 flex-1 flex-col">
        <MapShell />
        <div className="h-16 shrink-0">
          <DaySlider />
        </div>
      </section>
      <DaySidebar />
    </main>
  );
}
