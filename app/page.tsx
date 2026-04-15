import LandingNavbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';

export default function LandingPage() {
  return (
    <main style={{ background: 'var(--bg-base)', minHeight: '100vh' }}>
      <LandingNavbar />
      <Hero />
    </main>
  );
}
