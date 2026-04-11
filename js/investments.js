'use strict';

/**
 * Investment Management Module
 */

let editingInvestmentId = null;

window.initInvestments = function() {
  console.log("Aether: Initializing Investments Module...");

  // --- DOM Selectors (Scoped inside init) ---
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

  if (!investmentForm) return; // Fragment not loaded yet

  // --- Helper Functions (Scoped) ---

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
      item.className = 'px-4 py-2 hover:bg-zinc-800 cursor-pointer transition-colors border-b border-white/5 last:border-0';
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <span class="text-sm font-bold text-zinc-100">${match.s}</span>
          <span class="text-[10px] text-muted truncate ml-2">${match.n}</span>
        </div>
      `;
      item.onmousedown = () => {
        symbolInput.value = match.s;
        symbolSuggestions.classList.add('hidden');
        autoFetchPrice(match.s);
      };
      symbolSuggestions.appendChild(item);
    });
    symbolSuggestions.classList.remove('hidden');
  };

  // --- Listeners ---

  if (addInvestmentBtn) {
    addInvestmentBtn.onclick = () => {
      editingInvestmentId = null;
      investmentForm.reset();
      document.getElementById('modal-investment-title').textContent = 'Add New Position';
      calculateTransactionTotal();
      investmentModal.classList.add('open');
    };
  }

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

  investmentForm.onsubmit = (e) => {
    e.preventDefault();
    let investments = Store.get('investments') || [];
    const transactionData = {
      type: investmentTypeArr.value,
      symbol: symbolInput.value.trim().toUpperCase(),
      price: Number(priceInput.value),
      quantity: Number(quantityInput.value),
      commission: Number(commissionInput.value),
      date: dateInput.value || new Date().toISOString().split('T')[0],
      notes: notesInput.value,
      total: Number(priceInput.value) * Number(quantityInput.value) + Number(commissionInput.value),
    };

    if (editingInvestmentId) {
      investments = investments.map((inv) =>
        inv.id === editingInvestmentId ? { ...transactionData, id: inv.id } : inv
      );
    } else {
      investments.unshift({ ...transactionData, id: Date.now() });
    }

    Store.set('investments', investments);
    investmentForm.reset();
    investmentModal.classList.remove('open');
    editingInvestmentId = null;
    renderInvestments();
    updateSummary();
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
        const matches = STOCK_SYMBOLS.filter(s => s.s.startsWith(query) || s.n.toUpperCase().includes(query)).slice(0, 10);
        renderSuggestions(matches);
      }, 150);
    };
    symbolInput.onblur = () => {
      setTimeout(() => {
        symbolSuggestions.classList.add('hidden');
        if (symbolInput.value) autoFetchPrice(symbolInput.value.trim().toUpperCase());
      }, 200);
    };
  }

  // Initial Run
  renderInvestments();
  updateSummary();
  initMarketMovers();
};

function renderInvestments() {
  const investmentList = document.getElementById('investment-list');
  const emptyState = document.getElementById('investments-empty-state');
  if (!investmentList) return;

  const investments = Store.get('investments') || [];
  investmentList.innerHTML = '';

  if (investments.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
  } else {
    if (emptyState) emptyState.classList.add('hidden');
    investments.forEach((asset) => {
      const card = `
        <div class="card flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs 
              ${asset.type === 'buy' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}">
              ${asset.symbol}
            </div>
            <div>
              <p class="text-sm font-semibold text-zinc-200">${asset.symbol}</p>
              <p class="text-[11px] text-muted uppercase tracking-wider">${asset.type} • ${asset.quantity} shares</p>
            </div>
          </div>
          <div class="flex items-center gap-4">
            <div class="text-right">
              <p class="text-sm font-bold text-zinc-100">$ ${asset.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p class="text-[10px] text-muted">${asset.date}</p>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button class="btn-edit-inv p-1.5 hover:bg-zinc-800 rounded text-muted hover:text-zinc-100 transition-colors" data-id="${asset.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>
              <button class="btn-delete-inv p-1.5 hover:bg-rose-500/10 rounded text-muted hover:text-rose-400 transition-colors" data-id="${asset.id}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
      const div = document.createElement('div');
      div.innerHTML = card.trim();
      const finalCard = div.firstChild;

      finalCard.querySelector('.btn-edit-inv').onclick = () => editTransaction(asset.id);
      finalCard.querySelector('.btn-delete-inv').onclick = () => deleteTransaction(asset.id);
      investmentList.appendChild(finalCard);
    });
  }
}

function updateSummary() {
  const investments = Store.get('investments') || [];
  const totalNetWorth = investments.reduce((sum, asset) => sum + asset.total, 0);
  const formattedTotal = '$ ' + totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2 });

  const portfolioUsd = document.getElementById('portfolio-usd');
  if (portfolioUsd) portfolioUsd.textContent = formattedTotal;

  const dashVal = document.getElementById('stat-portfolio-val');
  if (dashVal) dashVal.textContent = formattedTotal;

  const countEl = document.getElementById('portfolio-holdings-count');
  if (countEl) countEl.textContent = investments.length;
}

function deleteTransaction(id) {
  if (confirm('Are you sure you want to delete this transaction?')) {
    let invs = Store.get('investments') || [];
    invs = invs.filter(i => i.id !== id);
    Store.set('investments', invs);
    renderInvestments();
    updateSummary();
  }
}

function editTransaction(id) {
  const invs = Store.get('investments') || [];
  const asset = invs.find(i => i.id === id);
  if (!asset) return;

  editingInvestmentId = id;
  const symbolInput = document.getElementById('investment-symbol');
  const priceInput = document.getElementById('investment-price');
  const quantityInput = document.getElementById('investment-quantity');
  const commissionInput = document.getElementById('investment-commission');
  const dateInput = document.getElementById('investment-date');
  const notesInput = document.getElementById('investment-notes');

  symbolInput.value = asset.symbol;
  priceInput.value = asset.price;
  quantityInput.value = asset.quantity;
  commissionInput.value = asset.commission;
  dateInput.value = asset.date;
  notesInput.value = asset.notes;

  document.getElementById('modal-investment-title').textContent = 'Edit Position';
  document.getElementById('modal-investment').classList.add('open');
}

async function initMarketMovers() {
  const list = document.getElementById('market-movers-list');
  if (!list) return;
  const tickers = ['NVDA', 'AAPL', 'TSLA', 'NFLX'];
  const data = [];
  for (const t of tickers) {
    const res = await API.fetchStockPrice(t);
    if (res) data.push(res);
  }
  
  list.innerHTML = '';
  data.forEach(stock => {
    const isPos = stock.change >= 0;
    const item = `
      <div class="flex items-center justify-between group">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded bg-${isPos?'emerald':'rose'}-500/10 flex items-center justify-center text-${isPos?'emerald':'rose'}-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="${isPos?'18 15 12 9 6 15':'6 9 12 15 18 9'}"/>
            </svg>
          </div>
          <div><p class="text-sm font-bold text-zinc-200">${stock.ticker}</p><p class="text-[10px] text-muted uppercase">${stock.name||'Stock'}</p></div>
        </div>
        <div class="text-right"><p class="text-sm font-bold text-${isPos?'emerald':'rose'}-400">${isPos?'+':''}$${stock.change.toFixed(2)}</p><p class="text-[10px] font-mono text-${isPos?'emerald':'rose'}-500/70">${isPos?'+':''}${stock.changesPercentage.toFixed(2)}%</p></div>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', item);
  });
}
