import { NextResponse } from 'next/server';
import { getQuickBooksAuthUrl } from '@/app/lib/quickbooks';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state') || 'quickbooks-review';

  try {
    return NextResponse.redirect(getQuickBooksAuthUrl(state));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to start QuickBooks connection.' },
      { status: 500 }
    );
  }
}
