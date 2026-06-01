import { Link } from 'react-router-dom';
import {
  CalendarIcon, ChartBarIcon, LinkIcon, BoltIcon,
  CheckIcon, ArrowRightIcon,
} from '@heroicons/react/24/outline';

const features = [
  { icon: LinkIcon, title: 'Connect All Platforms', desc: 'Link Facebook, Instagram, Twitter/X, LinkedIn, TikTok in one place.' },
  { icon: CalendarIcon, title: 'Visual Scheduler', desc: 'Plan your content with a drag-and-drop calendar. Schedule weeks ahead.' },
  { icon: BoltIcon, title: 'Publish Instantly', desc: 'Post to all connected accounts with one click, at the perfect time.' },
  { icon: ChartBarIcon, title: 'Insights & Analytics', desc: 'Track likes, reach, engagement and growth across all platforms.' },
];

const platforms = [
  { name: 'Facebook', color: '#1877F2', icon: '𝐟' },
  { name: 'Instagram', color: '#E1306C', icon: '📷' },
  { name: 'Twitter/X', color: '#000', icon: '𝕏' },
  { name: 'LinkedIn', color: '#0A66C2', icon: 'in' },
  { name: 'TikTok', color: '#000', icon: '♪' },
];

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">Orciid Social</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-gray-900 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors">
              Log in
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-100 rounded-full text-primary-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            7-day free trial — No credit card required
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            All your social media,{' '}
            <span className="bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              one dashboard
            </span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Schedule posts, analyze performance, and manage all your social media accounts from a single beautiful dashboard.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn-primary text-base px-8 py-3">
              Start for free
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link to="/pricing" className="btn-secondary text-base px-8 py-3">
              View pricing
            </Link>
          </div>

          {/* Platform icons */}
          <div className="flex items-center justify-center gap-4 mt-12">
            <span className="text-sm text-gray-400">Connect with:</span>
            {platforms.map((p) => (
              <div
                key={p.name}
                title={p.name}
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: p.color }}
              >
                {p.icon}
              </div>
            ))}
            <span className="text-sm text-gray-400">& more</span>
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="px-4 pb-20">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-2xl shadow-gray-200/60">
            <div className="bg-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-3">
                <div className="bg-white rounded-md px-3 py-1 text-xs text-gray-400 text-center">orciid.online/dashboard</div>
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="bg-white flex" style={{ height: 380 }}>
              {/* Sidebar mock */}
              <div className="w-52 bg-white border-r border-gray-100 p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600" />
                  <span className="font-bold text-sm">Orciid</span>
                </div>
                <div className="w-full h-8 bg-primary-600 rounded-lg" />
                {['Dashboard', 'Posts', 'Calendar', 'Analytics', 'Accounts'].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 px-2 py-2 rounded-lg ${i === 0 ? 'bg-primary-50' : ''}`}>
                    <div className={`w-4 h-4 rounded ${i === 0 ? 'bg-primary-400' : 'bg-gray-200'}`} />
                    <span className={`text-xs font-medium ${i === 0 ? 'text-primary-700' : 'text-gray-500'}`}>{item}</span>
                  </div>
                ))}
              </div>
              {/* Content mock */}
              <div className="flex-1 p-5 bg-gray-50">
                <div className="grid grid-cols-4 gap-3 mb-5">
                  {[['Total Posts', '124', 'text-blue-600'], ['Scheduled', '8', 'text-amber-600'], ['Published', '116', 'text-green-600'], ['Accounts', '5', 'text-purple-600']].map(([label, val, color]) => (
                    <div key={label} className="bg-white rounded-xl p-3 border border-gray-100">
                      <div className={`text-xl font-bold ${color}`}>{val}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 bg-white rounded-xl p-4 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 mb-3">Engagement (30 days)</div>
                    <div className="flex items-end gap-2 h-20">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                        <div key={i} className="flex-1 bg-primary-100 rounded-t" style={{ height: `${h}%` }}>
                          <div className="w-full bg-primary-500 rounded-t" style={{ height: `${h * 0.6}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="text-xs font-semibold text-gray-500 mb-3">Upcoming</div>
                    {['Today 3pm', 'Tomorrow 9am', 'Wed 12pm'].map((t) => (
                      <div key={t} className="flex items-center gap-2 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-primary-400" />
                        <span className="text-xs text-gray-500">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to grow</h2>
            <p className="text-lg text-gray-500">All the tools to manage, schedule, and analyze your social presence.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free for 7 days. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className={`card p-6 relative ${plan.popular ? 'border-primary-500 border-2 shadow-lg shadow-primary-100' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary-600 text-white text-xs font-semibold rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm mb-4">{plan.desc}</p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-gray-900">${plan.yearlyPrice}</span>
                  <span className="text-gray-500 text-sm">/month</span>
                  <div className="text-xs text-gray-400 mt-0.5">billed yearly (save ${(plan.price - plan.yearlyPrice) * 12}/yr)</div>
                </div>
                <Link
                  to="/register"
                  className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-all mb-6 ${
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
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-600 to-purple-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-primary-100 text-lg mb-8">Join thousands of brands managing their social media with Orciid Social.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-base">
            Start your free trial
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} Orciid Social — orciid.online</p>
      </footer>
    </div>
  );
}
