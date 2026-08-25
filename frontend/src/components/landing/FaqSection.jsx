import { useState } from 'react';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';

/* Questions mirror what people actually ask social tools (channels, trials,
   billing, collaboration); the answers are ORCIID's own and describe only
   what the product really does today. */
const faqs = [
  {
    q: 'What is ORCIID Social used for?',
    a: 'It is one place to run every social account your brand owns. Connect your channels, write a post once, tailor it per network, then publish immediately or drop it into a schedule. Once posts are live, you can see how each one performed without opening seven different apps.',
  },
  {
    q: 'Which networks can I connect?',
    a: 'Facebook Pages, Instagram (Business and Creator accounts), Threads, X / Twitter, LinkedIn, TikTok and YouTube. You connect each network once by signing in to it, and your channels then appear side by side in the dashboard.',
  },
  {
    q: 'Can I connect more than one account on the same platform?',
    a: 'Yes. A channel is a single account on a single network, and you can add as many as your plan allows — several Instagram accounts, several Facebook Pages, and so on. When you press “Add another account”, we take you to a fresh sign-in so you can choose a different account rather than reconnecting the one already logged in.',
  },
  {
    q: 'Do I need to install anything?',
    a: 'No. ORCIID runs in your browser, so there is nothing to download, install or keep updated. Sign in from any computer and your channels, drafts and schedule are exactly where you left them.',
  },
  {
    q: 'Is there a free trial, and do I need a credit card?',
    a: 'Every new account starts on a 7-day free trial and no card is needed to begin. You can connect channels and publish during the trial; if you decide it is not for you, simply stop — nothing is charged automatically before you choose a plan.',
  },
  {
    q: 'Can my team review posts before they go live?',
    a: 'Yes. Invite your teammates into a shared workspace and give them a role. Posts created by members arrive in an approvals queue, where an owner or admin can approve them — sending them straight out or into the schedule — or send them back as a draft with nothing published in the meantime.',
  },
  {
    q: 'What do the analytics actually show?',
    a: 'For published posts you get the numbers that matter per channel — likes, comments, impressions, shares and clicks — grouped by day so you can see which posts earned attention and repeat what worked.',
  },
  {
    q: 'Can I change or cancel my plan later?',
    a: 'Yes. Plans are billed monthly or yearly, and you can move up or down as the number of channels you manage changes. Yearly billing costs less per month than paying monthly.',
  },
];

/* Deterministic star positions — a fixed list keeps the field stable between
   renders instead of twinkling to a new layout on every paint. */
const stars = [
  [4, 12, 1], [11, 46, 2], [7, 78, 1], [16, 26, 1], [22, 63, 2], [27, 9, 1],
  [31, 88, 1], [36, 38, 2], [41, 70, 1], [46, 17, 1], [52, 52, 2], [57, 84, 1],
  [61, 30, 1], [66, 61, 2], [71, 14, 1], [76, 44, 1], [81, 74, 2], [86, 22, 1],
  [90, 55, 1], [94, 86, 2], [97, 34, 1], [13, 92, 1], [44, 95, 1], [68, 5, 1],
];

export default function FaqSection() {
  const [open, setOpen] = useState(1);

  return (
    <section id="faq" className="px-4 pb-20">
      <div className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl px-6 py-16 sm:py-20 bg-[linear-gradient(160deg,#5B53FF_0%,#632CDA_45%,#2C2953_100%)]">
        {/* star field */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {stars.map(([left, top, size], i) => (
            <span
              key={i}
              className="absolute rounded-full bg-white"
              style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, opacity: size === 2 ? 0.8 : 0.45 }}
            />
          ))}
        </div>

        <div className="relative text-center">
          <span className="inline-flex items-center rounded-full border border-white/30 px-4 py-1.5 text-xs font-semibold text-white/90">
            Support questions
          </span>
          <h2 className="mt-6 text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.25] tracking-tight">
            Everything you need to know
            <br className="hidden sm:block" /> about ORCIID Social
          </h2>
        </div>

        <div className="relative mt-10 max-w-3xl mx-auto space-y-3">
          {faqs.map(({ q, a }, i) => {
            const isOpen = open === i;
            return (
              <div key={q} className="rounded-2xl bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-4 text-left px-5 py-4 hover:bg-gray-50/70 transition-colors"
                >
                  <span className="flex-1 font-semibold text-gray-900 text-sm sm:text-base">
                    {i + 1}. {q}
                  </span>
                  <span className="shrink-0 text-primary-600">
                    {isOpen ? <MinusIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />}
                  </span>
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 -mt-1 text-sm text-gray-500 leading-relaxed">{a}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
