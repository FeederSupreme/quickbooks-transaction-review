import { NextResponse } from 'next/server';
import { getValidQuickBooksSession, quickBooksQuery, quickBooksUpdate } from '@/app/lib/quickbooks';

const INDEXED_TRANSACTION_TYPES = [
  'Bill',
  'Purchase',
  'BillPayment',
  'VendorCredit',
  'Deposit',
  'Transfer',
  'JournalEntry',
  'Invoice',
  'SalesReceipt',
  'Payment',
  'CreditMemo',
  'RefundReceipt'
] as const;
const EDITABLE_TRANSACTION_TYPES = ['Bill', 'Purchase'] as const;
type EditableTransactionType = (typeof EDITABLE_TRANSACTION_TYPES)[number];

export async function GET() {
  try {
    const session = await getValidQuickBooksSession();
    if (!session) {
      return NextResponse.json({ error: 'Not connected to QuickBooks.' }, { status: 401 });
    }

    const results = [];
    const warnings: string[] = [];

    for (const entityType of INDEXED_TRANSACTION_TYPES) {
      try {
        const result = await quickBooksQuery(session, `SELECT * FROM ${entityType} ORDERBY TxnDate DESC MAXRESULTS 25`);
        const transactions = result.QueryResponse?.[entityType] || [];
        results.push(
          transactions.map((transaction: Record<string, unknown>) => ({
            ...transaction,
            entityType,
            editable: EDITABLE_TRANSACTION_TYPES.includes(entityType as EditableTransactionType)
          }))
        );
      } catch (error) {
        warnings.push(`${entityType}: ${error instanceof Error ? error.message : 'query failed'}`);
      }
    }

    const transactions = results
      .flat()
      .sort((left: any, right: any) => String(right.TxnDate || '').localeCompare(String(left.TxnDate || '')))
      .slice(0, 200);

    return NextResponse.json({ transactions, warnings });
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
    const entityType = body.entityType as EditableTransactionType;
    const updates = body.updates || {};

    if (!id) {
      return NextResponse.json({ error: 'Missing transaction id.' }, { status: 400 });
    }

    if (!/^\d+$/.test(String(id))) {
      return NextResponse.json({ error: 'Invalid transaction id.' }, { status: 400 });
    }

    if (!EDITABLE_TRANSACTION_TYPES.includes(entityType)) {
      return NextResponse.json({ error: 'Unsupported transaction type.' }, { status: 400 });
    }

    const existingResponse = await quickBooksQuery(session, `SELECT * FROM ${entityType} WHERE Id = '${id}'`);
    const existingTransaction = existingResponse.QueryResponse?.[entityType]?.[0];

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found.' }, { status: 404 });
    }

    const lineItems = existingTransaction.Line || [];
    const updatePayload: any = {
      ...existingTransaction,
      PrivateNote: updates.description ?? existingTransaction.PrivateNote
    };

    if (updates.gstCode) {
      const taxCode = updates.gstCode === 'GST 10%' ? 'TAX' : 'NON';
      updatePayload.Line = lineItems.map((line: any) => {
        const detailKey = line.DetailType;
        const detail = detailKey ? line[detailKey] : null;

        return detail
          ? { ...line, [detailKey]: { ...detail, TaxCodeRef: { value: taxCode } } }
          : line;
      });
    }

    const result = await quickBooksUpdate(session, entityType.toLowerCase(), id, updatePayload);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update transaction.' }, { status: 500 });
  }
}
