import { useEffect, useRef, useState } from 'react';
import { PLATFORM_LOGOS } from '../../utils/platforms';

/* Three miniatures of the real product. The row slides sideways as the page
   scrolls through this section (the section is taller than the viewport and the
   inner panel sticks), ending on a short statement — so the movement is driven
   by the reader rather than a timer. Each screen is plain CSS, not a
   screenshot, so it stays crisp and weighs nothing. */

const Frame = ({ label, children }) => (
  <div className="w-[560px] sm:w-[620px] shrink-0 rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-900/5 overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
      <span className="w-2 h-2 rounded-full bg-coral" />
      <span className="w-2 h-2 rounded-full bg-gray-200" />
      <span className="w-2 h-2 rounded-full bg-electric" />
      <span className="ml-2 text-[11px] font-semibold text-gray-500">{label}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

function AnalyticsScreen() {
  const series = [34, 52, 41, 68, 57, 79, 63, 88, 71, 94, 80, 91];
  return (
    <Frame label="Analytics">
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {[
          ['Impressions', '48,204', '+21%'],
          ['Engagement', '6.1%', '+4.3%'],
          ['Clicks', '1,932', '+12%'],
          ['Followers', '+486', 'this month'],
        ].map(([k, v, d]) => (
          <div key={k} className="rounded-xl border border-gray-100 p-2.5">
            <div className="text-[10px] text-gray-500">{k}</div>
            <div className="text-base font-bold text-gray-900 leading-tight">{v}</div>
            <div className="text-[10px] font-semibold text-primary-600">{d}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-gray-100 p-3.5 mb-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold text-gray-700">Reach over time</span>
          <span className="text-[10px] text-gray-400">Last 30 days</span>
        </div>
        <div className="flex items-end gap-1.5 h-24">
          {series.map((h, i) => (
            <div key={i} className="flex-1 h-full rounded-t bg-gray-100 relative">
              <div
                className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-primary-600 to-iris"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 p-3.5">
        <div className="text-[11px] font-semibold text-gray-700 mb-2.5">Top posts</div>
        {[
          ['INSTAGRAM', 'Behind the scenes of our new collection', '2.4k', '312'],
          ['LINKEDIN', 'How we cut publishing time by half', '1.1k', '88'],
          ['FACEBOOK', 'Ramadan campaign — day 3 recap', '940', '64'],
        ].map(([pf, text, reach, eng]) => (
          <div key={text} className="flex items-center gap-2.5 py-1.5">
            <img src={PLATFORM_LOGOS[pf]} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
            <span className="text-[11px] text-gray-600 flex-1 truncate">{text}</span>
            <span className="text-[10px] text-gray-500 tabular-nums">{reach}</span>
            <span className="text-[10px] font-semibold text-primary-600 tabular-nums w-8 text-right">{eng}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function ScheduleScreen() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // [dayIndex, rowIndex, platform, time, tone]
  const posts = [
    [0, 0, 'INSTAGRAM', '09:00', 'bg-primary-50 text-primary-700 border-primary-100'],
    [1, 1, 'FACEBOOK', '13:30', 'bg-iris-light/15 text-iris-dark border-iris-light/30'],
    [2, 0, 'LINKEDIN', '10:00', 'bg-electric/15 text-electric-dark border-electric/30'],
    [3, 2, 'TIKTOK', '18:00', 'bg-coral-light/20 text-coral-dark border-coral-light/40'],
    [4, 1, 'THREADS', '11:15', 'bg-primary-50 text-primary-700 border-primary-100'],
    [5, 0, 'YOUTUBE', '20:00', 'bg-iris-light/15 text-iris-dark border-iris-light/30'],
  ];
  return (
    <Frame label="Content calendar">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-gray-900">March 2026</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2.5 py-1">Week</span>
          <span className="text-[10px] text-gray-400 px-1">Month</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <div key={d} className="text-[10px] font-semibold text-gray-500 text-center pb-1">{d}</div>
        ))}
        {days.map((d, col) => (
          <div key={d} className="rounded-lg bg-gray-50/70 border border-gray-100 h-28 p-1 flex flex-col gap-1">
            {[0, 1, 2].map((row) => {
              const hit = posts.find(([c, r]) => c === col && r === row);
              if (!hit) return <div key={row} className="h-7" />;
              const [, , pf, time, tone] = hit;
              return (
                <div key={row} className={`h-7 rounded-md border ${tone} flex items-center gap-1 px-1`}>
                  <img src={PLATFORM_LOGOS[pf]} alt="" className="w-3.5 h-3.5 rounded-sm object-contain" />
                  <span className="text-[9px] font-semibold">{time}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500">
        <span className="w-2 h-2 rounded-full bg-primary-500" /> Scheduled
        <span className="w-2 h-2 rounded-full bg-gray-300 ml-3" /> Draft
        <span className="ml-auto text-gray-400">Drag any post to reschedule</span>
      </div>
    </Frame>
  );
}

function OverviewScreen() {
  return (
    <Frame label="Dashboard overview">
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-3">
          <div className="rounded-xl border border-gray-100 p-3.5">
            <div className="text-[11px] font-semibold text-gray-700 mb-2.5">Publishing queue</div>
            {[
              ['INSTAGRAM', 'Today · 3:00 PM', 'Scheduled', 'text-primary-700 bg-primary-50'],
              ['FACEBOOK', 'Tomorrow · 9:00 AM', 'Scheduled', 'text-primary-700 bg-primary-50'],
              ['LINKEDIN', 'Thu · 12:00 PM', 'Needs approval', 'text-coral-dark bg-coral-light/20'],
              ['THREADS', 'Fri · 5:30 PM', 'Draft', 'text-gray-600 bg-gray-100'],
            ].map(([pf, when, state, tone]) => (
              <div key={when} className="flex items-center gap-2.5 py-1.5">
                <img src={PLATFORM_LOGOS[pf]} alt="" className="w-5 h-5 rounded object-contain shrink-0" />
                <span className="text-[11px] text-gray-600 flex-1">{when}</span>
                <span className={`text-[9px] font-semibold rounded-full px-2 py-0.5 ${tone}`}>{state}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-gray-100 p-3.5">
            <div className="text-[11px] font-semibold text-gray-700 mb-2">This week</div>
            <div className="flex items-end gap-2 h-16">
              {[45, 70, 55, 85, 60, 92, 74].map((h, i) => (
                <div key={i} className="flex-1 h-full rounded-t bg-gray-100 relative">
                  <div className="absolute bottom-0 w-full rounded-t bg-primary-500/80" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-gray-100 p-3.5">
            <div className="text-[11px] font-semibold text-gray-700 mb-2.5">Channels</div>
            {['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE'].map((pf) => (
              <div key={pf} className="flex items-center gap-2 py-1">
                <img src={PLATFORM_LOGOS[pf]} alt="" className="w-4 h-4 rounded object-contain" />
                <span className="text-[10px] text-gray-500 capitalize flex-1">{pf.toLowerCase()}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-electric-dark" />
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-brand-gradient p-3.5 text-white">
            <div className="text-[10px] opacity-90">Posts this month</div>
            <div className="text-2xl font-bold leading-tight">128</div>
            <div className="text-[10px] opacity-90">across 9 channels</div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

const ScreenSet = () => (
  <>
    <AnalyticsScreen />
    <ScheduleScreen />
    <OverviewScreen />
  </>
);

/* Closing statement that rides at the end of the track, like the reference. */
const ClosingPanel = () => (
  <div className="w-[520px] shrink-0 flex items-center px-10">
    <p className="text-xl sm:text-2xl text-gray-500 leading-relaxed">
      As your brand grows, the number of accounts grows with it.
      <span className="text-gray-900 font-semibold"> ORCIID scales with you</span> —
      add channels, invite teammates and hand off approvals without changing how
      you work.
    </p>
  </div>
);

export default function ProductShowcase() {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [shift, setShift] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const pinned = window.matchMedia('(min-width: 1024px)').matches;
    if (reduced || !pinned) return; // small screens scroll the row natively

    let frame = 0;
    const update = () => {
      frame = 0;
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const travel = Math.max(0, track.scrollWidth - window.innerWidth + 48);
      const distance = section.offsetHeight - window.innerHeight;
      const progress = distance <= 0 ? 0 : (window.scrollY - section.offsetTop) / distance;
      setShift(Math.min(1, Math.max(0, progress)) * travel);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <section ref={sectionRef} className="lg:h-[280vh]">
      <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col justify-center py-20 lg:py-0 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <span className="inline-flex items-center rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold text-gray-600">
            Tools that power your workflow
          </span>
          <h2 className="mt-6 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-gray-900 leading-[1.25] tracking-tight">
            One workspace for planning,
            <br className="hidden sm:block" /> publishing and{' '}
            <span className="text-primary-600">proving the results</span>
          </h2>
        </div>

        {/* The row itself. On large screens it is moved by scroll position; on
            small screens it stays a plain horizontal scroller. */}
        <div className="relative mt-12 lg:mt-14 overflow-x-auto lg:overflow-visible">
          <div
            ref={trackRef}
            className="flex gap-6 px-4 lg:px-10 w-max will-change-transform"
            style={{ transform: `translate3d(-${shift}px,0,0)` }}
          >
            <ScreenSet />
            <ClosingPanel />
          </div>
          <div className="hidden lg:block pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-white to-transparent" />
          <div className="hidden lg:block pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-white to-transparent" />
        </div>
      </div>
    </section>
  );
}
