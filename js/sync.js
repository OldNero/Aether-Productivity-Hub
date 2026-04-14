'use strict';

/**
 * SyncManager
 * Handles automatic and manual synchronization of trade data from remote sources.
 */
const SyncManager = (function() {
    
    /**
     * Retrieves synchronization configuration from settings
     */
    async function getSyncConfig() {
        const settings = await Store.get('settings') || {};
        return {
            url: settings.syncUrl || '',
            headers: settings.syncHeaders ? JSON.parse(settings.syncHeaders) : {},
            autoSync: settings.autoSync === true
        };
    }

    /**
     * Generates a unique hash to prevent duplicate imports
     */
    function generateTxHash(tx) {
        // Standardize normalization for hashing
        const symbol = String(tx.symbol).trim().toUpperCase();
        const type = String(tx.type).toLowerCase();
        const qty = Number(tx.quantity).toFixed(4);
        const price = Number(tx.price).toFixed(4);
        const date = String(tx.date); // Expected YYYY-MM-DD
        
        const str = `${symbol}|${type}|${qty}|${price}|${date}`;
        
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return `sync_${Math.abs(hash).toString(16)}`;
    }

    /**
     * Polls the configured remote source (JSON only)
     */
    async function poll() {
        const config = await getSyncConfig();
        if (!config.url) return { success: false, error: 'Sync URL not configured' };

        try {
            const response = await fetch(config.url, { headers: { 'Accept': 'application/json', ...config.headers } });
            if (!response.ok) throw new Error(`Source returned ${response.status}`);
            const data = await response.json();
            const trades = Array.isArray(data) ? data : (data.transactions || data.data || []);
            return await ingest(trades);
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Parses a CSV string into a standardized trade array
     */
    function parseCSV(text) {
        if (!text) return [];
        // Handle potential BOM and normalize line endings
        const cleanText = text.replace(/^\ufeff/, '').trim();
        const lines = cleanText.split(/\r?\n/);
        if (lines.length < 2) return [];

        // Normalize headers: lowercase and remove spaces for easier matching
        const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const headers = rawHeaders.map(h => h.toLowerCase().replace(/\s/g, ''));
        
        return lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index];
                // Also keep raw header mapping for TradingView specifics
                const rawHeader = rawHeaders[index];
                obj[rawHeader] = values[index];
                return obj;
            }, {});
        });
    }

    /**
     * Merges remote trades into local store with deduplication
     */
    async function ingest(remoteTrades) {
        const localInvestments = await Store.get('investments') || [];
        const existingHashes = new Set(localInvestments.map(tx => tx.syncHash || generateTxHash(tx)));

        let newRecordsCount = 0;
        const toAdd = [];

        remoteTrades.forEach(trade => {
            // TradingView CSV Mapping
            const rawSymbol = String(trade.Symbol || trade.symbol || trade.ticker || '').toUpperCase();
            const normalized = {
                symbol: rawSymbol.includes(':') ? rawSymbol.split(':').pop() : rawSymbol,
                type: String(trade.Side || trade.type || trade.action || 'buy').toLowerCase(),
                price: parseFloat(trade['Fill Price'] || trade.price || 0),
                quantity: parseFloat(trade.Qty || trade.quantity || trade.amount || 0),
                date: (trade['Closing Time'] || trade.date || new Date().toISOString()).split(' ')[0],
                notes: trade.notes || 'Imported from TradingView',
                commission: parseFloat(trade.Commission || trade.commission || 0)
            };

            // Handle Deposits
            if (normalized.type === 'deposit' || normalized.symbol === '$CASH') {
                normalized.symbol = '$CASH';
                normalized.type = 'deposit';
                normalized.price = 1; // Cash is always $1
                normalized.quantity = parseFloat(trade.Qty || trade.quantity || trade.amount || 0);
            }

            const baseValue = normalized.price * normalized.quantity;
            normalized.total = parseFloat(trade.total || (normalized.type === 'buy' ? baseValue + normalized.commission : baseValue - normalized.commission));

            const hash = generateTxHash(normalized);
            if (!existingHashes.has(hash)) {
                toAdd.push({ ...normalized, id: Store.generateUUID(), syncHash: hash });
                newRecordsCount++;
            }
        });

        if (toAdd.length > 0) {
            const updatedList = [...toAdd, ...localInvestments];
            await Store.set('investments', updatedList);
            if (window.renderInvestments) await window.renderInvestments();
            if (window.updateSummary) await window.updateSummary();
        }

        return { success: true, added: newRecordsCount };
    }

    return {
        poll,
        parseCSV,
        ingest,
        getSyncConfig
    };
})();
