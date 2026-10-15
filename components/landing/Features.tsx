import { blobatarUri } from 'blobatar/uri';

const GREEN = '#3ddc97';

function Card({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-white/[0.06] bg-[#111114] p-6 transition-colors duration-300 hover:border-white/[0.11]">
      <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.015]" aria-hidden="true">
        {children}
      </div>
      <h3 className="mt-6 text-[15px] font-semibold text-zinc-100">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

function CalendarVisual() {
  return (
    <div className="w-[78%]">
      <div className="mb-2 flex items-center justify-between text-[11px] text-zinc-500">
        <span>November</span>
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />Google Calendar</span>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: 14 }, (_, i) => {
          const on = i >= 9 && i <= 11;
          return (
            <span
              key={i}
              className={`h-6 rounded-md border transition-all duration-500 ${on ? 'group-hover:scale-105' : ''}`}
              style={{
                background: on ? 'rgba(61,220,151,0.8)' : i % 7 >= 5 ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.04)',
                borderColor: on ? 'rgba(61,220,151,0.9)' : 'rgba(255,255,255,0.05)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RoutingVisual() {
  const chip = 'whitespace-nowrap rounded-full border border-white/[0.08] bg-[#17171c] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 sm:px-3';
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={blobatarUri('Zainab Musa', { background: false })} alt="" className="h-9 w-9" />
      <span className="h-px w-3 sm:w-5" style={{ background: GREEN, opacity: 0.6 }} />
      <span className={chip}>Line manager</span>
      <span className="h-px w-3 sm:w-5" style={{ background: GREEN, opacity: 0.6 }} />
      <span className={`${chip} border-violet-400/25 text-violet-200`}>Eng. manager</span>
      <span className="h-px w-3 sm:w-5" style={{ background: GREEN, opacity: 0.6 }} />
      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(61,220,151,0.15)', border: `1px solid ${GREEN}` }}>
        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.2l2.3 2.3 4.7-5" fill="none" stroke={GREEN} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </div>
  );
}

function BalanceVisual() {
  const r = 46;
  const circumference = 2 * Math.PI * r;
  const used = 6 / 20;
  const pending = 2 / 20;
  return (
    <div className="flex items-center gap-6">
      <svg width="112" height="112" viewBox="0 0 112 112" className="-rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle cx="56" cy="56" r={r} fill="none" stroke="#8b5cf6" strokeOpacity="0.55" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${circumference * (used + pending)} ${circumference}`} />
        <circle cx="56" cy="56" r={r} fill="none" stroke={GREEN} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${circumference * used} ${circumference}`} />
      </svg>
      <div className="text-[12px] leading-6 text-zinc-500">
        <p><span className="text-[22px] font-semibold text-zinc-100">14</span> days left</p>
        <p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full" style={{ background: GREEN }} />6 used</p>
        <p className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-violet-400" />2 pending</p>
      </div>
    </div>
  );
}

function HolidayVisual() {
  const days = [
    { d: 'Mon', n: 28, kind: 'work' },
    { d: 'Tue', n: 29, kind: 'work' },
    { d: 'Wed', n: 30, kind: 'work' },
    { d: 'Thu', n: 1, kind: 'holiday' },
    { d: 'Fri', n: 2, kind: 'work' },
  ];
  return (
    <div className="w-[82%]">
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((day) => (
          <div
            key={day.d}
            className="flex flex-col items-center rounded-lg border py-2.5"
            style={{
              borderColor: day.kind === 'holiday' ? 'rgba(245,158,11,0.35)' : 'rgba(61,220,151,0.35)',
              background: day.kind === 'holiday' ? 'rgba(245,158,11,0.07)' : 'rgba(61,220,151,0.08)',
            }}
          >
            <span className="text-[10px] text-zinc-500">{day.d}</span>
            <span className={`text-[15px] font-semibold ${day.kind === 'holiday' ? 'text-amber-300/80 line-through' : 'text-zinc-100'}`}>{day.n}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[12px] text-zinc-500">
        <span className="font-semibold text-zinc-200">4 working days</span> · Independence Day skipped
      </p>
    </div>
  );
}

export default function Features() {
  return (
    <section id="features" className="relative scroll-mt-24 px-4 pb-28 sm:pb-36">
      <div className="mx-auto max-w-5xl">
        <p className="text-[13px] font-medium text-[#3ddc97]">Features</p>
        <h2 className="mt-3 max-w-xl text-[clamp(30px,4vw,44px)] font-semibold leading-[1.1] tracking-[-0.03em] text-zinc-100">
          The details handled, so nobody has to chase.
        </h2>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          <Card title="Lands on Google Calendar" body="Approved leave is added to your Google Calendar automatically, and removed if you cancel before it starts.">
            <CalendarVisual />
          </Card>
          <Card title="Routed to the right approver" body="Requests go straight to whoever approves for your team. Engineering leave gets a second check from the Engineering Manager.">
            <RoutingVisual />
          </Card>
          <Card title="Your balance, always current" body="See what you’ve used, what’s pending and what’s left before you ask. Every type of leave counts toward your 20 days.">
            <BalanceVisual />
          </Card>
          <Card title="Knows the public holidays" body="Weekends and Nigerian public holidays are skipped when days are counted, so the number you see is the number that’s deducted.">
            <HolidayVisual />
          </Card>
        </div>
      </div>
    </section>
  );
}
