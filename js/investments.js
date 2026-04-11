'use strict';

// --- DOM Selectors ---
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

const totalDisplay = document.getElementById('investment-total-display');
const investmentList = document.getElementById('investment-list');
const emptyState = document.getElementById('investments-empty-state');
const dashPortfolioVal = document.getElementById('stat-portfolio-val');
const portfolioHoldingsCount = document.getElementById(
  'portfolio-holdings-count'
);

// Modal Elements
const addInvestmentBtn = document.getElementById('add-investment-btn');
const investmentModal = document.getElementById('modal-investment');

// Open Modal
addInvestmentBtn.addEventListener('click', () => {
  investmentModal.classList.add('open');
});

window.addEventListener('click', (e) => {
  if (
    investmentModal.classList.contains('open') &&
    e.target === investmentModal
  ) {
    investmentModal.classList.remove('open');
  }
});

// --- State ---
let investments = Store.get('investments');
if (!Array.isArray(investments)) {
  investments = [];
}

function calculateTransactionTotal() {
  let priceValue = Number(priceInput.value);
  let quantityValue = Number(quantityInput.value);
  let commissionValue = Number(commissionInput.value);

  let totalValue = priceValue * quantityValue + commissionValue;

  totalDisplay.textContent = '$ ' + totalValue.toFixed(2);
}

[priceInput, quantityInput, commissionInput].forEach((input) => {
  input.addEventListener('input', calculateTransactionTotal);
});

btnTypeBuy.addEventListener('click', () => {
  investmentTypeArr.value = 'buy';
  btnTypeBuy.classList.add('btn-type-buy-active');
  btnTypeSell.classList.remove('btn-type-sell-active', 'text-zinc-300');
  btnTypeSell.classList.add('text-muted');

  calculateTransactionTotal();
});

btnTypeSell.addEventListener('click', () => {
  investmentTypeArr.value = 'sell';
  btnTypeSell.classList.add('btn-type-sell-active');
  btnTypeBuy.classList.remove('btn-type-buy-active', 'text-zinc-300');
  btnTypeBuy.classList.add('text-muted');

  calculateTransactionTotal();
});

investmentForm.addEventListener('submit', (e) => {
  e.preventDefault();

  let newTransaction = {
    id: Date.now(),
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

  investments = [...investments, newTransaction];
  Store.set('investments', investments);

  investmentForm.reset();
  investmentModal.classList.remove('open');

  renderInvestments();
  updateSummary();
});

function renderInvestments() {
  investmentList.innerHTML = '';

  if (investments.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');

    investments.forEach((asset) => {
      const card = `
        <div class="card flex items-center justify-between group">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs 
              ${
                asset.type === 'buy'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-500/10 text-rose-400'
              }">
              ${asset.symbol}
            </div>
            <div>
              <p class="text-sm font-semibold text-zinc-200">${asset.symbol}</p>
              <p class="text-[11px] text-muted uppercase tracking-wider">${
                asset.type
              } • ${asset.quantity} shares</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-zinc-100">$ ${asset.total.toLocaleString(
              undefined,
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}</p>
            <p class="text-[10px] text-muted">${asset.date}</p>
          </div>
        </div>
      `;
      investmentList.insertAdjacentHTML('beforeend', card);
    });
  }
}

function updateSummary() {
  const totalNetWorth = investments.reduce(
    (sum, asset) => sum + asset.total,
    0
  );
  const positionCount = investments.length;

  const formattedTotal =
    '$ ' +
    totalNetWorth.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // Update Portfolio View
  const portfolioUsd = document.getElementById('portfolio-usd');
  if (portfolioUsd) portfolioUsd.textContent = formattedTotal;

  if (dashPortfolioVal) dashPortfolioVal.textContent = formattedTotal;
  if (portfolioHoldingsCount)
    portfolioHoldingsCount.textContent = positionCount;
}

// Initialize
function initInvestments() {
  renderInvestments();
  updateSummary();
}

initInvestments();
