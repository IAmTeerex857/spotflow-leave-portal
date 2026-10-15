import FlowEngine from '@/components/landing/flow/FlowEngine';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { SlideButton } from '@/components/ui/MotionButtons';

// Fade the scene into the page on every side.
const SCENE_MASK =
  'linear-gradient(to right, transparent, #000 9%, #000 91%, transparent), linear-gradient(to bottom, transparent, #000 14%, #000 80%, transparent)';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-36 sm:pt-44">
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
        <h1 className="text-balance text-[clamp(40px,6.4vw,72px)] font-bold leading-[1.05] tracking-[-0.035em] text-zinc-100">
          Request leave in seconds.
          <br />
          <span className="text-zinc-500">We&rsquo;ll handle the flow.</span>
        </h1>
        <p className="mt-6 max-w-[34rem] text-[17px] leading-relaxed text-zinc-400">
          Send your request, it reaches the right approver, and approved time off lands on your calendar.
          One place for leave across Spotflow.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          <SlideButton href="/login" variant="primary" label="Sign in with Google" icon={<GoogleIcon size={16} />} />
          <p className="text-xs text-zinc-500">Use your @spotflow.one work account</p>
        </div>
      </div>

      <div
        className="relative mx-auto -mt-4 h-[340px] max-w-[1400px] sm:-mt-8 sm:h-[500px] lg:h-[540px]"
        style={{ maskImage: SCENE_MASK, WebkitMaskImage: SCENE_MASK, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}
      >
        <FlowEngine className="h-full w-full" />
      </div>
    </section>
  );
}
