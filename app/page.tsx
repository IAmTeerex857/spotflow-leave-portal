import LandingNavbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Features from '@/components/landing/Features';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-[#0c0c0e]">
      <LandingNavbar />
      <Hero />
      <HowItWorks />
      <Features />
      <Footer />
    </main>
  );
}
