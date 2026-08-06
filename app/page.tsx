'use client';

import { useEffect, useMemo, useState } from 'react';
import { applyGstRules, calculateSummary, GST_CODES, markOutOfScope } from './lib/transactionRules';

const QUICKBOOKS_AUTH_URL = '/api/quickbooks/auth';

type Transaction = {
  id: string;
  quickBooksId: string;
  entityType: string;
  editable: boolean;
  date: string;
  description: string;
  amount: number;
  account: string;
  gstCode: string;
  status: 'Pending' | 'Reviewed' | 'Needs Review';
};

const initialTransactions: Transaction[] = [
  {
    id: 'txn-001',
    quickBooksId: 'txn-001',
    entityType: 'Bill',
    editable: true,
    date: '2026-07-01',
    description: 'Office supplies purchase',
    amount: 121.0,
    account: 'Office Expenses',
    gstCode: 'GST 10%',
    status: 'Pending'
  },
  {
    id: 'txn-002',
    quickBooksId: 'txn-002',
    entityType: 'Bill',
    editable: true,
    date: '2026-07-02',
    description: 'Client consulting income',
    amount: 550.0,
    account: 'Consulting Income',
    gstCode: 'GST Free',
    status: 'Needs Review'
  },
  {
    id: 'txn-003',
    quickBooksId: 'txn-003',
    entityType: 'Bill',
    editable: true,
    date: '2026-07-03',
    description: 'Software subscription',
    amount: 99.0,
    account: 'Software',
    gstCode: 'GST 10%',
    status: 'Reviewed'
  }
];

export default function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('Ready to review existing transactions.');
  const [isSaving, setIsSaving] = useState(false);
  const [missingConfig, setMissingConfig] = useState<string[]>([]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get('connected')) {
      setConnected(true);
      setMessage('QuickBooks connected successfully.');
    }

    void fetch('/api/quickbooks/transactions')
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.transactions)) {
          const mapped = data.transactions.map((item: any) => ({
            id: `${item.entityType}:${item.Id}`,
            quickBooksId: item.Id,
            entityType: item.entityType,
            editable: item.editable,
            date: item.TxnDate,
            description: item.PrivateNote || item.CustomerMemo?.value || item.DocNumber || '',
            amount: item.TotalAmt || 0,
            account: item.AccountRef?.name || item.EntityRef?.name || item.VendorRef?.name || 'Unassigned',
            gstCode: 'GST 10%',
            status: 'Pending'
          }));
          setTransactions(mapped);
          if (data.warnings?.length) {
            setMessage(`Loaded posted transactions with ${data.warnings.length} entity warning(s).`);
          }
        } else if (data.error) {
          setMessage(data.error);
        }
      })
      .catch(() => setMessage('Could not load transactions from QuickBooks.'));

    void fetch('/api/quickbooks/config')
      .then((response) => response.json())
      .then((data) => {
        if (!data.valid) {
          setMissingConfig(data.missing || []);
          setMessage(`Missing QuickBooks config: ${data.missing.join(', ')}`);
        } else if (!data.connected) {
          setMessage('QuickBooks is not connected. Click Connect QuickBooks.');
        }
      })
      .catch(() => setMessage('Unable to validate QuickBooks configuration.'));
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (filterStartDate && transaction.date < filterStartDate) return false;
      if (filterEndDate && transaction.date > filterEndDate) return false;
      return true;
    });
  }, [transactions, filterStartDate, filterEndDate]);

  const summary = useMemo(() => calculateSummary(transactions), [transactions]);

  const toggleSelection = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const updateTransaction = (id: string, field: keyof Transaction, value: string | number) => {
    setTransactions((current) => current.map((tx) => (tx.id === id ? { ...tx, [field]: value } : tx)));
  };

  const applyDefaultGST = () => {
    setTransactions((current) => applyGstRules(current, selectedIds));
    setMessage(selectedIds.length > 0 ? 'Applied GST rules to the selected transactions.' : 'Select at least one transaction first.');
  };

  const markSelectedOutOfScope = () => {
    setTransactions((current) => markOutOfScope(current, selectedIds));
    setMessage(selectedIds.length > 0 ? 'Marked selected transactions as GST out of scope.' : 'Select at least one transaction first.');
  };

  const clearDateFilter = () => {
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const connectQuickBooks = () => {
    if (missingConfig.length > 0) {
      setMessage(`Cannot connect to QuickBooks until you set: ${missingConfig.join(', ')}`);
      return;
    }

    window.location.href = QUICKBOOKS_AUTH_URL;
  };

  const saveChanges = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/quickbooks/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: transactions.find((tx) => tx.id === selectedIds[0])?.quickBooksId,
          entityType: transactions.find((tx) => tx.id === selectedIds[0])?.entityType,
          updates: {
            description: transactions.find((tx) => tx.id === selectedIds[0])?.description,
            gstCode: transactions.find((tx) => tx.id === selectedIds[0])?.gstCode
          }
        })
      });
      const data = await response.json();
      setMessage(data.ok ? 'Changes saved to QuickBooks.' : data.error || 'Unable to save review changes.');
    } catch {
      setMessage('Unable to save review changes right now.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main>
      <section className="card">
        <h1>Transaction review workspace</h1>
        <p>Review existing QuickBooks transactions, adjust GST coding, and prepare changes for sync.</p>
        <div className="row">
          <span className="badge">{summary.total} transactions</span>
          <span className="badge">{summary.pending} pending</span>
          <span className="badge">{summary.reviewed} reviewed</span>
          <span className="badge">{summary.needsReview} needs review</span>
        </div>
        <div className="row">
          <button className="primary" onClick={applyDefaultGST}>Apply GST rules to selected</button>
          <button className="secondary" onClick={markSelectedOutOfScope}>Mark selected out of GST scope</button>
          <button className="secondary" onClick={connectQuickBooks}>{connected ? 'QuickBooks connected' : 'Connect QuickBooks'}</button>
          <button className="secondary" onClick={saveChanges} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save review changes'}</button>
        </div>
        <div className="row" style={{ gap: '12px', flexWrap: 'wrap' }}>
          <label>
            From:
            <input type="date" value={filterStartDate} onChange={(event) => setFilterStartDate(event.target.value)} />
          </label>
          <label>
            To:
            <input type="date" value={filterEndDate} onChange={(event) => setFilterEndDate(event.target.value)} />
          </label>
          <button className="secondary" onClick={clearDateFilter}>Clear date filter</button>
        </div>
        <p>{message}</p>
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th></th>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Account</th>
                <th>GST code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => (
                <tr key={tx.id}>
                  <td><input type="checkbox" checked={selectedIds.includes(tx.id)} disabled={!tx.editable} onChange={() => toggleSelection(tx.id)} /></td>
                  <td>{tx.date}</td>
                  <td>{tx.entityType}</td>
                  <td>
                    <input value={tx.description} disabled={!tx.editable} onChange={(event) => updateTransaction(tx.id, 'description', event.target.value)} />
                  </td>
                  <td>
                    <input type="number" value={tx.amount} disabled={!tx.editable} onChange={(event) => updateTransaction(tx.id, 'amount', Number(event.target.value))} />
                  </td>
                  <td>
                    <input value={tx.account} disabled={!tx.editable} onChange={(event) => updateTransaction(tx.id, 'account', event.target.value)} />
                  </td>
                  <td>
                    <select value={tx.gstCode} disabled={!tx.editable} onChange={(event) => updateTransaction(tx.id, 'gstCode', event.target.value)}>
                      {GST_CODES.map((code) => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  </td>
                  <td>{tx.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
