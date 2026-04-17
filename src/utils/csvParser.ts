import { type Investment } from '@/stores/investments';

// Robust CSV row parser that handles commas inside quotes
function splitCSVRow(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  result.push(currentValue.trim());
  return result;
}

export function parseTradingViewCSV(csvText: string): Omit<Investment, 'id'>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const headers = splitCSVRow(lines[0]).map(h => h.trim());
  const transactions: Omit<Investment, 'id'>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVRow(lines[i]);
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.replace(/^"/, '').replace(/"$/, '');
    });

    // Handle mapping with various possible header names from TradingView
    const side = (row['Side'] || row['Type'] || row['type'] || '').toLowerCase();
    const symbolRaw = row['Symbol'] || row['symbol'] || row['Ticker'] || '';
    
    // Strip exchange prefix if present (e.g., NASDAQ:IBIT -> IBIT) and trim whitespace
    const symbol = (symbolRaw.includes(':') ? symbolRaw.split(':')[1] : symbolRaw).trim().toUpperCase();

    // Prices and quantities might have quotes or formatting symbols
    const cleanNum = (val: string) => parseFloat(val?.replace(/[$,]/g, '')) || 0;

    if (side === 'buy' || side === 'sell' && symbol) {
      transactions.push({
        symbol,
        type: side as 'buy' | 'sell',
        quantity: cleanNum(row['Qty'] || row['Quantity'] || row['quantity'] || row['Amount'] || '0'),
        price: cleanNum(row['Fill Price'] || row['Price'] || row['price'] || row['Avg Price'] || '0'),
        commission: cleanNum(row['Commission'] || row['Fee'] || row['fee'] || '0'),
        date: new Date(row['Closing Time'] || row['Date'] || row['Time'] || Date.now()).toISOString(),
        notes: `Imported from CSV`
      });
    } else if (side === 'deposit' && (symbolRaw === '$CASH' || symbolRaw === 'CASH')) {
      transactions.push({
        symbol: 'CASH',
        type: 'buy',
        quantity: cleanNum(row['Qty'] || row['Amount'] || '0'),
        price: 1,
        commission: 0,
        date: new Date(row['Closing Time'] || row['Date'] || row['Time'] || Date.now()).toISOString(),
        notes: `Cash Deposit`
      });
    }
  }

  return transactions;
}
