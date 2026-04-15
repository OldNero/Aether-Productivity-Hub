'use strict';

let editingInvestmentId = null;
let marketDataCache = {};

window.initInvestments = async function () {
  console.log('Aether: Initializing Investment View...');
  const investmentForm = document.getElementById('investment-form');
  const investmentTypeArr = document.getElementById('investment-type');
  const btnTypeBuy = document.getElementById('btn-type-buy');
  const btnTypeSell = document.getElementById('btn-type-sell');
  const symbolInput = document.getElementById('investment-symbol');
  const priceInput = document.getElementById('investment-price');
  const quantityInput = document.getElementById('investment-quantity');
  const commissionInput = document.getElementById('investment-commission');
  const dateInput = document.getElementById('investment-date');
  const notesInput = document.getElementById('investment-notes');
  const symbolSuggestions = document.getElementById('symbol-suggestions');
  const totalDisplay = document.getElementById('investment-total-display');
  const investmentList = document.getElementById('investment-list');
  const emptyState = document.getElementById('investments-empty-state');
  const addInvestmentBtn = document.getElementById('add-investment-btn');
  const investmentModal = document.getElementById('modal-investment');

  if (!investmentForm) return;

  const calculateTransactionTotal = () => {
    let priceValue = Number(priceInput.value) || 0;
    let quantityValue = Number(quantityInput.value) || 0;
    let commissionValue = Number(commissionInput.value) || 0;
    const isBuy = investmentTypeArr ? investmentTypeArr.value === 'buy' : true;
    let totalValue = isBuy
      ? priceValue * quantityValue + commissionValue
      : priceValue * quantityValue - commissionValue;
    if (totalDisplay) totalDisplay.textContent = '$ ' + totalValue.toFixed(2);
  };

  const autoFetchPrice = async (symbol) => {
    if (!symbol) return;
    if (!priceInput.value) priceInput.placeholder = 'Fetching...';
    const data = await API.fetchStockPrice(symbol);
    if (data && data.price) {
      priceInput.placeholder = '0.00';
      priceInput.value = data.price.toFixed(2);
      calculateTransactionTotal();
    }
  };

  const renderSuggestions = (matches) => {
    if (matches.length === 0) {
      symbolSuggestions.classList.add('hidden');
      return;
    }
    symbolSuggestions.innerHTML = '';
    matches.forEach((match) => {
      const item = document.createElement('div');
      item.className =
        'px-4 py-2 hover:bg-zinc-800 cursor-pointer transition-colors border-b border-white/5 last:border-0';
      item.innerHTML = `<div class="flex items-center justify-between"><span class="text-sm font-bold text-zinc-100">${match.s}</span><span class="text-[10px] text-muted truncate ml-2">${match.n}</span></div>`;
      item.onmousedown = () => {
        symbolInput.value = match.s;
        symbolSuggestions.classList.add('hidden');
        autoFetchPrice(match.s);
      };
      symbolSuggestions.appendChild(item);
    });
    symbolSuggestions.classList.remove('hidden');
  };

  if (addInvestmentBtn) {
    addInvestmentBtn.onclick = () => {
      editingInvestmentId = null;
      investmentForm.reset();
      document.getElementById('modal-investment-title').textContent =
        'Add New Position';
      calculateTransactionTotal();
      investmentModal.classList.add('open');
    };
  }

  // Add close handlers for investment modal
  const investmentModalCloseButtons = document.querySelectorAll(
    '[data-modal="modal-investment"]'
  );
  investmentModalCloseButtons.forEach((button) => {
    button.onclick = () => {
      document.getElementById('modal-investment').classList.remove('open');
    };
  });

  [priceInput, quantityInput, commissionInput].forEach((input) => {
    if (input) input.oninput = calculateTransactionTotal;
  });

  if (btnTypeBuy) {
    btnTypeBuy.onclick = () => {
      if (investmentTypeArr) investmentTypeArr.value = 'buy';
      btnTypeBuy.classList.add('btn-type-buy-active');
      btnTypeSell.classList.remove('btn-type-sell-active', 'text-zinc-300');
      btnTypeSell.classList.add('text-muted');
      calculateTransactionTotal();
    };
  }

  if (btnTypeSell) {
    btnTypeSell.onclick = () => {
      if (investmentTypeArr) investmentTypeArr.value = 'sell';
      btnTypeSell.classList.add('btn-type-sell-active');
      btnTypeBuy.classList.remove('btn-type-buy-active', 'text-zinc-300');
      btnTypeBuy.classList.add('text-muted');
      calculateTransactionTotal();
    };
  }

  investmentForm.onsubmit = async (e) => {
    e.preventDefault();
    let investments = (await Store.get('investments')) || [];
    const transactionData = {
      type: investmentTypeArr.value,
      symbol: symbolInput.value.trim().toUpperCase(),
      price: Number(priceInput.value),
      quantity: Number(quantityInput.value),
      commission: Number(commissionInput.value),
      date: dateInput.value || new Date().toISOString().split('T')[0],
      notes: notesInput.value,
      total:
        investmentTypeArr.value === 'buy'
          ? Number(priceInput.value) * Number(quantityInput.value) +
            Number(commissionInput.value)
          : Number(priceInput.value) * Number(quantityInput.value) -
            Number(commissionInput.value),
    };
    if (editingInvestmentId) {
      investments = investments.map((inv) =>
        inv.id === editingInvestmentId
          ? { ...transactionData, id: inv.id }
          : inv
      );
    } else {
      investments.unshift({ ...transactionData, id: Store.generateUUID() });
    }
    await Store.set('investments', investments);
    investmentForm.reset();
    investmentModal.classList.remove('open');
    editingInvestmentId = null;
    await renderInvestments();
    await updateSummary();
  };

  let debounceTimeout;
  if (symbolInput) {
    symbolInput.oninput = (e) => {
      clearTimeout(debounceTimeout);
      const query = e.target.value.trim().toUpperCase();
      if (query.length < 1) {
        symbolSuggestions.classList.add('hidden');
        return;
      }
      debounceTimeout = setTimeout(() => {
        const matches = STOCK_SYMBOLS.filter(
          (s) => s.s.startsWith(query) || s.n.toUpperCase().includes(query)
        ).slice(0, 10);
        renderSuggestions(matches);
      }, 150);
    };
    symbolInput.onblur = () => {
      setTimeout(() => {
        symbolSuggestions.classList.add('hidden');
        if (symbolInput.value)
          autoFetchPrice(symbolInput.value.trim().toUpperCase());
      }, 200);
    };
  }

  const syncBtn = document.getElementById('sync-now-btn');
  const syncStatusContainer = document.getElementById('sync-status-container');
  const syncStatusText = document.getElementById('sync-status-text');
  const syncTimeText = document.getElementById('sync-time-text');

  const csvDropzone = document.getElementById('csv-dropzone');
  const csvInput = document.getElementById('csv-input');

  // CSV Import logic
  if (csvDropzone && csvInput) {
    csvDropzone.onclick = () => csvInput.click();

    csvDropzone.ondragover = (e) => {
      e.preventDefault();
      csvDropzone.classList.add('border-emerald-500/50', 'bg-emerald-500/5');
    };

    csvDropzone.ondragleave = () => {
      csvDropzone.classList.remove('border-emerald-500/50', 'bg-emerald-500/5');
    };

    csvDropzone.ondrop = async (e) => {
      e.preventDefault();
      csvDropzone.classList.remove('border-emerald-500/50', 'bg-emerald-500/5');
      const file = e.dataTransfer.files[0];
      if (file) await handleCSVFile(file);
    };

    csvInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) await handleCSVFile(file);
    };
  }

  async function handleCSVFile(file) {
    if (!file.name.endsWith('.csv')) return alert('Please upload a .csv file');

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const trades = SyncManager.parseCSV(text);
      const result = await SyncManager.ingest(trades);

      if (result.success) {
        alert(`Import successful! Added ${result.added} new records.`);
        await renderInvestments();
        await updateSummary();
      }
    };
    reader.readAsText(file);
  }

  if (syncBtn) {
    // Show sync indicators if URL is configured
    const config = await SyncManager.getSyncConfig();
    if (config.url && syncStatusContainer)
      syncStatusContainer.classList.remove('hidden');

    syncBtn.onclick = async () => {
      syncBtn.disabled = true;
      if (syncStatusText) syncStatusText.textContent = 'Syncing...';

      const result = await SyncManager.poll();

      if (result.success) {
        if (syncStatusText)
          syncStatusText.textContent =
            result.added > 0 ? `Synced +${result.added}` : 'Up to date';
        if (syncTimeText)
          syncTimeText.textContent = `Last: ${new Date().toLocaleTimeString(
            [],
            { hour: '2-digit', minute: '2-digit' }
          )}`;
        if (result.added > 0) {
          await renderInvestments();
          await updateSummary();
        }
      } else {
        if (syncStatusText) {
          syncStatusText.textContent = 'Sync Failed';
          syncStatusText.className =
            'text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em] leading-none mb-1';
        }
        alert(`Sync Error: ${result.error}`);
      }

      syncBtn.disabled = false;
    };
  }

  window.renderInvestments = renderInvestments;
  window.updateSummary = updateSummary;

  await renderInvestments();
  await updateSummary();

  console.log('Aether: Starting Market Movers fetch (1s minimum)...');
  await initMarketMovers();
  console.log('Aether: Market Movers rendered.');

  startLivePriceUpdates();

  function updateMarketStatus() {
    const dot = document.getElementById('market-status-dot');
    const text = document.getElementById('market-status-text');
    const timeEl = document.getElementById('market-status-time');
    if (!dot || !text || !timeEl) return;

    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });

    const parts = formatter.formatToParts(now);
    const p = {};
    for (const part of parts) {
      if (part.type !== 'literal') p[part.type] = parseInt(part.value, 10);
    }
    if (p.hour === 24) p.hour = 0;

    const nyTimeEpoch = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second
    );
    const dummyDate = new Date(nyTimeEpoch);
    const dayOfWeek = dummyDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const nyDecimalTime = p.hour + p.minute / 60;

    let status = 'Closed';
    let targetHour = 4;
    let targetMin = 0;
    
    if (!isWeekend) {
        if (nyDecimalTime >= 4 && nyDecimalTime < 9.5) {
            status = 'Pre-Market';
            targetHour = 9; targetMin = 30;
        } else if (nyDecimalTime >= 9.5 && nyDecimalTime < 16) {
            status = 'Open';
            targetHour = 16; targetMin = 0;
        } else if (nyDecimalTime >= 16 && nyDecimalTime < 20) {
            status = 'Post-Market';
            targetHour = 20; targetMin = 0;
        } else {
            status = 'Closed';
            targetHour = 4; targetMin = 0;
        }
    } else {
        status = 'Closed';
        targetHour = 4; targetMin = 0;
    }

    let targetNyEpoch = Date.UTC(p.year, p.month - 1, p.day, targetHour, targetMin, 0);

    if (status === 'Closed') {
        let tDate = new Date(targetNyEpoch);
        if (isWeekend || nyDecimalTime >= 20) {
            do {
                tDate.setUTCDate(tDate.getUTCDate() + 1);
            } while (tDate.getUTCDay() === 0 || tDate.getUTCDay() === 6);
            targetNyEpoch = tDate.getTime();
        }
    }

    const diffMs = targetNyEpoch - nyTimeEpoch;
    const totalMinutes = Math.floor(diffMs / 60000);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    let tooltipLabel = '';
    
    if (status === 'Open') {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
      text.className = 'text-[10px] font-bold text-emerald-400 uppercase tracking-wider';
      tooltipLabel = 'Closes in';
    } else if (status === 'Pre-Market') {
      dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
      text.className = 'text-[10px] font-bold text-amber-400 uppercase tracking-wider';
      tooltipLabel = 'Market opens in';
    } else if (status === 'Post-Market') {
      dot.className = 'w-2 h-2 rounded-full bg-purple-500 animate-pulse';
      text.className = 'text-[10px] font-bold text-purple-400 uppercase tracking-wider';
      tooltipLabel = 'Post-market closes in';
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-rose-500';
      text.className = 'text-[10px] font-bold text-rose-400 uppercase tracking-wider';
      tooltipLabel = 'Pre-market opens in';
    }
    
    text.textContent = status;
    timeEl.textContent = `${tooltipLabel} ${h}h ${m}m`;
  }

  updateMarketStatus();
  setInterval(updateMarketStatus, 60000);
};

function startLivePriceUpdates() {
  updateLivePrices();
  setInterval(updateLivePrices, 30000);
}

async function updateLivePrices() {
  const investments = (await Store.get('investments')) || [];
  // Filter out CASH and already cached symbols to save API limits
  const symbols = [
    ...new Set(
      investments.filter((i) => i.symbol !== '$CASH').map((i) => i.symbol)
    ),
  ];

  for (const symbol of symbols) {
    if (!marketDataCache[symbol]) {
      // Don't await here in the loop to allow UI to stay responsive
      API.fetchStockPrice(symbol).then((data) => {
        if (data) {
          marketDataCache[symbol] = data;
          // Re-render only if we are still on the investments view
          if (document.getElementById('investment-list')) {
            renderInvestments();
            updateSummary();
          }
        }
      });
    }
  }
}

async function renderInvestments() {
  const investmentList = document.getElementById('investment-list');
  const emptyState = document.getElementById('investments-empty-state');
  const skeleton = document.getElementById('investments-skeleton');

  if (!investmentList) return;

  // Show skeleton on initial render if container is empty
  let isInitialRender = false;
  if (skeleton && !investmentList.innerHTML.trim()) {
    isInitialRender = true;
    investmentList.classList.add('hidden');
    if (emptyState) emptyState.classList.add('hidden');
    skeleton.classList.remove('hidden');
    // Ensure skeleton is visible for at least 600ms
    await new Promise((resolve) => setTimeout(resolve, 600));
  }

  const investments = (await Store.get('investments')) || [];
  investmentList.innerHTML = '';
  if (investments.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');

    // Sort for display (newest first)
    const displayInvs = [...investments].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // We need to calculate avg cost basis per symbol chronologically to show realized gain on sell rows
    const chronological = [...investments].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.type === b.type) return 0;
      // Same day? Process Deposits first, then Buys, then Sells
      if (a.type === 'deposit') return -1;
      if (b.type === 'deposit') return 1;
      return a.type === 'buy' ? -1 : 1;
    });

    const runningPositions = {};
    const realizedGainsOnRows = {};

    chronological.forEach((asset) => {
      const sym = asset.symbol;
      if (!runningPositions[sym])
        runningPositions[sym] = { shares: 0, cost: 0 };

      const qty = Math.abs(asset.quantity);

      if (asset.type === 'buy') {
        runningPositions[sym].shares += qty;
        runningPositions[sym].cost += asset.total;
      } else if (asset.type === 'sell') {
        const avgCost =
          runningPositions[sym].shares > 1e-6
            ? runningPositions[sym].cost / runningPositions[sym].shares
            : 0;
        const costOfSold = avgCost * qty;
        realizedGainsOnRows[asset.id] = asset.total - costOfSold;

        runningPositions[sym].shares -= qty;
        runningPositions[sym].cost -= costOfSold;
      }
    });

    displayInvs.forEach((asset) => {
      const currentData = marketDataCache[asset.symbol];
      const currentPrice = currentData ? currentData.price : asset.price;
      const currentValue = currentPrice * asset.quantity;

      let gainLoss, isGain, gainPct, displayVal, displaySubtitle;

      if (asset.type === 'deposit') {
        gainLoss = 0;
        isGain = true;
        gainPct = 0;
        displayVal = `$ ${asset.quantity.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`;
        displaySubtitle = `Account Funding • Cash Deposit`;
      } else if (asset.type === 'buy') {
        gainLoss = currentValue - asset.total;
        isGain = gainLoss >= 0;
        gainPct = asset.total > 0 ? (gainLoss / asset.total) * 100 : 0;
        displayVal = `$ ${currentValue.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`;
        displaySubtitle = `${asset.type} • ${
          asset.quantity
        } shares @ $${asset.price.toFixed(2)}`;
      } else {
        gainLoss = realizedGainsOnRows[asset.id] || 0;
        isGain = gainLoss >= 0;
        const costOfSale = asset.total - gainLoss;
        gainPct = costOfSale > 0 ? (gainLoss / costOfSale) * 100 : 0;
        displayVal = `$ ${asset.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
        })}`;
        displaySubtitle = `${asset.type} • ${
          asset.quantity
        } shares @ $${asset.price.toFixed(2)}`;
      }

      const card = `
        <div class="card flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${
              asset.type === 'deposit'
                ? 'bg-blue-500/10 text-blue-400'
                : asset.type === 'buy'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-rose-500/10 text-rose-400'
            }">
                ${asset.symbol === '$CASH' ? 'CASH' : asset.symbol}
            </div>
            <div>
              <p class="text-sm font-semibold text-zinc-200">${
                asset.symbol === '$CASH' ? 'Cash Deposit' : asset.symbol
              }</p>
              <p class="text-[11px] text-muted uppercase tracking-wider">${displaySubtitle}</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm font-bold text-zinc-100">${displayVal}</p>
              ${
                asset.type !== 'deposit'
                  ? `
              <p class="text-[10px] ${
                isGain ? 'text-emerald-400' : 'text-rose-400'
              }">
                ${isGain ? '+' : ''}$${gainLoss.toFixed(2)} (${gainPct.toFixed(
                      2
                    )}%)
              </p>`
                  : `<p class="text-[10px] text-zinc-500 italic">Balance Increase</p>`
              }
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="btn-edit-inv p-1.5 hover:bg-zinc-800 rounded text-muted hover:text-zinc-100 transition-colors" data-id="${
                asset.id
              }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-delete-inv p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors" data-id="${
                asset.id
              }">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>`;

      const div = document.createElement('div');
      div.innerHTML = card.trim();
      const finalCard = div.firstChild;
      finalCard.querySelector('.btn-edit-inv').onclick = () =>
        editTransaction(asset.id);
      finalCard.querySelector('.btn-delete-inv').onclick = () =>
        deleteTransaction(asset.id);
      investmentList.appendChild(finalCard);
    });
  }

  if (isInitialRender && skeleton) {
    skeleton.classList.add('hidden');
    investmentList.classList.remove('hidden');
  }
}

async function updateSummary() {
  const investments = (await Store.get('investments')) || [];

  // CRITICAL: Sort chronologically + ensure Deposits happen first
  const chronological = [...investments].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeA - timeB;
    if (a.type === b.type) return 0;
    if (a.type === 'deposit') return -1;
    if (b.type === 'deposit') return 1;
    return a.type === 'buy' ? -1 : 1;
  });

  const positions = {};
  let realizedGain = 0;
  let totalDeposited = 0;
  let cashBalance = 0; // Total liquid cash in the account

  chronological.forEach((asset) => {
    if (asset.type === 'deposit') {
      cashBalance += asset.quantity; // Increase cash by deposit amount
      totalDeposited += asset.quantity;
      return;
    }

    const symbol = asset.symbol;
    if (!positions[symbol]) {
      positions[symbol] = { shares: 0, costBasis: 0 };
    }

    const qty = Math.abs(asset.quantity);

    if (asset.type === 'buy') {
      positions[symbol].shares += qty;
      positions[symbol].costBasis += asset.total;
      cashBalance -= asset.total; // Decrease cash by total cost
    } else {
      cashBalance += asset.total; // Increase cash by proceeds

      const avgCostPerShare =
        positions[symbol].shares > 1e-6
          ? positions[symbol].costBasis / positions[symbol].shares
          : 0;
      const costOfSharesSold = avgCostPerShare * qty;

      positions[symbol].shares -= qty;
      positions[symbol].costBasis -= costOfSharesSold;
      realizedGain += asset.total - costOfSharesSold;
    }
  });

  // Step 2: Calculate current value of assets
  let totalCurrentAssetValue = 0;
  let totalUnrealized = 0;

  Object.keys(positions).forEach((symbol) => {
    const pos = positions[symbol];
    if (pos.shares > 1e-6) {
      const currentData = marketDataCache[symbol];
      const currentPrice = currentData ? currentData.price : 0;
      const currentValue = currentPrice * pos.shares;

      totalCurrentAssetValue += currentValue;
      totalUnrealized += currentValue - pos.costBasis;
    }
  });

  // Step 3: Update UI elements
  // Net Worth = Current Assets + Remaining Cash (from Deposits & Sells)
  const netWorth = totalCurrentAssetValue + cashBalance;
  const totalReturn = realizedGain + totalUnrealized;

  const portfolioUsd = document.getElementById('portfolio-usd');
  if (portfolioUsd) {
    portfolioUsd.textContent = `$ ${netWorth.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;
  }
  const portfolioRealized = document.getElementById('portfolio-realized');
  if (portfolioRealized) {
    portfolioRealized.textContent = `$ ${realizedGain.toLocaleString(
      undefined,
      { minimumFractionDigits: 2 }
    )}`;
    portfolioRealized.className = `text-2xl font-bold font-mono ${
      realizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'
    }`;
  }
  const portfolioUnrealized = document.getElementById('portfolio-unrealized');
  if (portfolioUnrealized) {
    portfolioUnrealized.textContent = `$ ${totalUnrealized.toLocaleString(
      undefined,
      { minimumFractionDigits: 2 }
    )}`;
    portfolioUnrealized.className = `text-2xl font-bold font-mono ${
      totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'
    }`;
  }
  const portfolioPerf = document.getElementById('portfolio-performance');
  if (portfolioPerf) {
    portfolioPerf.textContent = `$ ${totalReturn.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;
    portfolioPerf.className = `text-2xl font-bold font-mono ${
      totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
    }`;
  }

  const dashVal = document.getElementById('stat-portfolio-val');
  if (dashVal) {
    dashVal.textContent = `$ ${netWorth.toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;
  }

  const countEl = document.getElementById('portfolio-holdings-count');
  if (countEl) {
    const positionCount = Object.keys(positions).filter(
      (s) => positions[s].shares > 1e-6
    ).length;
    countEl.textContent = positionCount;
  }

  // Trigger Analytics
  await renderPortfolioChart();
  await renderAllocationChart(positions, totalCurrentAssetValue);
  await renderHoldingsBreakdown(positions, totalCurrentAssetValue);
}

/**
 * Phase 2: Allocation Donut Chart (Chart.js)
 */
let allocationChartInstance = null;

const CHART_COLORS = [
  '#10b981',
  '#38bdf8',
  '#a78bfa',
  '#f59e0b',
  '#f43f5e',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
];

async function renderAllocationChart(positions, totalCurrent) {
  const canvas = document.getElementById('allocation-chart');
  const legend = document.getElementById('allocation-legend');
  const centerVal = document.getElementById('allocation-center-value');
  if (!canvas || typeof Chart === 'undefined') return;

  // Build data from aggregated positions
  const holdingData = [];
  Object.keys(positions).forEach((symbol) => {
    const pos = positions[symbol];
    if (pos.shares > 1e-6) {
      const currentData = marketDataCache[symbol];
      const currentPrice = currentData ? currentData.price : 0;
      const value = currentPrice * pos.shares;
      holdingData.push({ symbol, value });
    }
  });

  // Sort by value descending
  holdingData.sort((a, b) => b.value - a.value);

  if (holdingData.length === 0) {
    if (allocationChartInstance) {
      allocationChartInstance.destroy();
      allocationChartInstance = null;
    }
    if (centerVal) centerVal.textContent = '—';
    if (legend) legend.innerHTML = '';
    return;
  }

  const labels = holdingData.map((h) => h.symbol);
  const values = holdingData.map((h) => h.value);
  const colors = holdingData.map(
    (_, i) => CHART_COLORS[i % CHART_COLORS.length]
  );

  // Center label
  if (centerVal) centerVal.textContent = holdingData.length;

  // Render legend
  if (legend) {
    legend.innerHTML = holdingData
      .map((h, i) => {
        const pct =
          totalCurrent > 0 ? ((h.value / totalCurrent) * 100).toFixed(1) : 0;
        return `<span class="flex items-center gap-1.5 text-zinc-400">
                <span class="w-2 h-2 rounded-full inline-block" style="background:${colors[i]}"></span>
                ${h.symbol} ${pct}%
            </span>`;
      })
      .join('');
  }

  // Destroy previous instance
  if (allocationChartInstance) allocationChartInstance.destroy();

  allocationChartInstance = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: 'rgba(9,9,11,0.8)',
          borderWidth: 2,
          hoverBorderColor: 'rgba(255,255,255,0.15)',
          hoverBorderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(24,24,27,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          titleColor: '#e4e4e7',
          bodyColor: '#a1a1aa',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const val = ctx.parsed;
              const pct =
                totalCurrent > 0 ? ((val / totalCurrent) * 100).toFixed(1) : 0;
              return ` $${val.toLocaleString(undefined, {
                minimumFractionDigits: 2,
              })} · ${pct}%`;
            },
          },
        },
      },
      animation: {
        animateRotate: true,
        duration: 800,
        easing: 'easeOutQuart',
      },
    },
  });
}

/**
 * Phase 2: Holdings Breakdown Table
 */
async function renderHoldingsBreakdown(positions, totalCurrent) {
  const tbody = document.getElementById('holdings-breakdown-body');
  const empty = document.getElementById('holdings-empty');
  if (!tbody) return;

  const rows = [];
  Object.keys(positions).forEach((symbol) => {
    const pos = positions[symbol];
    if (pos.shares > 1e-6) {
      const currentData = marketDataCache[symbol];
      const currentPrice = currentData ? currentData.price : 0;
      const avgCost = pos.costBasis / pos.shares;
      const value = currentPrice * pos.shares;
      const pl = value - pos.costBasis;
      const plPct = pos.costBasis > 0 ? (pl / pos.costBasis) * 100 : 0;
      const weight = totalCurrent > 0 ? (value / totalCurrent) * 100 : 0;
      rows.push({
        symbol,
        shares: pos.shares,
        avgCost,
        currentPrice,
        value,
        pl,
        plPct,
        weight,
      });
    }
  });

  // Sort by value descending
  rows.sort((a, b) => b.value - a.value);

  if (rows.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  tbody.innerHTML = rows
    .map((r) => {
      const isGain = r.pl >= 0;
      const plColor = isGain ? 'text-emerald-400' : 'text-rose-400';
      const plSign = isGain ? '+' : '';
      return `
            <tr class="group hover:bg-white/[0.02] transition-colors">
                <td class="py-3 font-bold text-zinc-200">${r.symbol}</td>
                <td class="py-3 text-right text-zinc-400 font-mono">${
                  r.shares
                }</td>
                <td class="py-3 text-right text-zinc-400 font-mono">$${r.avgCost.toFixed(
                  2
                )}</td>
                <td class="py-3 text-right text-zinc-300 font-mono font-semibold">$${r.currentPrice.toFixed(
                  2
                )}</td>
                <td class="py-3 text-right text-zinc-200 font-mono font-semibold">$${r.value.toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 }
                )}</td>
                <td class="py-3 text-right font-mono ${plColor}">${plSign}$${r.pl.toFixed(
        2
      )} <span class="text-[10px] opacity-70">(${plSign}${r.plPct.toFixed(
        1
      )}%)</span></td>
                <td class="py-3 text-right text-zinc-400 font-mono">${r.weight.toFixed(
                  1
                )}%</td>
            </tr>
        `;
    })
    .join('');
}

/**
 * Renders a Linear Area Chart in the background of the Asset Ledger
 */
async function renderPortfolioChart() {
  const svg = document.getElementById('portfolio-chart-svg');
  const pathLine = document.getElementById('chart-line');
  const pathArea = document.getElementById('chart-area');
  if (!svg || !pathLine || !pathArea) return;

  const investments = (await Store.get('investments')) || [];
  if (investments.length < 2) {
    pathLine.setAttribute('d', '');
    pathArea.setAttribute('d', '');
    return;
  }

  // 1. Sort by date and calculate cumulative value
  const sorted = [...investments].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  let history = [];
  let runningTotal = 0;

  sorted.forEach((inv) => {
    const amount = inv.quantity * inv.price;
    if (inv.type === 'buy') runningTotal += amount;
    else runningTotal -= amount;

    history.push({
      date: new Date(inv.date).getTime(),
      value: runningTotal,
    });
  });

  // 2. Map coordinates (Viewbox is 0 0 100 100)
  const minTime = history[0].date;
  const maxTime = Math.max(history[history.length - 1].date, Date.now());
  const timeRange = maxTime - minTime || 1;

  // Find min/max value for Y scaling
  const values = history.map((h) => h.value);
  const maxVal = Math.max(...values, 10); // Safeguard minimum
  const minVal = Math.min(...values, 0);
  const valRange = maxVal - minVal || 100; // Default range to avoid divide by zero

  const points = history.map((h) => {
    const x = ((h.date - minTime) / timeRange) * 100;
    const y = 100 - (((h.value - minVal) / valRange) * 70 + 15); // Better padding for visibility
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  // 3. Construct Paths
  const lineD = `M ${points.join(' L ')}`;
  const areaD = `${lineD} L 100,100 L 0,100 Z`;

  pathLine.setAttribute('d', lineD);
  pathArea.setAttribute('d', areaD);

  // Update colors based on overall performance
  const isGain = runningTotal >= 0;
  const color = isGain ? '#10b981' : '#f43f5e';
  pathLine.setAttribute('stroke', color);

  const gradStop0 = document.querySelector('#chart-grad stop:first-child');
  const gradStop1 = document.querySelector('#chart-grad stop:last-child');
  if (gradStop0) gradStop0.setAttribute('stop-color', color);
  if (gradStop1) gradStop1.setAttribute('stop-color', color);
}

async function deleteTransaction(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    await Store.remove('investments', id);
    await renderInvestments();
    await updateSummary();
  }
}

async function editTransaction(id) {
  const invs = (await Store.get('investments')) || [];
  const asset = invs.find((i) => i.id === id);
  if (!asset) return;
  editingInvestmentId = id;
  document.getElementById('investment-symbol').value = asset.symbol;
  document.getElementById('investment-price').value = asset.price;
  document.getElementById('investment-quantity').value = asset.quantity;
  document.getElementById('investment-commission').value = asset.commission;
  document.getElementById('investment-date').value = asset.date;
  document.getElementById('investment-notes').value = asset.notes;
  document.getElementById('modal-investment-title').textContent =
    'Edit Position';
  document.getElementById('modal-investment').classList.add('open');
}

async function initMarketMovers() {
  const list = document.getElementById('market-movers-list');
  if (!list) return;

  // Use batch endpoint: 1 API call instead of 10
  const [movers] = await Promise.all([
    API.fetchMarketMovers(),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);

  if (!movers) {
    list.innerHTML =
      '<p class="text-xs text-muted py-4 text-center">Market data unavailable. Check back tomorrow when API resets.</p>';
    return;
  }

  const { gainers, losers } = movers;

  // Clear skeletons and inject real data
  list.innerHTML = '';

  gainers.forEach((stock) => {
    list.insertAdjacentHTML(
      'beforeend',
      `<div class="flex items-center justify-between group animate-in"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg></div><div><p class="text-sm font-bold text-zinc-200">${
        stock.ticker
      }</p><p class="text-[10px] text-muted uppercase">Stock</p></div></div><div class="text-right"><p class="text-sm font-bold text-emerald-400">+$${stock.change.toFixed(
        2
      )}</p><p class="text-[10px] font-mono text-emerald-500/70">+${stock.changesPercentage.toFixed(
        2
      )}%</p></div></div>`
    );
  });

  losers.forEach((stock) => {
    list.insertAdjacentHTML(
      'beforeend',
      `<div class="flex items-center justify-between group pt-2 border-t border-border/50 animate-in"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center text-rose-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div><p class="text-sm font-bold text-zinc-200">${
        stock.ticker
      }</p><p class="text-[10px] text-muted uppercase">Stock</p></div></div><div class="text-right"><p class="text-sm font-bold text-rose-400">-$${Math.abs(
        stock.change
      ).toFixed(
        2
      )}</p><p class="text-[10px] font-mono text-rose-500/70">${stock.changesPercentage.toFixed(
        2
      )}%</p></div></div>`
    );
  });
}
