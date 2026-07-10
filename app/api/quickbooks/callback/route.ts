import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, writeQuickBooksSession } from '@/app/lib/quickbooks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const realmId = searchParams.get('realmId');

  if (!code || !realmId) {
    return NextResponse.json({ error: 'Missing QuickBooks auth parameters.' }, { status: 400 });
  }

  try {
    const tokenResponse = await exchangeCodeForTokens(code, process.env.QUICKBOOKS_REDIRECT_URI || 'http://localhost:3000/api/quickbooks/callback');
    await writeQuickBooksSession({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      realmId,
      expiresAt: Date.now() + Number(tokenResponse.expires_in || 3600) * 1000
    });

    return NextResponse.redirect(new URL('/?connected=1&state=' + encodeURIComponent(state || ''), request.url));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to connect QuickBooks.' }, { status: 500 });
  }
}
