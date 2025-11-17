const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const COLS = 50;
const ROWS = 50;
const PIXEL = 12;
const BLOQCOINS_PER_BLOCK = 100;
const BLOQCOIN_PER_PIXEL = 1 / 80; // 4 pixels = 0.05 bloqcoins

let lang = 'es';
let bloqcoins = 0;
let miningArea = 50;
let tempFilled = 0;
let totalVisibleCells = miningArea * miningArea;
let activeSquares = [];
let visibleStart = { row: 0, col: 0 };
let selectedSquare = null;
let squareHighlightTimeout = null;

const txt = {
  es: {
    loginTitle: 'Pixel Miner',
    walletTitle: 'Pixel Miner',
    loginBtn: 'Iniciar sesión',
    mineBtn: 'MINAR',
    walletLabel: 'Cartera',
    blocksText: 'Bloques',
    blockitsText: 'Bloqcoins',
    showPassText: 'Mostrar contraseña',
    mine: 'MINAR',
    wrong: 'Usuario o contraseña incorrectos',
    mineArea: 'Minar área',
    shop: 'Tienda',
    expand: 'Expandir área'
  },
  en: {
    loginTitle: 'Pixel Miner',
    walletTitle: 'Pixel Miner',
    loginBtn: 'Login',
    mineBtn: 'MINE',
    walletLabel: 'Wallet',
    blocksText: 'Blocks',
    blockitsText: 'Bloqcoins',
    showPassText: 'Show password',
    mine: 'MINE',
    wrong: 'Incorrect username or password',
    mineArea: 'Mine area',
    shop: 'Shop',
    expand: 'Expand area'
  }
};

const screens = {
  login: $('#loginScreen'),
  wallet: $('#walletScreen'),
  mining: $('#miningScreen')
};
function go(to) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  screens[to].classList.add('active');
}

function getCell(row, col) {
  return $('#grid').children[row * COLS + col];
}

// LOGIN
$('#loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const user = $('#userField').value.trim();
  const pass = $('#passField').value.trim();
  if (user === 'admin' && pass === '1234') {
    go('wallet');
    updateLang();
  } else {
    alert(txt[lang].wrong);
  }
});

$('#userField').addEventListener('input', () => $('#guideChar').src = 'guide_character_normal.png');
$('#passField').addEventListener('focus', () => $('#guideChar').src = 'guide_character_blind.png');
$('#showPass').addEventListener('change', e => {
  $('#passField').type = e.target.checked ? 'text' : 'password';
  $('#guideChar').src = e.target.checked ? 'guide_character_peek.png' : 'guide_character_blind.png';
});

// WALLET → MINING
$('#mineBtn').onclick = () => {
  go('mining');
  buildGrid();
};

function buildGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  tempFilled = 0;
  totalVisibleCells = miningArea * miningArea;
  activeSquares = [];
  $$('.cell.highlight').forEach(c => c.classList.remove('highlight'));
  $$('.cell.square-highlight').forEach(c => c.classList.remove('square-highlight'));

  const startCol = Math.floor((COLS - miningArea) / 2);
  const startRow = Math.floor((ROWS - miningArea) / 2);
  visibleStart = { row: startRow, col: startCol };

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const visible = r >= startRow && r < startRow + miningArea && c >= startCol && c < startCol + miningArea;
      cell.style.display = visible ? 'block' : 'none';
      cell.dataset.visible = visible ? '1' : '0';
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.onclick = () => clickPixel(cell);
      grid.appendChild(cell);
    }
  }

  updateProgress();
  detectSquares();
}

function refreshTempFilled() {
  tempFilled = $$('#grid .cell.filled[data-visible="1"]').length;
}

function clickPixel(cell) {
  if (cell.classList.contains('filled')) return;
  cell.classList.add('filled');
  tempFilled++;
  updateProgress();
  checkComplete();
  detectSquares();
}

function checkComplete() {
  const filled = $$('#grid .cell.filled[data-visible="1"]').length;

  if (filled === totalVisibleCells) {
    $$('#grid .cell').forEach(c => {
      if (c.dataset.visible === '1') c.classList.add('highlight');
    });
  }
}

function detectSquares() {
  activeSquares = [];
  clearSquareHighlights();

  const matrix = Array.from({ length: miningArea }, () => Array(miningArea).fill(0));
  const visibleCells = $$('#grid .cell[data-visible="1"]');
  visibleCells.forEach(cell => {
    const r = Number(cell.dataset.row) - visibleStart.row;
    const c = Number(cell.dataset.col) - visibleStart.col;
    if (r >= 0 && c >= 0 && r < miningArea && c < miningArea) {
      matrix[r][c] = cell.classList.contains('filled') ? 1 : 0;
    }
  });

  const pre = Array.from({ length: miningArea + 1 }, () => Array(miningArea + 1).fill(0));
  for (let r = 0; r < miningArea; r++) {
    for (let c = 0; c < miningArea; c++) {
      pre[r + 1][c + 1] = matrix[r][c] + pre[r][c + 1] + pre[r + 1][c] - pre[r][c];
    }
  }

  const getSum = (r1, c1, r2, c2) => pre[r2][c2] - pre[r1][c2] - pre[r2][c1] + pre[r1][c1];

  const squares = [];
  for (let size = 2; size <= miningArea; size++) {
    for (let r = 0; r <= miningArea - size; r++) {
      for (let c = 0; c <= miningArea - size; c++) {
        const sum = getSum(r, c, r + size, c + size);
        if (sum === size * size) {
          squares.push({ row: r + visibleStart.row, col: c + visibleStart.col, size });
        }
      }
    }
  }

  highlightSquareBorders(squares);
  activeSquares = squares;
}

function clearSquareHighlights() {
  if (squareHighlightTimeout) {
    clearTimeout(squareHighlightTimeout);
    squareHighlightTimeout = null;
  }
  $$('#grid .cell.square-highlight').forEach(c => c.classList.remove('square-highlight'));
}

function highlightSquareBorders(squares) {
  if (!squares.length) return;

  const cells = new Set();

  squares.forEach(sq => {
    for (let r = sq.row; r < sq.row + sq.size; r++) {
      for (let c = sq.col; c < sq.col + sq.size; c++) {
        if (r === sq.row || r === sq.row + sq.size - 1 || c === sq.col || c === sq.col + sq.size - 1) {
          cells.add(`${r},${c}`);
        }
      }
    }
  });

  cells.forEach(key => {
    const [r, c] = key.split(',').map(Number);
    const cell = getCell(r, c);
    if (cell) cell.classList.add('square-highlight');
  });

  squareHighlightTimeout = setTimeout(clearSquareHighlights, 2000);
}

// CONTEXT MENU
window.addEventListener('contextmenu', e => {
  const miningActive = screens.mining.classList.contains('active');
  if (!miningActive) return;
  e.preventDefault();
  const targetCell = e.target.closest('.cell[data-visible="1"]');
  const ctx = $('#ctxMenu');
  ctx.classList.add('hidden');

  let menuBuilt = false;

  if (targetCell) {
    const row = Number(targetCell.dataset.row);
    const col = Number(targetCell.dataset.col);
    const square = activeSquares.find(s => row >= s.row && row < s.row + s.size && col >= s.col && col < s.col + s.size);
    if (square) {
      selectedSquare = square;
      ctx.classList.remove('hidden');
      ctx.style.left = e.pageX + 'px';
      ctx.style.top = e.pageY + 'px';
      ctx.innerHTML = `
        <button onclick="mineSquare()">${txt[lang].mine} ${square.size}×${square.size}</button>
        <button onclick="showShop()">🛍️ ${txt[lang].shop}</button>
      `;
      menuBuilt = true;
    }
  }

  if (!menuBuilt) {
    const filled = $$('#grid .cell.filled[data-visible="1"]').length;
    if (filled === totalVisibleCells) {
      ctx.classList.remove('hidden');
      ctx.style.left = e.pageX + 'px';
      ctx.style.top = e.pageY + 'px';
      ctx.innerHTML = `
        <button onclick="mineArea()">${txt[lang].mineArea} ${miningArea}×${miningArea}</button>
        <button onclick="showShop()">🛍️ ${txt[lang].shop}</button>
      `;
    }
  }
});

window.mineArea = () => {
  const reward = miningArea * miningArea;
  bloqcoins += reward;
  tempFilled = 0;
  $$('.cell').forEach(c => c.classList.remove('filled', 'highlight', 'square-highlight'));
  $('#ctxMenu').classList.add('hidden');
  updateProgress();
  buildGrid();
};

window.mineSquare = () => {
  if (!selectedSquare) return;
  const area = selectedSquare.size * selectedSquare.size;
  const reward = Number((area * BLOQCOIN_PER_PIXEL).toFixed(4));
  bloqcoins += reward;

  for (let r = selectedSquare.row; r < selectedSquare.row + selectedSquare.size; r++) {
    for (let c = selectedSquare.col; c < selectedSquare.col + selectedSquare.size; c++) {
      const cell = getCell(r, c);
      cell.classList.remove('filled', 'square-highlight', 'highlight');
    }
  }

  $('#ctxMenu').classList.add('hidden');
  selectedSquare = null;
  refreshTempFilled();
  updateProgress();
  detectSquares();
};

window.showShop = () => {
  const next = miningArea + 2;
  const cost = next * next;
  if (bloqcoins >= cost) {
    bloqcoins -= cost;
    miningArea = next;
    buildGrid();
  } else {
    const msg = lang === 'es'
      ? `Necesitas ${cost} bloqcoins` 
      : `You need ${cost} bloqcoins`;
    alert(msg);
  }
  $('#ctxMenu').classList.add('hidden');
};

// PROGRESS + COUNTERS
function updateProgress() {
  const minedBlocks = Math.floor(bloqcoins / BLOQCOINS_PER_BLOCK);
  const percent = ((tempFilled / totalVisibleCells) * 100).toFixed(2);
  $('#totalBlocks').textContent = minedBlocks;
  $('#blockits').textContent = bloqcoins;
  $('#progress').textContent = percent + '%';
  $('#counters').textContent = `${txt[lang].blocksText}: ${minedBlocks} | ${txt[lang].blockitsText}: ${bloqcoins.toFixed(2)}`;
}

document.addEventListener('mousemove', e => {
  $('#progress').style.left = e.pageX + 10 + 'px';
  $('#progress').style.top = e.pageY - 20 + 'px';
  $('#counters').style.left = e.pageX + 10 + 'px';
  $('#counters').style.top = e.pageY + 10 + 'px';
});

// LANGUAGE
$$('.lang').forEach(btn => btn.onclick = () => {
  lang = lang === 'es' ? 'en' : 'es';
  updateLang();
});
function updateLang() {
  $('#loginTitle').textContent = txt[lang].loginTitle;
  $('#walletTitle').textContent = txt[lang].walletTitle;
  $('#loginBtn').textContent = txt[lang].loginBtn;
  $('#mineBtn').textContent = txt[lang].mineBtn;
  $('#walletLabel').textContent = txt[lang].walletLabel;
  $('#totalBlocksText').textContent = txt[lang].blocksText;
  $('#blockitsText').textContent = txt[lang].blockitsText;
  $('#showPassText').textContent = txt[lang].showPassText;
}

// ESCAPE
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && screens.mining.classList.contains('active')) go('wallet');
});

// INIT

updateLang();


