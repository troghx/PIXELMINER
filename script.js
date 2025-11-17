const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const COLS = 50;
const ROWS = 50;
const PIXEL = 12;
const BLOQCOINS_PER_BLOCK = 100;

let lang = 'es';
let bloqcoins = 0;
let miningArea = 50;
let tempFilled = 0;
let totalVisibleCells = miningArea * miningArea;

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
  $$('.cell.highlight').forEach(c => c.classList.remove('highlight'));

  const startCol = Math.floor((COLS - miningArea) / 2);
  const startRow = Math.floor((ROWS - miningArea) / 2);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      const visible = r >= startRow && r < startRow + miningArea && c >= startCol && c < startCol + miningArea;
      cell.style.display = visible ? 'block' : 'none';
      cell.dataset.visible = visible ? '1' : '0';
      cell.onclick = () => clickPixel(cell);
      grid.appendChild(cell);
    }
  }

  updateProgress();
}

function clickPixel(cell) {
  if (cell.classList.contains('filled')) return;
  cell.classList.add('filled');
  tempFilled++;
  updateProgress();
  checkComplete();
}

function checkComplete() {
  const filled = $$('#grid .cell.filled[data-visible="1"]').length;

  if (filled === totalVisibleCells) {
    $$('#grid .cell').forEach(c => {
      if (c.dataset.visible === '1') c.classList.add('highlight');
    });
  }
}

// CONTEXT MENU
window.addEventListener('contextmenu', e => {
  const miningActive = screens.mining.classList.contains('active');
  if (!miningActive) return;
  e.preventDefault();

  const filled = $$('#grid .cell.filled[data-visible="1"]').length;

  if (filled === totalVisibleCells) {
    const ctx = $('#ctxMenu');
    ctx.classList.remove('hidden');
    ctx.style.left = e.pageX + 'px';
    ctx.style.top = e.pageY + 'px';
    ctx.innerHTML = `
      <button onclick="mineArea()">${txt[lang].mineArea} ${miningArea}×${miningArea}</button>
      <button onclick="showShop()">${txt[lang].shop}</button>
    `;
  }
});

window.mineArea = () => {
  const reward = miningArea * miningArea;
  bloqcoins += reward;
  tempFilled = 0;
  $$('.cell').forEach(c => c.classList.remove('filled', 'highlight'));
  $('#ctxMenu').classList.add('hidden');
  updateProgress();
  buildGrid();
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
  $('#counters').textContent = `${txt[lang].blocksText}: ${minedBlocks} | ${txt[lang].blockitsText}: ${bloqcoins}`;
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
