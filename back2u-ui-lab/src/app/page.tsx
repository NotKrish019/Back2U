import Back2UHero from "@/components/Back2UHero";
export default function Home() {
  return (
    <main className="min-h-screen w-full bg-white text-black">
      {/* 100vh Hero Section */}
      <Back2UHero />

      {/* Placeholder Sections */}
      <section className="flex min-h-[50vh] flex-col items-center justify-center border-t border-black/10 px-6 py-24 text-center">
        <h2 className="text-xs font-semibold tracking-widest text-black/40 uppercase mb-2">SECTION 01</h2>
        <h3 className="text-3xl font-light tracking-tight">SEARCH</h3>
      </section>

      <section className="flex min-h-[50vh] flex-col items-center justify-center border-t border-black/10 px-6 py-24 text-center">
        <h2 className="text-xs font-semibold tracking-widest text-black/40 uppercase mb-2">SECTION 02</h2>
        <h3 className="text-3xl font-light tracking-tight">REPORT LOST</h3>
      </section>

      <section className="flex min-h-[50vh] flex-col items-center justify-center border-t border-black/10 px-6 py-24 text-center">
        <h2 className="text-xs font-semibold tracking-widest text-black/40 uppercase mb-2">SECTION 03</h2>
        <h3 className="text-3xl font-light tracking-tight">REPORT FOUND</h3>
      </section>

      <section className="flex min-h-[50vh] flex-col items-center justify-center border-t border-black/10 px-6 py-24 text-center">
        <h2 className="text-xs font-semibold tracking-widest text-black/40 uppercase mb-2">SECTION 04</h2>
        <h3 className="text-3xl font-light tracking-tight">HOW BACK2U WORKS</h3>
      </section>

      <footer className="flex min-h-[30vh] flex-col items-center justify-center border-t border-black/10 bg-black text-white px-6 py-24 text-center">
        <h2 className="text-xs font-semibold tracking-widest text-white/40 uppercase mb-2">SECTION 05</h2>
        <h3 className="text-2xl font-light tracking-tight">FOOTER</h3>
      </footer>
    </main>
  );
}
