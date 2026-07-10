import { NextResponse } from 'next/server';
import { readQuickBooksSession } from '@/app/lib/quickbooks';

export async function GET() {
  const clientId = process.env.QUICKBOOKS_CLIENT_ID || '';
  const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || '';
  const missing = [];

  if (!clientId) {
    missing.push('QUICKBOOKS_CLIENT_ID');
  }

  if (!redirectUri) {
    missing.push('QUICKBOOKS_REDIRECT_URI');
  }

  const session = await readQuickBooksSession();

  return NextResponse.json({
    valid: missing.length === 0,
    missing,
    connected: !!session,
    environment: process.env.QUICKBOOKS_ENVIRONMENT || 'production'
  });
}
