import { type Investment } from '@/stores/investments';

export function parseTradingViewCSV(csvText: string): Omit<Investment, 'id'>[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim());
  const transactions: Omit<Investment, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const side = row['Side']?.toLowerCase();
    const symbolRaw = row['Symbol'] || '';
    // Strip exchange prefix if present (e.g., NASDAQ:IBIT -> IBIT)
    const symbol = symbolRaw.includes(':') ? symbolRaw.split(':')[1] : symbolRaw;

    if (side === 'buy' || side === 'sell') {
      transactions.push({
        symbol,
        type: side as 'buy' | 'sell',
        quantity: parseFloat(row['Qty']) || 0,
        price: parseFloat(row['Fill Price']) || 0,
        commission: parseFloat(row['Commission']) || 0,
        date: row['Closing Time']?.split(' ')[0] || new Date().toISOString().split('T')[0],
        notes: `Imported from TradingView CSV`
      });
    } else if (side === 'deposit' && symbolRaw === '$CASH') {
      // Special handling for cash deposits if we decide to track them
      // For now, ignoring or adding as a "CASH" buy/symbol
      transactions.push({
        symbol: 'CASH',
        type: 'buy',
        quantity: parseFloat(row['Qty']) || 0,
        price: 1,
        commission: 0,
        date: row['Closing Time']?.split(' ')[0] || new Date().toISOString().split('T')[0],
        notes: `Cash Deposit`
      });
    }
  }

  return transactions;
}
