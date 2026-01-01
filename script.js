const selectionText = document.getElementById('selectionText');
const loginTrigger = document.getElementById('loginTrigger');
const cards = document.querySelectorAll('.option-card');
const workspacePill = document.getElementById('workspacePill');
const editorInputs = document.querySelectorAll('.editor-input');
const fileInputs = document.querySelectorAll('.file-input');

const gameLabels = {
  gta: 'GTA V',
  rdr2: 'Red Dead Redemption 2'
};

function setTheme(game) {
  document.documentElement.setAttribute('data-theme', game);
}

function handleSelection(card) {
  const game = card?.dataset.game;
  if (!game) return;

  cards.forEach(c => {
    c.classList.remove('is-selected');
    c.setAttribute('aria-pressed', 'false');
  });

  card.classList.add('is-selected');
  card.setAttribute('aria-pressed', 'true');
  const label = gameLabels[game] ?? 'tu entorno';

  selectionText.textContent = `Has elegido ${label}. La imagen completa es clickeable.`;
  workspacePill.textContent = `Ventanas activadas para ${label}`;
  setTheme(game);
}

cards.forEach(card => {
  card.addEventListener('click', () => handleSelection(card));
  card.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelection(card);
    }
  });
});

loginTrigger?.addEventListener('click', () => {
  selectionText.textContent = 'La pantalla de inicio de sesión estará disponible más adelante.';
});

function buildLineNumbers(value) {
  const lines = value.split('\n').length || 1;
  let content = '';
  for (let i = 1; i <= lines; i += 1) {
    content += `${i}\n`;
  }
  return content;
}

function syncScroll(shell, textarea) {
  const left = shell.querySelector('.line-numbers--left');
  const right = shell.querySelector('.line-numbers--right');
  if (left) left.scrollTop = textarea.scrollTop;
  if (right) right.scrollTop = textarea.scrollTop;
}

function updateMinimap(shell, textarea) {
  const minimap = shell.querySelector('.editor-minimap');
  const thumb = minimap?.querySelector('.minimap-thumb');
  if (!minimap || !thumb) return;

  const trackHeight = minimap.clientHeight;
  const contentHeight = textarea.scrollHeight;
  const viewHeight = textarea.clientHeight;
  const ratio = viewHeight / contentHeight;
  const thumbHeight = Math.max(24, trackHeight * ratio);

  thumb.style.height = `${thumbHeight}px`;

  const maxScroll = Math.max(contentHeight - viewHeight, 1);
  const maxThumbTravel = trackHeight - thumbHeight;
  const scrollRatio = textarea.scrollTop / maxScroll;
  const top = scrollRatio * maxThumbTravel;
  thumb.style.top = `${top}px`;
}

function attachMinimap(shell, textarea) {
  const minimap = shell.querySelector('.editor-minimap');
  const thumb = minimap?.querySelector('.minimap-thumb');
  if (!minimap || !thumb) return;

  const updateFromPointer = event => {
    const rect = minimap.getBoundingClientRect();
    const relativeY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const ratio = relativeY / rect.height;
    const target = (textarea.scrollHeight - textarea.clientHeight) * ratio;
    textarea.scrollTop = target;
    updateMinimap(shell, textarea);
  };

  minimap.addEventListener('pointerdown', event => {
    event.preventDefault();
    minimap.setPointerCapture(event.pointerId);
    updateFromPointer(event);
    const moveHandler = e => updateFromPointer(e);
    const upHandler = e => {
      minimap.releasePointerCapture(event.pointerId);
      minimap.removeEventListener('pointermove', moveHandler);
      minimap.removeEventListener('pointerup', upHandler);
      minimap.removeEventListener('pointercancel', upHandler);
    };
    minimap.addEventListener('pointermove', moveHandler);
    minimap.addEventListener('pointerup', upHandler);
    minimap.addEventListener('pointercancel', upHandler);
  });
}

function refreshEditor(shell) {
  const textarea = shell.querySelector('.editor-input');
  const left = shell.querySelector('.line-numbers--left');
  const right = shell.querySelector('.line-numbers--right');
  if (!textarea || !left || !right) return;

  const content = textarea.value || '';
  const numbers = buildLineNumbers(content);
  left.textContent = numbers;
  right.textContent = numbers;
  syncScroll(shell, textarea);
  updateMinimap(shell, textarea);
}

editorInputs.forEach(textarea => {
  const shell = textarea.closest('.editor-shell');
  if (!shell) return;

  textarea.addEventListener('input', () => refreshEditor(shell));
  textarea.addEventListener('scroll', () => {
    syncScroll(shell, textarea);
    updateMinimap(shell, textarea);
  });

  attachMinimap(shell, textarea);
  refreshEditor(shell);
});

fileInputs.forEach(input => {
  input.addEventListener('change', event => {
    const file = event.target?.files?.[0];
    const targetId = input.dataset.target;
    if (!file || !targetId) return;

    const textarea = document.querySelector(`.editor-input[data-editor-target="${targetId}"]`);
    const shell = textarea?.closest('.editor-shell');
    if (!textarea || !shell) return;

    const reader = new FileReader();
    reader.onload = e => {
      textarea.value = e.target?.result ?? '';
      refreshEditor(shell);
    };
    reader.readAsText(file);
  });
});
