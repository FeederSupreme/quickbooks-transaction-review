export const GST_CODES = ['GST 10%', 'GST Free', 'No GST'];

export function inferGstCode(transaction) {
  const text = `${transaction.description ?? ''} ${transaction.account ?? ''}`.toLowerCase();

  if (/(consult|software|service|office|supply|expense|subscription|purchase)/.test(text)) {
    return 'GST 10%';
  }

  if (/(income|revenue|refund|sale|consulting income)/.test(text)) {
    return 'GST Free';
  }

  return transaction.amount > 300 ? 'GST 10%' : 'GST Free';
}

export function applyGstRules(transactions, selectedIds) {
  return transactions.map((transaction) => {
    if (!selectedIds.includes(transaction.id)) {
      return transaction;
    }

    return {
      ...transaction,
      gstCode: inferGstCode(transaction),
      status: 'Reviewed'
    };
  });
}

export function markOutOfScope(transactions, selectedIds) {
  return transactions.map((transaction) => {
    if (!selectedIds.includes(transaction.id)) {
      return transaction;
    }

    return {
      ...transaction,
      gstCode: 'No GST',
      status: 'Reviewed'
    };
  });
}

export function calculateSummary(transactions) {
  return {
    total: transactions.length,
    pending: transactions.filter((transaction) => transaction.status === 'Pending').length,
    reviewed: transactions.filter((transaction) => transaction.status === 'Reviewed').length,
    needsReview: transactions.filter((transaction) => transaction.status === 'Needs Review').length
  };
}
