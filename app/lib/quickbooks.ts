import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'qb_session';

type QuickBooksSession = {
  accessToken: string;
  refreshToken: string;
  realmId: string;
  expiresAt: number;
};

function getClientConfig() {
  return {
    clientId: process.env.QUICKBOOKS_CLIENT_ID || '',
    clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET || '',
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback',
    environment: process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production'
  };
}

function getAuthBaseUrl() {
  return 'https://appcenter.intuit.com/connect/oauth2';
}

function getTokenUrl() {
  return 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';
}

function getApiBaseUrl() {
  return process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox'
    ? 'https://sandbox-quickbooks.api.intuit.com'
    : 'https://quickbooks.api.intuit.com';
}

export function getQuickBooksAuthUrl(state: string) {
  const { clientId, redirectUri } = getClientConfig();

  if (!clientId) {
    throw new Error('Missing QUICKBOOKS_CLIENT_ID environment variable.');
  }

  if (!redirectUri) {
    throw new Error('Missing QUICKBOOKS_REDIRECT_URI environment variable.');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'com.intuit.quickbooks.accounting',
    state
  });

  return `${getAuthBaseUrl()}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { clientId, clientSecret } = getClientConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    }).toString()
  });

  if (!response.ok) {
    throw new Error('Unable to exchange QuickBooks authorization code.');
  }

  return response.json();
}

export async function refreshAccessToken(session: QuickBooksSession) {
  const { clientId, clientSecret } = getClientConfig();
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(getTokenUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken
    }).toString()
  });

  if (!response.ok) {
    throw new Error('Unable to refresh QuickBooks access token.');
  }

  return response.json();
}

export async function readQuickBooksSession() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) {
    return null;
  }

  try {
    return JSON.parse(cookie.value) as QuickBooksSession;
  } catch {
    return null;
  }
}

export async function writeQuickBooksSession(session: QuickBooksSession) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });
}

export async function clearQuickBooksSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getValidQuickBooksSession() {
  const session = await readQuickBooksSession();
  if (!session) {
    return null;
  }

  if (Date.now() >= session.expiresAt) {
    const refreshed = await refreshAccessToken(session);
    const nextSession: QuickBooksSession = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || session.refreshToken,
      realmId: session.realmId,
      expiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000
    };
    await writeQuickBooksSession(nextSession);
    return nextSession;
  }

  return session;
}

export async function quickBooksQuery(session: QuickBooksSession, query: string) {
  const response = await fetch(`${getApiBaseUrl()}/v3/company/${session.realmId}/query?query=${encodeURIComponent(query)}`, {
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('QuickBooks query failed.');
  }

  return response.json();
}

export async function quickBooksUpdate(session: QuickBooksSession, entity: string, id: string, payload: Record<string, unknown>) {
  const response = await fetch(`${getApiBaseUrl()}/v3/company/${session.realmId}/${entity}/${id}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error('QuickBooks update failed.');
  }

  return response.json();
}
