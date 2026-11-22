// Provider + OAuth endpoint regressions. All credential-free: the mock
// provider needs nothing, and the real GoogleBusinessProfileProvider is
// exercised only against injected fetch fixtures - never against live Google.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), Module = require('node:module');
const original = Module._resolveFilename;
Module._resolveFilename = function (name, ...rest) {
  return original.call(this, name.startsWith('@/') ? path.join(__dirname, '../src', name.slice(2)) : name, ...rest);
};
require.extensions['.ts'] = (mod, file) => mod._compile(
  ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, file);

for (const k of ['USE_MOCK', 'NEXT_PUBLIC_USE_MOCK', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_OAUTH_REDIRECT_URI']) delete process.env[k];

const { getBusinessProfileProvider, isMockMode } = require('../src/server/providers/index.ts');
const { MockBusinessProfileProvider, MOCK_CONSENT_CODE } = require('../src/server/providers/mockProvider.ts');
const { GoogleBusinessProfileProvider } = require('../src/server/providers/googleBusinessProfileProvider.ts');
const { ProviderNotConfiguredError, ProviderApiError, ProviderNotFoundError } = require('../src/server/providers/types.ts');
const sessions = require('../src/server/oauthSessions.ts');

// ---------- provider selection ----------

test('mock mode is the default and explicit true; only "false" selects Google', () => {
  assert.equal(isMockMode({}), true);
  assert.equal(isMockMode({ USE_MOCK: 'true' }), true);
  assert.equal(isMockMode({ NEXT_PUBLIC_USE_MOCK: 'true' }), true);
  assert.equal(isMockMode({ USE_MOCK: 'false' }), false);
  assert.equal(isMockMode({ NEXT_PUBLIC_USE_MOCK: 'false' }), false);
  assert.equal(getBusinessProfileProvider({}).name, 'mock');
  assert.equal(getBusinessProfileProvider({ USE_MOCK: 'false' }).name, 'google');
});

test('aliases: USE_MOCK wins conflicts, one coherent resolution', () => {
  const { resolveUseMock } = require('../src/server/providers/index.ts');
  assert.deepEqual(resolveUseMock({ USE_MOCK: 'false', NEXT_PUBLIC_USE_MOCK: 'true' }),
    { useMock: false, source: 'USE_MOCK', conflict: true });
  assert.deepEqual(resolveUseMock({ USE_MOCK: 'true', NEXT_PUBLIC_USE_MOCK: 'false' }),
    { useMock: true, source: 'USE_MOCK', conflict: true });
  assert.deepEqual(resolveUseMock({ NEXT_PUBLIC_USE_MOCK: 'false' }),
    { useMock: false, source: 'NEXT_PUBLIC_USE_MOCK', conflict: false });
  assert.deepEqual(resolveUseMock({ USE_MOCK: 'false', NEXT_PUBLIC_USE_MOCK: 'false' }),
    { useMock: false, source: 'USE_MOCK', conflict: false });
  // isMockMode follows the same resolution and only warns once per process
  assert.equal(isMockMode({ USE_MOCK: 'false', NEXT_PUBLIC_USE_MOCK: 'true' }), false);
  assert.equal(isMockMode({ USE_MOCK: 'true', NEXT_PUBLIC_USE_MOCK: 'false' }), true);
});

test('server injects the resolved mode into the page for the client', () => {
  const { clientModeInitScript } = require('../src/server/clientMode.ts');
  assert.match(clientModeInitScript({}), /window\.__BRANVIDIA_USE_MOCK__="true"/);
  assert.match(clientModeInitScript({ USE_MOCK: 'false' }), /window\.__BRANVIDIA_USE_MOCK__="false"/);
  // USE_MOCK=false alone decides the client mode: no NEXT_PUBLIC_ var needed
  assert.match(clientModeInitScript({ USE_MOCK: 'false', NEXT_PUBLIC_USE_MOCK: 'true' }),
    /window\.__BRANVIDIA_USE_MOCK__="false"/);
});

test('client follows the injected mode; build-time env is only a fallback', () => {
  const { isMockModeClient } = require('../src/lib/apiClient.ts');
  assert.equal(isMockModeClient(), true); // no window: build-time default
  global.window = {};
  try {
    assert.equal(isMockModeClient(), true);
    window.__BRANVIDIA_USE_MOCK__ = 'false';
    assert.equal(isMockModeClient(), false);
    window.__BRANVIDIA_USE_MOCK__ = 'true';
    assert.equal(isMockModeClient(), true);
  } finally {
    delete global.window;
  }
});

test('mock provider needs no credentials; google provider declares it does', () => {
  assert.equal(new MockBusinessProfileProvider().requiresCredentials, false);
  assert.equal(new GoogleBusinessProfileProvider({ config: {} }).requiresCredentials, true);
});

// ---------- mock provider, full interface ----------

test('mock provider runs the whole OAuth + data path credential-free', async () => {
  const p = new MockBusinessProfileProvider();
  const authUrl = p.buildAuthorizationUrl({
    state: 'state-1', codeChallenge: 'ch', redirectUri: 'http://localhost:3000/api/oauth/google/callback',
  });
  const parsed = new URL(authUrl);
  assert.equal(parsed.pathname, '/api/oauth/google/callback');
  assert.equal(parsed.searchParams.get('code'), MOCK_CONSENT_CODE);
  assert.equal(parsed.searchParams.get('state'), 'state-1');

  const { account, tokens } = await p.exchangeCode({ code: MOCK_CONSENT_CODE, codeVerifier: 'v', redirectUri: 'http://x/cb' });
  assert.equal(account.email, 'priya.brewandbean@example.com');
  assert.ok(tokens.accessToken);
  await assert.rejects(() => p.exchangeCode({ code: 'wrong', codeVerifier: 'v', redirectUri: 'http://x/cb' }), ProviderNotFoundError);

  const accounts = await p.listAccounts(tokens);
  assert.equal(accounts.length, 1);
  assert.equal(accounts[0].id, 'ga-1');
  const locations = await p.listLocations('ga-1', tokens);
  assert.deepEqual(locations.map(l => l.id).sort(), ['loc-indiranagar', 'loc-koramangala']);
  const profile = await p.getProfile('loc-indiranagar', tokens);
  assert.equal(profile.name, 'Brew & Bean Café');
  assert.ok(Array.isArray(profile.fieldChecks) && profile.fieldChecks.length > 0);
  await assert.rejects(() => p.getProfile('nope', tokens), ProviderNotFoundError);
  await p.revoke(tokens);
});

test('mock provider returns copies, not shared references', async () => {
  const p = new MockBusinessProfileProvider();
  const a = await p.getProfile('loc-indiranagar', null);
  a.fieldChecks.length = 0;
  const b = await p.getProfile('loc-indiranagar', null);
  assert.ok(b.fieldChecks.length > 0);
});

// ---------- GoogleBusinessProfileProvider against fixtures ----------

const CONFIG = { clientId: 'cid', clientSecret: 'csec', redirectUri: 'http://localhost:3000/api/oauth/google/callback' };
const freshTokens = () => ({ accessToken: 'at1', refreshToken: 'rt1', expiresAt: Date.now() + 3600_000, scope: 's', tokenType: 'Bearer' });

function fixtureFetch(routes, calls) {
  return async (url, init) => {
    calls.push({ url, init });
    const hit = routes.find(([prefix, method]) => url.startsWith(prefix) && (!method || (init?.method ?? 'GET') === method));
    if (!hit) throw new Error(`unexpected fetch: ${url}`);
    const [, , payload, status] = hit;
    return {
      ok: (status ?? 200) < 400,
      status: status ?? 200,
      statusText: '',
      text: async () => JSON.stringify(payload),
    };
  };
}

test('google provider without config fails fast with actionable error', async () => {
  const p = new GoogleBusinessProfileProvider({ config: {}, fetchImpl: fixtureFetch([], []) });
  assert.throws(
    () => p.buildAuthorizationUrl({ state: 's', codeChallenge: 'c', redirectUri: 'http://x/cb' }),
    (err) => {
      assert.ok(err instanceof ProviderNotConfiguredError);
      assert.match(err.message, /GOOGLE_CLIENT_ID/);
      assert.match(err.message, /GOOGLE_CLIENT_SECRET/);
      assert.match(err.message, /USE_MOCK=true/);
      return true;
    },
  );
  await assert.rejects(() => p.listAccounts(freshTokens()), ProviderNotConfiguredError);
});

test('authorization URL: real Google endpoint, read-only scope, PKCE, offline access', () => {
  const p = new GoogleBusinessProfileProvider({ config: CONFIG, fetchImpl: fixtureFetch([], []) });
  const url = new URL(p.buildAuthorizationUrl({ state: 'st', codeChallenge: 'cc', redirectUri: 'http://ignored/cb' }));
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('client_id'), 'cid');
  assert.equal(url.searchParams.get('redirect_uri'), CONFIG.redirectUri); // configured URI wins
  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.match(url.searchParams.get('scope'), /business\.manage/);
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('state'), 'st');
  assert.equal(url.searchParams.get('code_challenge'), 'cc');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
});

test('code exchange posts the full form and maps the Google user', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://oauth2.googleapis.com/token', 'POST', { access_token: 'AT', refresh_token: 'RT', expires_in: 3600, token_type: 'Bearer' }],
      ['https://openidconnect.googleapis.com/v1/userinfo', 'GET', { sub: 'g123', name: 'Priya Ramesh', email: 'priya@example.com' }],
    ], calls),
  });
  const { account, tokens } = await p.exchangeCode({ code: 'authcode', codeVerifier: 'ver', redirectUri: 'http://x/cb' });
  assert.deepEqual(account, { id: 'g123', name: 'Priya Ramesh', email: 'priya@example.com' });
  assert.equal(tokens.accessToken, 'AT');
  assert.equal(tokens.refreshToken, 'RT');
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('code'), 'authcode');
  assert.equal(body.get('client_id'), 'cid');
  assert.equal(body.get('client_secret'), 'csec');
  assert.equal(body.get('code_verifier'), 'ver');
  assert.equal(calls[1].init.headers.authorization, 'Bearer AT');
});

test('accounts and locations map Google resource names to app shapes', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://mybusinessaccountmanagement.googleapis.com/v1/accounts', 'GET', {
        accounts: [{ name: 'accounts/111', accountName: 'Priya’s cafés', primaryOwner: 'priya@example.com' }],
      }],
      ['https://mybusinessbusinessinformation.googleapis.com/v1/accounts/111/locations', 'GET', {
        locations: [
          { name: 'accounts/111/locations/1', title: 'Brew & Bean Café', storefrontAddress: { addressLines: ['100 Feet Road'], locality: 'Bengaluru' } },
          { name: 'accounts/111/locations/2', title: 'Second Café', storefrontAddress: { sublocality: 'Koramangala', locality: 'Bengaluru' } },
        ],
      }],
    ], calls),
  });
  const accounts = await p.listAccounts(freshTokens());
  assert.deepEqual(accounts, [{ id: 'accounts/111', name: 'Priya’s cafés', email: 'priya@example.com' }]);
  const locations = await p.listLocations('accounts/111', freshTokens());
  assert.deepEqual(locations, [
    { id: 'accounts/111/locations/1', name: 'Brew & Bean Café', area: '100 Feet Road', city: 'Bengaluru' },
    { id: 'accounts/111/locations/2', name: 'Second Café', area: 'Koramangala', city: 'Bengaluru' },
  ]);
  const mask = new URL(calls[1].url).searchParams.get('readMask');
  assert.match(mask, /title/);
  assert.match(mask, /storefrontAddress/);
});

const LOCATION_FIXTURE = {
  title: 'Brew & Bean Café',
  primaryCategory: { displayName: 'Café' },
  phoneNumbers: { primaryPhone: '+91 63614 27326' },
  storefrontAddress: { addressLines: ['100 Feet Road'], locality: 'Bengaluru', postalCode: '560038' },
  profile: { description: 'Tiny description.' },
  regularHours: {
    periods: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((openDay) => ({
      openDay, openTime: { hours: 9, minutes: 0 }, closeTime: { hours: 21, minutes: 0 },
    })),
  },
  attributes: [{ name: 'attributes/has_wifi', displayName: 'Wi-Fi', values: [false] }],
};

test('profile maps the location resource, reviews and media into BusinessProfile', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://mybusinessbusinessinformation.googleapis.com/v1/accounts/111/locations/1?', 'GET', LOCATION_FIXTURE],
      ['https://mybusiness.googleapis.com/v4/accounts/111/locations/1/reviews', 'GET', {
        reviews: [{ starRating: 'FIVE' }, { starRating: 'THREE' }, { starRating: 'FIVE' }],
        totalReviewCount: 3,
      }],
      ['https://mybusiness.googleapis.com/v4/accounts/111/locations/1/media', 'GET', { totalMediaItemCount: 6 }],
    ], calls),
  });
  const profile = await p.getProfile('accounts/111/locations/1', freshTokens());
  assert.equal(profile.locationId, 'accounts/111/locations/1');
  assert.equal(profile.name, 'Brew & Bean Café');
  assert.equal(profile.category, 'Café');
  assert.equal(profile.rating, 4.3);
  assert.equal(profile.reviewCount, 3);
  assert.equal(profile.phone, '+91 63614 27326');
  assert.equal(profile.address, '100 Feet Road, Bengaluru, 560038');
  assert.equal(profile.websiteUrl, null);
  assert.equal(profile.menuUrl, null);
  const monday = profile.hours.find((h) => h.day === 'Monday');
  const sunday = profile.hours.find((h) => h.day === 'Sunday');
  assert.deepEqual(monday, { day: 'Monday', open: '09:00', close: '21:00' });
  assert.deepEqual(sunday, { day: 'Sunday', open: null, close: null });
  const byField = Object.fromEntries(profile.fieldChecks.map((c) => [c.field, c.status]));
  assert.equal(byField['Business name'], 'ok');
  assert.equal(byField['Description'], 'warning'); // 3 words < 25
  assert.equal(byField['Weekend hours'], 'missing');
  assert.equal(byField['Website'], 'missing');
  assert.equal(byField['Phone'], 'ok');
  assert.equal(byField['Photos'], 'ok'); // 6 photos
  assert.equal(byField['Attributes'], 'missing'); // Wi-Fi false
});

test('profile survives reviews/media API failures with honest notes', async () => {
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://mybusinessbusinessinformation.googleapis.com/v1/accounts/111/locations/1?', 'GET', LOCATION_FIXTURE],
      ['https://mybusiness.googleapis.com/v4/accounts/111/locations/1/reviews', 'GET', { error: { message: 'API not enabled' } }, 403],
      ['https://mybusiness.googleapis.com/v4/accounts/111/locations/1/media', 'GET', { error: { message: 'API not enabled' } }, 403],
    ], []),
  });
  const profile = await p.getProfile('accounts/111/locations/1', freshTokens());
  assert.equal(profile.rating, 0);
  assert.equal(profile.reviewCount, 0);
  const byField = Object.fromEntries(profile.fieldChecks.map((c) => [c.field, c]));
  assert.equal(byField['Reviews'].status, 'warning');
  assert.match(byField['Reviews'].note, /could not be read/);
  assert.equal(byField['Photos'].status, 'warning');
  assert.match(byField['Photos'].note, /unavailable/);
});

test('expired access token triggers a refresh before the API call', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://oauth2.googleapis.com/token', 'POST', { access_token: 'AT2', expires_in: 3600 }],
      ['https://mybusinessaccountmanagement.googleapis.com/v1/accounts', 'GET', { accounts: [] }],
    ], calls),
  });
  const tokens = { ...freshTokens(), expiresAt: Date.now() - 1000 };
  await p.listAccounts(tokens);
  const body = new URLSearchParams(calls[0].init.body);
  assert.equal(body.get('grant_type'), 'refresh_token');
  assert.equal(body.get('refresh_token'), 'rt1');
  assert.equal(tokens.accessToken, 'AT2'); // mutated in place: the server session keeps it
  assert.equal(calls[1].init.headers.authorization, 'Bearer AT2');
});

test('upstream errors surface as ProviderApiError with the status', async () => {
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://mybusinessaccountmanagement.googleapis.com/v1/accounts', 'GET', { error: { message: 'Request had invalid authentication credentials.' } }, 401],
    ], []),
  });
  await assert.rejects(
    () => p.listAccounts(freshTokens()),
    (err) => {
      assert.ok(err instanceof ProviderApiError);
      assert.equal(err.status, 401);
      assert.match(err.message, /invalid authentication/);
      return true;
    },
  );
});

test('no session tokens at all is a 401, not a crash', async () => {
  const p = new GoogleBusinessProfileProvider({ config: CONFIG, fetchImpl: fixtureFetch([], []) });
  await assert.rejects(() => p.listAccounts(null), (err) => err instanceof ProviderApiError && err.status === 401);
});

test('revoke posts the token to Google’s revocation endpoint', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({ config: CONFIG, fetchImpl: fixtureFetch([['https://oauth2.googleapis.com/revoke', 'POST', {}]], calls) });
  await p.revoke(freshTokens());
  assert.match(calls[0].url, /token=at1/);
});

// ---------- OAuth session store ----------

test('PKCE pair: S256 challenge matches verifier, states are one-time', async () => {
  const { verifier, challenge } = sessions.newPkcePair();
  assert.notEqual(verifier, challenge);
  const expected = require('node:crypto').createHash('sha256').update(verifier).digest().toString('base64url');
  assert.equal(challenge, expected);
  const state = await sessions.newOAuthState(verifier, '/connect/google');
  const pending = await sessions.takeOAuthState(state);
  assert.equal(pending.verifier, verifier);
  assert.equal(pending.returnTo, '/connect/google');
  assert.equal(await sessions.takeOAuthState(state), null); // one-time
  assert.equal(await sessions.takeOAuthState('bogus'), null);
});

test('unsafe return targets are rejected', () => {
  assert.equal(sessions.safeReturnTo('/assistant'), '/assistant');
  assert.equal(sessions.safeReturnTo('https://evil.example/x'), null);
  assert.equal(sessions.safeReturnTo('//evil.example'), null);
  assert.equal(sessions.safeReturnTo(null), null);
});

// ---------- API route handlers (mock mode: credential-free) ----------

const startRoute = require('../src/app/api/oauth/google/start/route.ts');
const callbackRoute = require('../src/app/api/oauth/google/callback/route.ts');
const connectRoute = require('../src/app/api/google/connect/route.ts');
const locationsRoute = require('../src/app/api/google/accounts/[accountId]/locations/route.ts');
const profileRoute = require('../src/app/api/google/locations/[locationId]/profile/route.ts');
const disconnectRoute = require('../src/app/api/google/disconnect/route.ts');

test('mock OAuth handshake end to end through the real endpoints', async () => {
  const start = await startRoute.GET(new Request('http://localhost:3000/api/oauth/google/start'));
  assert.equal(start.status, 302);
  const authUrl = new URL(start.headers.get('location'));
  assert.equal(authUrl.pathname, '/api/oauth/google/callback'); // mock consent bounces back
  const state = authUrl.searchParams.get('state');
  assert.ok(state);

  const cb = await callbackRoute.GET(new Request(authUrl.toString()));
  assert.equal(cb.status, 302);
  assert.match(cb.headers.get('location'), /\/connect\/google\?connected=1$/);
  const cookie = cb.headers.get('set-cookie');
  assert.match(cookie, /branvidia_google_session=/);
  assert.match(cookie, /HttpOnly/);

  const authed = new Request('http://localhost:3000/api/google/connect', { method: 'POST', headers: { cookie } });
  const connected = await connectRoute.POST(authed);
  assert.equal(connected.status, 200);
  const { accounts } = await connected.json();
  assert.equal(accounts[0].email, 'priya.brewandbean@example.com');

  const bye = await disconnectRoute.POST(new Request('http://localhost:3000/api/google/disconnect', { method: 'POST', headers: { cookie } }));
  assert.equal(bye.status, 200);
  assert.match(bye.headers.get('set-cookie'), /Max-Age=0/);
});

test('callback rejects unknown state and honours safe returnTo only', async () => {
  const bad = await callbackRoute.GET(new Request('http://localhost:3000/api/oauth/google/callback?code=x&state=nope'));
  assert.equal(bad.status, 400);
  const start = await startRoute.GET(new Request('http://localhost:3000/api/oauth/google/start?returnTo=https://evil.example'));
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const cb = await callbackRoute.GET(new Request(`http://localhost:3000/api/oauth/google/callback?code=${MOCK_CONSENT_CODE}&state=${state}`));
  assert.match(cb.headers.get('location'), /^http:\/\/localhost:3000\/connect\/google\?connected=1$/); // not the evil URL
});

test('data endpoints serve mock data with no session and no credentials', async () => {
  const anon = new Request('http://localhost:3000/api/google/connect', { method: 'POST' });
  const res = await connectRoute.POST(anon);
  assert.equal(res.status, 200);
  const { accounts } = await res.json();
  assert.equal(accounts.length, 1);

  const locs = await locationsRoute.GET(new Request('http://localhost:3000/api/google/accounts/ga-1/locations'), { params: { accountId: 'ga-1' } });
  assert.equal(locs.status, 200);
  assert.equal((await locs.json()).length, 2);

  const prof = await profileRoute.GET(new Request('http://localhost:3000/api/google/locations/loc-indiranagar/profile'), { params: { locationId: 'loc-indiranagar' } });
  assert.equal(prof.status, 200);
  assert.equal((await prof.json()).name, 'Brew & Bean Café');

  const missing = await profileRoute.GET(new Request('http://localhost:3000/api/google/locations/nope/profile'), { params: { locationId: 'nope' } });
  assert.equal(missing.status, 404);
});

// ---------- real-mode gate behaviour (still no credentials present) ----------

test('USE_MOCK=false without Google env: 503 not_configured, never a crash', async () => {
  process.env.USE_MOCK = 'false';
  try {
    const start = await startRoute.GET(new Request('http://localhost:3000/api/oauth/google/start'));
    assert.equal(start.status, 503);
    const body = await start.json();
    assert.equal(body.error, 'not_configured');
    assert.match(body.message, /GOOGLE_CLIENT_ID/);

    const res = await connectRoute.POST(new Request('http://localhost:3000/api/google/connect', { method: 'POST' }));
    assert.equal(res.status, 401); // no session: told to connect, no credential needed to say so
    assert.equal((await res.json()).error, 'not_connected');

    const locs = await locationsRoute.GET(new Request('http://localhost:3000/api/google/accounts/x/locations'), { params: { accountId: 'x' } });
    assert.equal(locs.status, 401);
  } finally {
    delete process.env.USE_MOCK;
  }
});

test('USE_MOCK=false with configured provider serves real code path via injected session', async () => {
  // The provider is selected by env; here we only prove the route honours the
  // session cookie instead of demanding credentials it cannot check.
  process.env.USE_MOCK = 'false';
  try {
    const session = await sessions.createSession(
      { id: 'g1', name: 'Priya', email: 'priya@example.com' },
      { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000, scope: 's', tokenType: 'Bearer' },
    );
    const res = await connectRoute.POST(new Request('http://localhost:3000/api/google/connect', {
      method: 'POST', headers: { cookie: `branvidia_google_session=${session.id}` },
    }));
    // No GOOGLE_CLIENT_ID configured: the real provider refuses cleanly.
    assert.equal(res.status, 503);
    assert.equal((await res.json()).error, 'not_configured');
  } finally {
    delete process.env.USE_MOCK;
  }
});

// ---------- pipeline data adapter (reviews/photos for the analysis pipeline) ----------

test('google provider maps GMB reviews and media into pipeline records', async () => {
  const calls = [];
  const p = new GoogleBusinessProfileProvider({
    config: CONFIG,
    fetchImpl: fixtureFetch([
      ['https://mybusiness.googleapis.com/v4/loc-1/reviews', 'GET', {
        reviews: [
          { reviewId: 'r1', reviewer: { displayName: 'Asha' }, starRating: 'FIVE', comment: 'Loved it', createTime: '2026-11-01T10:00:00Z', reviewReply: { comment: 'Thanks!' } },
          { reviewId: 'r2', reviewer: { displayName: 'Ravi' }, starRating: 'TWO', comment: 'Cold coffee', createTime: '2026-11-02T10:00:00Z' },
        ],
        totalReviewCount: 2,
      }],
      ['https://mybusiness.googleapis.com/v4/loc-1/media', 'GET', {
        mediaItems: [
          { name: 'm1', mediaFormat: 'PHOTO', googleUrl: 'https://x/1.jpg', locationAssociation: { category: 'FOOD_AND_DRINK' } },
          { name: 'm2', mediaFormat: 'PHOTO', googleUrl: 'https://x/2.jpg', locationAssociation: { category: 'EXTERIOR' } },
          { name: 'm3', mediaFormat: 'VIDEO', googleUrl: 'https://x/3.mp4', locationAssociation: { category: 'INTERIOR' } },
          { name: 'm4', mediaFormat: 'PHOTO', googleUrl: 'https://x/4.jpg', locationAssociation: { category: 'ADDITIONAL' } },
        ],
      }],
    ], calls),
  });
  const reviews = await p.getRecentReviews('loc-1', freshTokens());
  assert.equal(reviews.length, 2);
  assert.deepEqual(reviews[0], { id: 'r1', author: 'Asha', rating: 5, date: '2026-11-01T10:00:00Z', text: 'Loved it', replied: true, replyText: 'Thanks!' });
  assert.equal(reviews[1].replied, false);
  assert.equal(reviews[1].rating, 2);
  const photos = await p.getRecentPhotos('loc-1', freshTokens());
  assert.deepEqual(photos.map((x) => x.type), ['food', 'exterior']); // video and uncategorized left out
  assert.ok(photos.every((x) => x.src.startsWith('https://x/')));
});

test('google provider review/photo fetch failures propagate; no partial or fabricated data', async () => {
  const p = new GoogleBusinessProfileProvider({ config: CONFIG, fetchImpl: fixtureFetch([], []) });
  await assert.rejects(() => p.getRecentReviews('loc-1', freshTokens()));
  await assert.rejects(() => p.getRecentPhotos('loc-1', freshTokens()));
});

test('mock provider serves the pipeline fixtures as copies per location', async () => {
  const p = new MockBusinessProfileProvider();
  const a = await p.getRecentReviews('loc-indiranagar', null);
  const b = await p.getRecentReviews('loc-indiranagar', null);
  assert.notEqual(a, b);
  assert.notEqual(a[0], b[0]);
  const k = await p.getRecentReviews('loc-koramangala', null);
  assert.ok(Array.isArray(k) && k.length > 0);
  const photos = await p.getRecentPhotos('loc-indiranagar', null);
  assert.ok(photos.length > 0 && photos.every((x) => typeof x.src === 'string'));
});
