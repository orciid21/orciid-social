import { Link } from 'react-router-dom';
import {
  CalendarIcon, ChartBarIcon, LinkIcon, BoltIcon,
  CheckIcon, ArrowRightIcon, UserGroupIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { PLATFORM_LOGOS } from '../utils/platforms';
import ProductShowcase from '../components/landing/ProductShowcase';
import FaqSection from '../components/landing/FaqSection';
import { Reveal, RevealWords } from '../components/landing/Reveal';

// Accent colours come from the ORCIID brand palette (Cobalt / Iris / Electric / Coral).
const features = [
  { icon: LinkIcon, title: 'Every channel, one place', desc: 'Facebook Pages, Instagram, Threads, X, LinkedIn, TikTok and YouTube — connected side by side, several accounts per platform.', tint: 'bg-primary-50 text-primary-600' },
  { icon: CalendarIcon, title: 'Plan a month in minutes', desc: 'A visual calendar and queue per channel, so you always know what goes out and when.', tint: 'bg-iris-light/15 text-iris-dark' },
  { icon: BoltIcon, title: 'Publish or schedule', desc: 'Write once, tailor per network, then send it now or park it in the queue. We handle the rest.', tint: 'bg-electric/20 text-electric-dark' },
  { icon: ChartBarIcon, title: 'See what actually works', desc: 'Likes, comments, impressions and clicks per post — so the next one performs better.', tint: 'bg-coral-light/25 text-coral-dark' },
];

const steps = [
  { n: '01', title: 'Connect your accounts', desc: 'Sign in to each network once. Add as many accounts per platform as you manage.' },
  { n: '02', title: 'Compose & schedule', desc: 'One editor, live previews for every network, and a calendar to place it perfectly.' },
  { n: '03', title: 'Review & measure', desc: 'Approvals for teams, then per-channel numbers once your posts are live.' },
];

const platformOrder = ['FACEBOOK', 'INSTAGRAM', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'THREADS', 'YOUTUBE'];

const plans = [
  {
    name: 'Starter', price: 19, yearlyPrice: 15,
    desc: 'Perfect for creators & freelancers',
    features: ['5 social accounts', '30 scheduled posts/month', 'Basic analytics', '1 workspace'],
    cta: 'Start 7-day free trial',
    popular: false,
  },
  {
    name: 'Pro', price: 49, yearlyPrice: 39,
    desc: 'For growing brands & agencies',
    features: ['25 social accounts', 'Unlimited scheduled posts', 'Advanced analytics', '5 workspaces', 'Team collaboration'],
    cta: 'Start 7-day free trial',
    popular: true,
  },
  {
    name: 'Agency', price: 99, yearlyPrice: 79,
    desc: 'For agencies managing many clients',
    features: ['Unlimited accounts', 'Unlimited posts', 'White-label reports', 'Unlimited workspaces', 'Priority support'],
    cta: 'Contact sales',
    popular: false,
  },
];

/* A miniature of the real product, used as the hero visual. */
function DashboardMock() {
  const bars = [38, 62, 44, 78, 52, 88, 66, 82, 58, 94, 72, 86];
  return (
    <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-primary-900/10 overflow-hidden">
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100">
        <span className="w-2.5 h-2.5 rounded-full bg-coral" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
        <span className="w-2.5 h-2.5 rounded-full bg-electric" />
        <div className="flex-1 mx-3 rounded-md bg-gray-50 py-1 text-center text-[10px] text-gray-400">
          orciid.online/dashboard
        </div>
      </div>

      <div className="p-4 bg-gray-50/70">
        <div className="grid grid-cols-3 gap-2.5 mb-3">
          {[
            ['Impressions', '48.2k', '+21%', 'text-primary-600'],
            ['Engagement', '6.1%', '+4.3%', 'text-iris-dark'],
            ['Scheduled', '24', 'this week', 'text-electric-dark'],
          ].map(([label, val, delta, tone]) => (
            <div key={label} className="rounded-xl bg-white border border-gray-100 p-3">
              <div className="text-[10px] text-gray-500">{label}</div>
              <div className="text-lg font-bold text-gray-900 leading-tight mt-0.5">{val}</div>
              <div className={`text-[10px] font-semibold ${tone}`}>{delta}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-white border border-gray-100 p-3.5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-gray-700">Performance</span>
            <span className="text-[10px] text-gray-400">Last 30 days</span>
          </div>
          <div className="flex items-end gap-1.5 h-24">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t bg-gray-100 relative" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 w-full rounded-t bg-gradient-to-t from-primary-600 to-iris"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 rounded-xl bg-white border border-gray-100 p-3.5">
          <div className="text-[11px] font-semibold text-gray-700 mb-2.5">Up next</div>
          {[
            ['Today, 3:00 PM', 'INSTAGRAM'],
            ['Tomorrow, 9:00 AM', 'FACEBOOK'],
            ['Thursday, 12:00 PM', 'LINKEDIN'],
          ].map(([when, pf]) => (
            <div key={when} className="flex items-center gap-2.5 py-1.5">
              <img src={PLATFORM_LOGOS[pf]} alt="" className="w-5 h-5 rounded object-contain" />
              <span className="text-[11px] text-gray-600 flex-1">{when}</span>
              <span className="text-[9px] font-semibold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">
                Queued
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Announcement bar */}
      <div className="bg-brand-gradient text-white text-center text-xs sm:text-sm py-2 px-4">
        Manage every social account your brand owns —{' '}
        <Link to="/register" className="underline underline-offset-2 font-semibold">
          start free for 7 days
        </Link>
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/brand/orciid-wordmark-black.png" alt="ORCIID" className="h-5 w-auto" draggable="false" />
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#how" className="hover:text-gray-900 transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* soft brand washes */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 w-[36rem] h-[36rem] rounded-full bg-primary-100/70 blur-3xl" />
          <div className="absolute top-32 -right-32 w-[34rem] h-[34rem] rounded-full bg-iris-light/25 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[26rem] h-[26rem] rounded-full bg-electric/10 blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 lg:pt-24 lg:pb-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div>
            <Reveal immediate as="span" className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/80 border border-primary-100 rounded-full text-primary-700 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-600" />
              7-day free trial — no credit card
            </Reveal>

            <h1 className="mt-6 text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-gray-900 leading-[1.08] tracking-tight">
              <RevealWords immediate start={120} text="Where brands and audiences connect" highlight="audiences" />
            </h1>

            <Reveal immediate delay={520} as="p" className="mt-6 text-lg text-gray-500 leading-relaxed max-w-xl">
              Plan, publish and measure across every network from one dashboard —
              with as many accounts per platform as your brand actually runs.
            </Reveal>

            <Reveal immediate delay={640} className="mt-8 flex flex-col sm:flex-row gap-3 sm:items-center">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-semibold px-7 py-3.5 text-base transition-colors"
              >
                Start for free
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center rounded-full bg-white hover:bg-gray-50 text-gray-800 font-semibold px-7 py-3.5 text-base border border-gray-200 transition-colors"
              >
                See pricing
              </Link>
            </Reveal>

            <Reveal immediate delay={760} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <CheckIcon className="w-4 h-4 text-primary-600" /> Multiple accounts per platform
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UserGroupIcon className="w-4 h-4 text-primary-600" /> Team approvals
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4 text-primary-600" /> Auto-scheduling
              </span>
            </Reveal>
          </div>

          {/* Product visual */}
          <Reveal immediate delay={300} className="relative lg:pl-6">
            <DashboardMock />
            {/* floating confirmation card */}
            <div className="hidden sm:flex absolute -bottom-6 -left-2 lg:left-2 items-center gap-3 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-900/5 px-4 py-3">
              <span className="w-9 h-9 rounded-full bg-electric/25 flex items-center justify-center">
                <CheckIcon className="w-5 h-5 text-electric-dark" strokeWidth={3} />
              </span>
              <div>
                <div className="text-xs font-semibold text-gray-900">Published to 4 channels</div>
                <div className="text-[11px] text-gray-500">a few seconds ago</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Platforms strip */}
      <section className="border-y border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4 py-10 text-center">
          <Reveal as="p" className="text-sm font-medium text-gray-500">Publish everywhere your audience already is</Reveal>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {platformOrder.map((p, i) => (
              <Reveal key={p} delay={i * 70} as="span" className="inline-block">
              <img
                src={PLATFORM_LOGOS[p]}
                alt={p}
                title={p}
                className="h-8 w-8 object-contain opacity-70 hover:opacity-100 transition-opacity"
              />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 lg:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Everything you need to run social properly
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Built for brands and agencies juggling more than one account — and more than one client.
            </p>
          </Reveal>

          <div className="mt-12 grid sm:grid-cols-2 gap-5">
            {features.map(({ icon: Icon, title, desc, tint }, i) => (
              <Reveal
                key={title}
                delay={i * 100}
                className="rounded-2xl border border-gray-100 bg-white p-6 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-900/5 transition-all"
              >
                <span className={`inline-flex w-11 h-11 rounded-xl items-center justify-center ${tint}`}>
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-semibold text-gray-900 text-lg">{title}</h3>
                <p className="mt-2 text-gray-500 text-sm leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase />

      {/* How it works */}
      <section id="how" className="py-20 lg:py-24 px-4 bg-gray-50/70 border-y border-gray-100">
        <div className="max-w-6xl mx-auto">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Up and running in three steps</h2>
            <p className="mt-4 text-lg text-gray-500">No migration, no setup calls. Connect and publish the same day.</p>
          </Reveal>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {steps.map(({ n, title, desc }, i) => (
              <Reveal key={n} delay={i * 100} className="rounded-2xl bg-white border border-gray-100 p-6">
                <span className="text-sm font-bold text-primary-600">{n}</span>
                <h3 className="mt-3 font-semibold text-gray-900 text-lg">{title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 lg:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-500">Start free for 7 days. Cancel anytime.</p>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <Reveal
                key={plan.name}
                delay={i * 100}
                className={`rounded-2xl bg-white p-6 relative ${
                  plan.popular
                    ? 'border-2 border-primary-600 shadow-xl shadow-primary-900/10'
                    : 'border border-gray-100'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.yearlyPrice}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                  <div className="text-xs text-gray-400 mt-0.5">
                    billed yearly (save ${(plan.price - plan.yearlyPrice) * 12}/yr)
                  </div>
                </div>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-full font-semibold text-sm transition-all mb-6 ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-primary-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      {/* CTA */}
      <section className="px-4 pb-20">
        <Reveal className="max-w-6xl mx-auto rounded-3xl bg-brand-gradient px-6 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Ready when you are</h2>
          <p className="mt-4 text-white/85 text-lg max-w-xl mx-auto">
            Connect your first channel in under a minute and schedule today&apos;s post before your coffee gets cold.
          </p>
          <Link
            to="/register"
            className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-full hover:bg-primary-50 transition-colors text-base"
          >
            Start your free trial
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-4 py-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/brand/orciid-wordmark-black.png" alt="ORCIID" className="h-4 w-auto opacity-70" draggable="false" />
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
            <Link to="/legal" className="hover:text-gray-900 transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy</Link>
            <Link to="/legal#data-deletion" className="hover:text-gray-900 transition-colors">Data deletion</Link>
            <Link to="/login" className="hover:text-gray-900 transition-colors">Log in</Link>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} ORCIID</p>
        </div>
      </footer>
    </div>
  );
}
