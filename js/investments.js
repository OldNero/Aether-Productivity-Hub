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
    let totalValue = priceValue * quantityValue + commissionValue;
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
    let investments = await Store.get('investments') || [];
    const transactionData = {
      type: investmentTypeArr.value,
      symbol: symbolInput.value.trim().toUpperCase(),
      price: Number(priceInput.value),
      quantity: Number(quantityInput.value),
      commission: Number(commissionInput.value),
      date: dateInput.value || new Date().toISOString().split('T')[0],
      notes: notesInput.value,
      total:
        Number(priceInput.value) * Number(quantityInput.value) +
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

  await renderInvestments();
  await updateSummary();
  
  console.log('Aether: Starting Market Movers fetch (1s minimum)...');
  await initMarketMovers();
  console.log('Aether: Market Movers rendered.');
  
  startLivePriceUpdates();
};

function startLivePriceUpdates() {
  updateLivePrices();
  setInterval(updateLivePrices, 30000);
}

async function updateLivePrices() {
  const investments = await Store.get('investments') || [];
  const symbols = [...new Set(investments.map((i) => i.symbol))];
  for (const symbol of symbols) {
    if (!marketDataCache[symbol]) {
      const data = await API.fetchStockPrice(symbol);
      if (data) marketDataCache[symbol] = data;
    }
  }
  await renderInvestments();
  await updateSummary();
}

async function renderInvestments() {
  const investmentList = document.getElementById('investment-list');
  const emptyState = document.getElementById('investments-empty-state');
  if (!investmentList) return;
  const investments = await Store.get('investments') || [];
  investmentList.innerHTML = '';
  if (investments.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');
    investments.forEach((asset) => {
      const currentData = marketDataCache[asset.symbol];
      const currentPrice = currentData ? currentData.price : asset.price;
      const currentValue = currentPrice * asset.quantity;
      const costBasis = asset.total;
      const gainLoss =
        asset.type === 'buy'
          ? currentValue - costBasis
          : costBasis - currentValue;
      const isGain = gainLoss >= 0;
      const gainPct = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
      const card = `<div class="card flex items-center justify-between group"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${asset.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">${asset.symbol}</div><div><p class="text-sm font-semibold text-zinc-200">${asset.symbol}</p><p class="text-[11px] text-muted uppercase tracking-wider">${asset.type} • ${asset.quantity} shares @ $${asset.price.toFixed(2)}</p></div></div><div class="flex items-center gap-4"><div class="text-right"><p class="text-sm font-bold text-zinc-100">$ ${currentValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p class="text-[10px] ${isGain ? 'text-emerald-400' : 'text-rose-400'}">${isGain ? '+' : ''}$${gainLoss.toFixed(2)} (${gainPct.toFixed(2)}%)</p></div><div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button class="btn-edit-inv p-1.5 hover:bg-zinc-800 rounded text-muted hover:text-zinc-100 transition-colors" data-id="${asset.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button><button class="btn-delete-inv p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors" data-id="${asset.id}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></div></div></div>`;
      const div = document.createElement('div');
      div.innerHTML = card.trim();
      const finalCard = div.firstChild;
      finalCard.querySelector('.btn-edit-inv').onclick = async () =>
        await editTransaction(asset.id);
      finalCard.querySelector('.btn-delete-inv').onclick = async () =>
        await deleteTransaction(asset.id);
      investmentList.appendChild(finalCard);
    });
  }
}

async function updateSummary() {
  const investments = await Store.get('investments') || [];

  const positions = {};
  let realizedGain = 0;

  // Step 1: Aggregate transactions by symbol
  investments.forEach((asset) => {
    const symbol = asset.symbol;
    if (!positions[symbol]) {
      positions[symbol] = { shares: 0, costBasis: 0 };
    }

    if (asset.type === 'buy') {
      positions[symbol].shares += asset.quantity;
      positions[symbol].costBasis += asset.total;
    } else {
      // Sell: calculate realized gain/loss using average cost
      const sellQuantity = asset.quantity;
      const sellProceeds = asset.total;

      if (positions[symbol].shares > 0) {
        const avgCostPerShare =
          positions[symbol].costBasis / positions[symbol].shares;
        const sharesToSell = Math.min(positions[symbol].shares, sellQuantity);
        const costOfSharesSold = avgCostPerShare * sharesToSell;

        positions[symbol].shares -= sharesToSell;
        positions[symbol].costBasis -= costOfSharesSold;

        realizedGain += sellProceeds - costOfSharesSold;
      }
    }
  });

  // Step 2: Calculate current value and unrealized gain
  let totalCurrent = 0;
  let totalUnrealized = 0;

  Object.keys(positions).forEach((symbol) => {
    const pos = positions[symbol];
    if (pos.shares > 0) {
      const currentData = marketDataCache[symbol];
      const currentPrice = currentData ? currentData.price : 0;
      const currentValue = currentPrice * pos.shares;

      totalCurrent += currentValue;
      totalUnrealized += currentValue - pos.costBasis;
    }
  });

  // Step 3: Update UI elements
  const netWorth = totalCurrent;
  const totalReturn = realizedGain + totalUnrealized;

  const portfolioUsd = document.getElementById('portfolio-usd');
  if (portfolioUsd) {
    portfolioUsd.textContent = `$ ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  const portfolioRealized = document.getElementById('portfolio-realized');
  if (portfolioRealized) {
    portfolioRealized.textContent = `$ ${realizedGain.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    portfolioRealized.className = `text-2xl font-bold font-mono ${realizedGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }
  const portfolioUnrealized = document.getElementById('portfolio-unrealized');
  if (portfolioUnrealized) {
    portfolioUnrealized.textContent = `$ ${totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    portfolioUnrealized.className = `text-2xl font-bold font-mono ${totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }
  const portfolioPerf = document.getElementById('portfolio-performance');
  if (portfolioPerf) {
    portfolioPerf.textContent = `$ ${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    portfolioPerf.className = `text-2xl font-bold font-mono ${totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }
  const dashVal = document.getElementById('stat-portfolio-val');
  if (dashVal) {
    dashVal.textContent = `$ ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }
  const countEl = document.getElementById('portfolio-holdings-count');
  if (countEl) {
    const positionCount = Object.keys(positions).filter(
      (s) => positions[s].shares > 0
    ).length;
    countEl.textContent = positionCount;
  }

  // Trigger Background Chart Rendering
  await renderPortfolioChart();
}

/**
 * Renders a Linear Area Chart in the background of the Asset Ledger
 */
async function renderPortfolioChart() {
  const svg = document.getElementById('portfolio-chart-svg');
  const pathLine = document.getElementById('chart-line');
  const pathArea = document.getElementById('chart-area');
  if (!svg || !pathLine || !pathArea) return;

  const investments = await Store.get('investments') || [];
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
    let invs = await Store.get('investments') || [];
    invs = invs.filter((i) => i.id !== id);
    await Store.set('investments', invs);
    await renderInvestments();
    await updateSummary();
  }
}

async function editTransaction(id) {
  const invs = await Store.get('investments') || [];
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
    new Promise(resolve => setTimeout(resolve, 1000))
  ]);

  if (!movers) {
    list.innerHTML = '<p class="text-xs text-muted py-4 text-center">Market data unavailable. Check back tomorrow when API resets.</p>';
    return;
  }

  const { gainers, losers } = movers;

  // Clear skeletons and inject real data
  list.innerHTML = '';

  gainers.forEach((stock) => {
    list.insertAdjacentHTML(
      'beforeend',
      `<div class="flex items-center justify-between group animate-in"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg></div><div><p class="text-sm font-bold text-zinc-200">${stock.ticker}</p><p class="text-[10px] text-muted uppercase">Stock</p></div></div><div class="text-right"><p class="text-sm font-bold text-emerald-400">+$${stock.change.toFixed(2)}</p><p class="text-[10px] font-mono text-emerald-500/70">+${stock.changesPercentage.toFixed(2)}%</p></div></div>`
    );
  });

  losers.forEach((stock) => {
    list.insertAdjacentHTML(
      'beforeend',
      `<div class="flex items-center justify-between group pt-2 border-t border-border/50 animate-in"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center text-rose-400"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg></div><div><p class="text-sm font-bold text-zinc-200">${stock.ticker}</p><p class="text-[10px] text-muted uppercase">Stock</p></div></div><div class="text-right"><p class="text-sm font-bold text-rose-400">-$${Math.abs(stock.change).toFixed(2)}</p><p class="text-[10px] font-mono text-rose-500/70">${stock.changesPercentage.toFixed(2)}%</p></div></div>`
    );
  });
}
