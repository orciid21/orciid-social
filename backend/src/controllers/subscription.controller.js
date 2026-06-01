const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/error.middleware');

const PRICE_IDS = {
  STARTER: {
    monthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  PRO: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  AGENCY: {
    monthly: process.env.STRIPE_AGENCY_MONTHLY_PRICE_ID,
    yearly: process.env.STRIPE_AGENCY_YEARLY_PRICE_ID,
  },
};

const getSubscription = async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    res.json(sub);
  } catch (err) {
    next(err);
  }
};

const createCheckoutSession = async (req, res, next) => {
  try {
    const { plan, interval = 'monthly' } = req.body;
    const user = req.user;

    if (!PRICE_IDS[plan]) throw new AppError('Invalid plan', 400);

    let customerId = user.subscription?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.subscription.update({
        where: { userId: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_IDS[plan][interval], quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: 7,
        metadata: { userId: user.id, plan },
      },
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?subscription=cancelled`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

const createPortalSession = async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id } });
    if (!sub?.stripeCustomerId) throw new AppError('No subscription found', 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/settings/billing`,
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
};

const handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;
        const plan = subscription.metadata.plan || 'STARTER';

        await prisma.subscription.update({
          where: { userId },
          data: {
            stripeSubscriptionId: subscription.id,
            plan: plan.toUpperCase(),
            status: subscription.status.toUpperCase(),
            trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
          },
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const userId = subscription.metadata.userId;
        await prisma.subscription.update({
          where: { userId },
          data: { status: 'CANCELED', plan: 'FREE' },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: invoice.customer },
          data: { status: 'PAST_DUE' },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSubscription, createCheckoutSession, createPortalSession, handleWebhook };
