import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/* ORCIID only offers a subset of what the big suites do (no public API, no
   enterprise agreements, no reseller programme), so this hub covers just the
   documents that actually apply to this product. The full Privacy Policy lives
   on its own page and is linked from here. */

const LAST_UPDATED = 'August 2026';
const CONTACT = 'support@orciid.online';

const docs = [
  {
    id: 'terms',
    title: 'Terms of Service',
    summary: 'The agreement between you and ORCIID when you use the platform.',
    sections: [
      {
        h: '1. Agreement to these terms',
        p: [
          `These terms govern your use of ORCIID Social, the social media management platform at orciid.online (the "Service"). By creating an account or using the Service you agree to them. If you are using the Service for a company or client, you confirm you are authorised to accept these terms on their behalf.`,
          `We may update these terms as the product changes. If a change is significant we will let account holders know by email or in the app before it takes effect.`,
        ],
      },
      {
        h: '2. Your account',
        p: [
          `You need an account to use the Service. Keep your login details private, use a real email address you control, and tell us promptly if you believe someone else has accessed your account. You are responsible for activity that happens under your account, including anything done by teammates you invite into your workspace.`,
          `You must be old enough to enter into a contract in your country, and the Service is not intended for children.`,
        ],
      },
      {
        h: '3. Trial, plans and billing',
        p: [
          `New accounts begin on a 7-day free trial. No payment card is required to start the trial, and nothing is charged automatically before you choose a paid plan.`,
          `Paid plans are billed in advance, monthly or yearly, at the price shown when you subscribe. Yearly billing is charged for the full term up front at the discounted rate. You can change plan at any time; when you upgrade mid-term the change applies immediately, and when you downgrade it applies from your next renewal.`,
          `You can cancel whenever you like. Cancelling stops future renewals and you keep access until the end of the period you have already paid for. Unless the law where you live says otherwise, payments already made are non-refundable.`,
        ],
      },
      {
        h: '4. Connecting social accounts',
        p: [
          `You may only connect social accounts and Pages that you own or are authorised to manage. Each network is connected through its own official authorisation screen, and we never ask for or store your social media passwords.`,
          `Your use of each connected network stays subject to that network's own terms and policies. Networks can change their rules, limit what third-party tools may do, or withdraw access at any time — if that happens, some features may stop working through no fault of ours. You can disconnect any account from the Service at any time, and you can also revoke our access from within the network's own settings.`,
        ],
      },
      {
        h: '5. Your content',
        p: [
          `Everything you write, upload and schedule stays yours. To run the Service we need your permission to store that content, show it back to you and your teammates, and publish it to the accounts you have connected — strictly as you instruct. That permission exists only so the Service can work, and it ends when you delete the content or close your account.`,
          `You are responsible for what you publish: that you have the rights to the text, images and video you upload, and that publishing it does not break the law or a network's rules.`,
        ],
      },
      {
        h: '6. Acceptable use',
        p: [
          `Using the Service for the activities listed in our Acceptable Use section below is not permitted, and doing so may result in suspension.`,
        ],
      },
      {
        h: '7. Availability and changes',
        p: [
          `We work to keep the Service running, but we do not promise it will be uninterrupted or error-free. We may add, change or remove features over time. Where a change materially reduces what a paid plan offers, we will give notice first.`,
          `Scheduled posts depend on the social networks accepting them. We will retry where it makes sense, but we cannot guarantee that any individual post is published at an exact moment.`,
        ],
      },
      {
        h: '8. Suspension and termination',
        p: [
          `You can close your account at any time from Settings. We may suspend or close an account that breaks these terms, that is used unlawfully, or where required by a network or the law. If we close your account without cause, we will refund the unused portion of any prepaid period.`,
        ],
      },
      {
        h: '9. Liability',
        p: [
          `The Service is provided as-is. To the extent the law allows, ORCIID is not liable for indirect or consequential losses, lost profits, or lost data, and our total liability for any claim is limited to the amount you paid us in the twelve months before the claim arose. Nothing here limits liability that cannot be limited by law.`,
        ],
      },
      {
        h: '10. Governing law and contact',
        p: [
          `These terms are governed by the laws of the jurisdiction in which ORCIID is established, and disputes will be handled by the courts of that jurisdiction.`,
          `Questions about these terms: ${CONTACT}.`,
        ],
      },
    ],
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    summary: 'What you must not do with the platform.',
    sections: [
      {
        h: 'Prohibited activity',
        p: [`You agree not to use ORCIID Social to:`],
        ul: [
          'Publish content that is unlawful, hateful, harassing, deceptive, or that infringes someone else’s rights.',
          'Connect or post to accounts you do not own and are not authorised to manage.',
          'Send spam, run coordinated inauthentic activity, or artificially inflate engagement.',
          'Break the terms, automation limits or rate limits of any connected social network.',
          'Upload malware, attempt to breach our systems, or probe the Service for vulnerabilities without our written permission.',
          'Resell or white-label the Service as your own product without an agreement with us.',
          'Scrape or bulk-extract data from the Service other than your own content and analytics.',
        ],
      },
      {
        h: 'Reporting and enforcement',
        p: [
          `If you believe someone is using ORCIID Social in breach of this policy, write to ${CONTACT} with the details. We investigate reports and may warn, restrict, suspend or close accounts depending on what we find.`,
        ],
      },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie & Storage Notice',
    summary: 'The small amount of data we keep in your browser.',
    sections: [
      {
        h: 'What we store, and why',
        p: [
          `ORCIID Social keeps only what it needs to work. We do not run third-party advertising or ad-tracking cookies, and we do not use data from your connected social accounts for advertising.`,
        ],
        ul: [
          'Sign-in session: after you log in we store your session token in your browser’s local storage so you stay signed in between visits. Logging out removes it.',
          'Preferences: small items such as the channel groups you create are kept in your browser so the app looks the same next time.',
          'Operational logs: our servers record standard request information (such as IP address and timestamps) to keep the Service secure and to diagnose problems.',
        ],
      },
      {
        h: 'Your control',
        p: [
          `You can clear this data at any time by logging out or clearing your browser storage for orciid.online. Because the sign-in token is essential, clearing it simply means you will need to log in again.`,
        ],
      },
    ],
  },
  {
    id: 'data-deletion',
    title: 'Data Deletion',
    summary: 'How to disconnect an account or delete your data entirely.',
    sections: [
      {
        h: 'Disconnecting a single social account',
        p: [
          `Open Accounts in the dashboard and use the delete icon next to any connected channel. This removes that channel and its stored authorisation from our systems, and the Service can no longer act on it. You can also revoke our access from the social network's own app settings — the connection stops working immediately either way.`,
        ],
      },
      {
        h: 'Deleting your whole account',
        p: [
          `To delete your ORCIID account and everything in it, go to Settings and choose to delete your account, or write to ${CONTACT} from the email address on the account. We remove your profile, your connected-account authorisations, your drafts and scheduled posts, and your stored analytics.`,
          `Deletion is completed within 30 days. Backups are overwritten on their normal cycle, and we may keep the minimum records we are legally required to keep, such as invoices for tax purposes.`,
          `Deleting your ORCIID account does not delete posts that have already been published on a social network — those live on that network and must be removed there.`,
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    summary: 'How we protect accounts and connected channels.',
    sections: [
      {
        h: 'How we protect your data',
        p: [`Security work is never finished, but these are the practices in place today:`],
        ul: [
          'We never ask for or store your social media passwords. Channels are connected only through each network’s official authorisation screen.',
          'Authorisation tokens for connected channels are held on our servers and are never sent to your browser.',
          'Account passwords are stored only as salted hashes — not in a form anyone can read.',
          'Traffic between your browser and the Service is encrypted over HTTPS.',
          'Access to production systems is limited to the people who need it to operate the Service.',
        ],
      },
      {
        h: 'Reporting a vulnerability',
        p: [
          `If you find a security issue, please tell us at ${CONTACT} before disclosing it publicly, and give us a reasonable window to fix it. We appreciate responsible reports.`,
        ],
      },
    ],
  },
];

export default function LegalPage() {
  // Deep links such as /legal#data-deletion should open that document directly.
  const fromHash = () => {
    const id = (typeof window !== 'undefined' ? window.location.hash : '').replace('#', '');
    return docs.some((d) => d.id === id) ? id : 'terms';
  };
  const [active, setActive] = useState(fromHash);

  useEffect(() => {
    const onHash = () => setActive(fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const select = (id) => {
    setActive(id);
    if (window.location.hash !== `#${id}`) {
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const doc = docs.find((d) => d.id === active) || docs[0];

  return (
    <div className="min-h-screen bg-white font-sans">
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/brand/orciid-wordmark-black.png" alt="ORCIID" className="h-5 w-auto" draggable="false" />
          </Link>
          <Link to="/" className="text-sm font-semibold text-gray-700 hover:text-gray-900">
            Back to site
          </Link>
        </div>
      </nav>

      <header className="border-b border-gray-100 bg-gray-50/60">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Legal</h1>
          <p className="mt-3 text-gray-500 max-w-2xl">
            The terms and policies that apply to ORCIID Social. Last updated {LAST_UPDATED}.
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-12 grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Document switcher */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <ul className="space-y-1">
            {docs.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => select(d.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active === d.id ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {d.title}
                </button>
              </li>
            ))}
            <li className="pt-1">
              <Link
                to="/privacy"
                className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Privacy Policy
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </li>
          </ul>
        </aside>

        {/* Document body */}
        <article className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-900">{doc.title}</h2>
          <p className="mt-1.5 text-gray-500">{doc.summary}</p>

          <div className="mt-8 space-y-8">
            {doc.sections.map((s) => (
              <section key={s.h}>
                <h3 className="font-semibold text-gray-900">{s.h}</h3>
                {s.p?.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-3 text-[15px] text-gray-600 leading-relaxed">
                    {para}
                  </p>
                ))}
                {s.ul && (
                  <ul className="mt-3 space-y-2">
                    {s.ul.map((li) => (
                      <li key={li.slice(0, 40)} className="flex gap-2.5 text-[15px] text-gray-600 leading-relaxed">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                        <span>{li}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <div className="mt-10 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Questions about anything on this page? Write to{' '}
              <a href={`mailto:${CONTACT}`} className="font-semibold underline">{CONTACT}</a>.
            </p>
          </div>
        </article>
      </div>

      <footer className="border-t border-gray-100 px-4 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <img src="/brand/orciid-wordmark-black.png" alt="ORCIID" className="h-4 w-auto opacity-70" draggable="false" />
          <p>© {new Date().getFullYear()} ORCIID</p>
        </div>
      </footer>
    </div>
  );
}
