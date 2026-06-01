import { Link } from 'react-router-dom';
import { CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const PLANS = [
  { name: 'Starter', monthly: 19, yearly: 15, features: ['5 social accounts', '30 posts/month', 'Basic analytics', '1 workspace', 'Email support'] },
  { name: 'Pro', monthly: 49, yearly: 39, popular: true, features: ['25 social accounts', 'Unlimited posts', 'Advanced analytics', '5 workspaces', 'Team collaboration', 'Priority support'] },
  { name: 'Agency', monthly: 99, yearly: 79, features: ['Unlimited accounts', 'Unlimited posts', 'White-label reports', 'Unlimited workspaces', 'Dedicated account manager'] },
];

export default function PricingPage() {
  const [interval, setInterval] = useState('yearly');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeftIcon className="w-4 h-4" /> Back to home
        </Link>
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Simple, transparent pricing</h1>
          <p className="text-lg text-gray-500 mb-6">Start with a 7-day free trial. No credit card required.</p>
          <div className="inline-flex items-center gap-3 bg-white rounded-xl p-1 border border-gray-200">
            <button onClick={() => setInterval('monthly')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${interval === 'monthly' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600'}`}>Monthly</button>
            <button onClick={() => setInterval('yearly')} className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${interval === 'yearly' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600'}`}>
              Yearly <span className="text-green-500 font-semibold">-20%</span>
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const price = interval === 'yearly' ? plan.yearly : plan.monthly;
            return (
              <div key={plan.name} className={`card p-6 relative ${plan.popular ? 'border-primary-500 border-2 shadow-xl shadow-primary-100' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-600 text-white text-xs font-bold rounded-full">Most Popular</div>
                )}
                <h3 className="font-bold text-gray-900 text-xl mb-1">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold">${price}</span><span className="text-gray-500">/mo</span>
                  {interval === 'yearly' && <p className="text-xs text-gray-400 mt-0.5">Billed ${price * 12}/year</p>}
                </div>
                <Link to="/register" className={`block text-center py-3 rounded-xl font-semibold text-sm mb-6 transition-all ${plan.popular ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}>
                  Start 7-day free trial
                </Link>
                <ul className="space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
