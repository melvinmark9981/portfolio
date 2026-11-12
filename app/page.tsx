import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Resume from "@/components/Resume";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import SwarmRebuild from "@/components/SwarmRebuild";
// Fallback effect (unmounted): import SwarmCursor from "@/components/SwarmCursor" and swap it in below.

export default function Home() {
  return (
    <main className="relative overflow-x-hidden">
      <SwarmRebuild />
      <Navbar />
      <Hero />
      <About />
      <Projects />
      <Resume />
      <Contact />
      <Footer />
    </main>
  );
}
