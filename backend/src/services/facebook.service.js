const axios = require('axios');

const FB_GRAPH = 'https://graph.facebook.com/v18.0';

// Permanent profile-picture URL for a Page. The CDN URL Facebook returns in
// `picture{url}` is signed and EXPIRES after a while — but this Graph endpoint
// is stable: it 302-redirects to the Page's current picture on every request,
// no token needed for public Pages.
const fbPagePicture = (pageId) => `https://graph.facebook.com/${pageId}/picture?type=large`;

// Exchange a short-lived user token for a long-lived one (~60 days). Page
// tokens derived from a long-lived user token do not expire — REQUIRED for
// publishing, otherwise stored Page tokens die within the hour.
const exchangeLongLivedToken = async (shortToken) => {
  try {
    const r = await axios.get(`${FB_GRAPH}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        fb_exchange_token: shortToken,
      },
    });
    return r.data.access_token || shortToken;
  } catch (err) {
    console.error('FB long-lived token exchange failed:', err.response?.data || err.message);
    return shortToken;
  }
};

// Enumerate every Facebook Page the user can publish to. This is harder than it
// sounds with Facebook Login for Business:
//   • /me/accounts only returns Pages the user PERSONALLY administers — a Page
//     owned by a Business portfolio (e.g. "HR society" under the "FIT" business)
//     never appears there, which is what made the picker show "No Pages found".
//   • /me/assigned_pages returns "Application does not have permission" (code 10).
//   • The Business owned_pages/client_pages edges come back empty for the token.
// The ONE thing that works is fetching the Page directly by id — and we learn the
// granted Page ids from the token itself: /debug_token returns granular_scopes,
// whose target_ids list exactly which Page ids each Page permission was granted
// for. So: discover ids via debug_token, then fetch each Page directly to get its
// name + Page access_token. Merged with /me/accounts and de-duplicated by id.
const fetchManageablePages = async (userToken) => {
  const fields = 'id,name,category,picture{url},fan_count,access_token';
  const byId = new Map();

  // 1) Pages the user personally administers.
  try {
    const r = await axios.get(`${FB_GRAPH}/me/accounts`, {
      params: { access_token: userToken, fields, limit: 100 },
    });
    for (const pg of r.data.data || []) if (pg && pg.id) byId.set(pg.id, pg);
  } catch (err) {
    /* fall through to the granular-scopes path */
  }

  // 2) Business-portfolio Pages granted via Login for Business.
  try {
    const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const dbg = await axios.get(`${FB_GRAPH}/debug_token`, {
      params: { input_token: userToken, access_token: appToken },
    });
    const granular = dbg.data?.data?.granular_scopes || [];
    const pageIds = new Set();
    for (const g of granular) for (const id of g.target_ids || []) pageIds.add(id);

    for (const id of pageIds) {
      if (byId.has(id)) continue;
      try {
        const pr = await axios.get(`${FB_GRAPH}/${id}`, { params: { access_token: userToken, fields } });
        if (pr.data && pr.data.id) byId.set(pr.data.id, pr.data);
      } catch (err) {
        /* a non-Page target id, or no access — skip it */
      }
    }
  } catch (err) {
    /* debug_token unavailable — return whatever /me/accounts gave us */
  }

  return Array.from(byId.values());
};

// Find the first manageable Page with a linked Instagram Business account.
// Returns { page, igId } or null. Must ask each Page directly (with its own
// Page token) — the instagram_business_account field is not readable through
// the empty /me/accounts edge for Business-portfolio Pages.
const findInstagramBusinessAccount = async (userToken) => {
  const pages = await fetchManageablePages(userToken);
  for (const page of pages) {
    try {
      const r = await axios.get(`${FB_GRAPH}/${page.id}`, {
        params: {
          access_token: page.access_token || userToken,
          fields: 'instagram_business_account',
        },
      });
      if (r.data?.instagram_business_account?.id) {
        return { page, igId: r.data.instagram_business_account.id };
      }
    } catch (err) {
      /* can't read this Page — try the next one */
    }
  }
  return null;
};

module.exports = {
  FB_GRAPH,
  fbPagePicture,
  exchangeLongLivedToken,
  fetchManageablePages,
  findInstagramBusinessAccount,
};
