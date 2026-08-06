import { NextResponse } from 'next/server';
import { getValidQuickBooksSession, quickBooksQuery, quickBooksUpdate } from '@/app/lib/quickbooks';

export async function GET() {
  try {
    const session = await getValidQuickBooksSession();
    if (!session) {
      return NextResponse.json({ error: 'Not connected to QuickBooks.' }, { status: 401 });
    }

    const query = 'SELECT * FROM Bill ORDERBY TxnDate DESC MAXRESULTS 50';
    const result = await quickBooksQuery(session, query);
    const bills = result.QueryResponse?.Bill || [];
    return NextResponse.json({ transactions: bills });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load transactions.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getValidQuickBooksSession();
    if (!session) {
      return NextResponse.json({ error: 'Not connected to QuickBooks.' }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id;
    const updates = body.updates || {};

    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id.' }, { status: 400 });
    }

    if (!/^\d+$/.test(String(id))) {
      return NextResponse.json({ error: 'Invalid transaction id.' }, { status: 400 });
    }

    const existingResponse = await quickBooksQuery(session, `SELECT * FROM Bill WHERE Id = '${id}'`);
    const existingBill = existingResponse.QueryResponse?.Bill?.[0];

    if (!existingBill) {
      return NextResponse.json({ error: 'Bill not found.' }, { status: 404 });
    }

    const lineItems = existingBill.Line || [];
    const updatePayload: any = {
      Id: id,
      SyncToken: existingBill.SyncToken,
      PrivateNote: updates.description ?? existingBill.PrivateNote,
      VendorRef: existingBill.VendorRef,
      Line: lineItems
    };

    if (updates.gstCode) {
      updatePayload.Line = lineItems.map((line: any) => ({
        ...line,
        TaxCodeRef: { value: updates.gstCode === 'GST 10%' ? 'TAX' : 'NON' }
      }));
    }

    const result = await quickBooksUpdate(session, 'bill', id, updatePayload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update transaction.' }, { status: 500 });
  }
}
