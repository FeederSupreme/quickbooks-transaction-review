import { NextResponse } from 'next/server';

const transactions = [
  {
    id: 'txn-001',
    date: '2026-07-01',
    description: 'Office supplies purchase',
    amount: 121.0,
    account: 'Office Expenses',
    gstCode: 'GST 10%',
    status: 'Pending'
  },
  {
    id: 'txn-002',
    date: '2026-07-02',
    description: 'Client consulting income',
    amount: 550.0,
    account: 'Consulting Income',
    gstCode: 'GST Free',
    status: 'Needs Review'
  },
  {
    id: 'txn-003',
    date: '2026-07-03',
    description: 'Software subscription',
    amount: 99.0,
    account: 'Software',
    gstCode: 'GST 10%',
    status: 'Reviewed'
  }
];

export async function GET() {
  return NextResponse.json({ transactions });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ ok: true, updates: body });
}
