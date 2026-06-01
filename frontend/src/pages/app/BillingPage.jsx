import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { CheckIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const PLANS = [
  {
    id: 'STARTER', name: 'Starter',
    monthly: 19, yearly: 15,
    features: ['5 social accounts', '30 posts/month', 'Basic analytics', '1 workspace'],
  },
  {
    id: 'PRO', name: 'Pro', popular: true,
    monthly: 49, yearly: 39,
    features: ['25 social accounts', 'Unlimited posts', 'Advanced analytics', '5 workspaces', 'Team collaboration'],
  },
  {
    id: 'AGENCY', name: 'Agency',
    monthly: 99, yearly: 79,
    features: ['Unlimited accounts', 'Unlimited posts', 'White-label reports', 'Unlimited workspaces', 'Priority support'],
  },
];

export default function BillingPage() {
  const [subscription, setSubscription] = useState(null);
  const [interval, setInterval] = useState('yearly');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    api.get('/subscriptions').then((res) => setSubscription(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId) => {
    setCheckoutLoading(planId);
    try {
      const res = await api.post('/subscriptions/checkout', { plan: planId, interval });
      window.location.href = res.data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const res = await api.post('/subscriptions/portal');
      window.location.href = res.data.url;
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const isActivePlan = (planId) => subscription?.plan === planId && ['ACTIVE', 'TRIALING'].includes(subscription?.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription</p>
      </div>

      {/* Current status */}
      {subscription && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">
              Current plan: <span className="text-primary-600">{subscription.plan}</span>
            </p>
            <p className="text-sm text-gray-500 mt-0.5">
              Status: <span className={`font-medium ${subscription.status === 'ACTIVE' ? 'text-green-600' : subscription.status === 'TRIALING' ? 'text-amber-600' : 'text-red-600'}`}>
                {subscription.status}
              </span>
              {subscription.trialEndsAt && subscription.status === 'TRIALING' && (
                <> · Trial ends {format(new Date(subscription.trialEndsAt), 'MMM d, yyyy')}</>
              )}
              {subscription.currentPeriodEnd && subscription.status === 'ACTIVE' && (
                <> · Renews {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}</>
              )}
            </p>
          </div>
          {subscription.stripeCustomerId && (
            <button onClick={handlePortal} disabled={portalLoading} className="btn-secondary">
              <CreditCardIcon className="w-4 h-4" />
              {portalLoading ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${interval === 'monthly' ? 'text-gray-900' : 'text-gray-400'}`}>Monthly</span>
        <button
          onClick={() => setInterval(interval === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-12 h-6 rounded-full transition-colors ${interval === 'yearly' ? 'bg-primary-600' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${interval === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-medium ${interval === 'yearly' ? 'text-gray-900' : 'text-gray-400'}`}>
          Yearly <span className="text-green-600 text-xs font-semibold">Save 20%</span>
        </span>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const price = interval === 'yearly' ? plan.yearly : plan.monthly;
          const active = isActivePlan(plan.id);
          return (
            <div key={plan.id} className={`card p-6 relative ${plan.popular ? 'border-primary-500 border-2' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
              <div className="mb-5">
                <span className="text-3xl font-extrabold text-gray-900">${price}</span>
                <span className="text-gray-500 text-sm">/mo</span>
                {interval === 'yearly' && (
                  <p className="text-xs text-gray-400">Billed ${price * 12}/year</p>
                )}
              </div>

              {active ? (
                <div className="flex items-center justify-center gap-1.5 py-2.5 bg-green-50 text-green-700 font-semibold text-sm rounded-lg mb-5">
                  <CheckIcon className="w-4 h-4" />
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.id)}
                  disabled={!!checkoutLoading}
                  className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all mb-5 ${
                    plan.popular
                      ? 'bg-primary-600 hover:bg-primary-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  {checkoutLoading === plan.id ? 'Loading...' : 'Upgrade — 7-day trial'}
                </button>
              )}

              <ul className="space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
