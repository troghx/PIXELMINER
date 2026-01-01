const editorInputs = document.querySelectorAll('.editor-input');
const fileInputs = document.querySelectorAll('.file-input');
const mergeButton = document.getElementById('mergeNow');
const quickMerge = document.getElementById('quickMerge');
const swapButton = document.getElementById('swapTexts');
const clearButton = document.getElementById('clearAll');
const mergedOutput = document.getElementById('mergedOutput');
const copyMerged = document.getElementById('copyMerged');
const sendLeft = document.getElementById('sendLeft');
const sendRight = document.getElementById('sendRight');
const matchFill = document.getElementById('matchFill');
const matchValue = document.getElementById('matchValue');
const conflictList = document.getElementById('conflictList');

let lastConflicts = [];

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
  const ratio = viewHeight / Math.max(contentHeight, 1);
  const thumbHeight = Math.max(28, trackHeight * ratio);

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
    const upHandler = () => {
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

function debounce(fn, delay = 260) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function similarityScore(leftText, rightText) {
  const tokenize = text => (text.toLowerCase().match(/\w+/g) || []);
  const tokensA = tokenize(leftText);
  const tokensB = tokenize(rightText);
  if (!tokensA.length && !tokensB.length) return 1;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  let intersection = 0;
  setA.forEach(token => {
    if (setB.has(token)) intersection += 1;
  });
  const union = new Set([...tokensA, ...tokensB]).size || 1;
  return intersection / union;
}

function lcsMatrix(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp;
}

function longestCommonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) {
    i += 1;
  }
  return a.slice(0, i);
}

function longestCommonSuffix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[a.length - 1 - i] === b[b.length - 1 - i]) {
    i += 1;
  }
  return a.slice(a.length - i);
}

function fuseLines(leftLine, rightLine) {
  const normalize = value => value.trim().toLowerCase();
  if (!leftLine.trim()) return { value: rightLine, conflicted: false };
  if (!rightLine.trim()) return { value: leftLine, conflicted: false };
  if (normalize(leftLine) === normalize(rightLine)) {
    return { value: leftLine.length >= rightLine.length ? leftLine : rightLine, conflicted: false };
  }

  const prefix = longestCommonPrefix(leftLine, rightLine);
  const suffix = longestCommonSuffix(leftLine, rightLine);
  const coreA = leftLine.slice(prefix.length, leftLine.length - suffix.length);
  const coreB = rightLine.slice(prefix.length, rightLine.length - suffix.length);
  const preferred = coreA.length >= coreB.length ? coreA : coreB;
  const merged = `${prefix}${preferred}${suffix}`;
  return { value: merged, conflicted: normalize(coreA) !== normalize(coreB) };
}

function smartMerge(leftText, rightText) {
  const leftLines = leftText.split('\n');
  const rightLines = rightText.split('\n');
  const dp = lcsMatrix(leftLines, rightLines);

  let i = leftLines.length;
  let j = rightLines.length;
  const ops = [];

  while (i > 0 && j > 0) {
    if (leftLines[i - 1] === rightLines[j - 1]) {
      ops.unshift({ type: 'common', value: leftLines[i - 1] });
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      ops.unshift({ type: 'left', value: leftLines[i - 1] });
      i -= 1;
    } else {
      ops.unshift({ type: 'right', value: rightLines[j - 1] });
      j -= 1;
    }
  }

  while (i > 0) {
    ops.unshift({ type: 'left', value: leftLines[i - 1] });
    i -= 1;
  }
  while (j > 0) {
    ops.unshift({ type: 'right', value: rightLines[j - 1] });
    j -= 1;
  }

  const mergedLines = [];
  const conflicts = [];
  let pending = null;

  const flushPending = () => {
    if (!pending) return;
    mergedLines.push(pending.value);
    pending = null;
  };

  ops.forEach(op => {
    if (op.type === 'common') {
      flushPending();
      mergedLines.push(op.value);
      return;
    }

    if (!pending) {
      pending = { value: op.value, from: op.type };
      return;
    }

    const fused = fuseLines(pending.value, op.value);
    const index = mergedLines.length;
    mergedLines.push(fused.value);
    if (fused.conflicted) {
      const leftChoice = pending.from === 'left' ? pending.value : op.value;
      const rightChoice = pending.from === 'left' ? op.value : pending.value;
      conflicts.push({ index, left: leftChoice, right: rightChoice, suggestion: fused.value });
    }
    pending = null;
  });

  flushPending();

  const score = Math.round(similarityScore(leftText, rightText) * 100);
  return { merged: mergedLines.join('\n'), conflicts, score };
}

function renderConflicts(conflicts) {
  conflictList.innerHTML = '';
  if (!conflicts.length) {
    const ok = document.createElement('p');
    ok.className = 'conflict__preview';
    ok.textContent = 'Merge limpio.';
    conflictList.appendChild(ok);
    return;
  }

  conflicts.slice(0, 6).forEach((conflict, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'conflict';

    const title = document.createElement('p');
    title.className = 'conflict__title';
    title.textContent = `Cruce ${idx + 1}`;

    const preview = document.createElement('p');
    preview.className = 'conflict__preview';
    preview.textContent = `${conflict.left}\n—\n${conflict.right}`;

    const actions = document.createElement('div');
    actions.className = 'conflict__actions';

    const leftBtn = document.createElement('button');
    leftBtn.className = 'chip chip--ghost';
    leftBtn.textContent = 'Usar A';
    leftBtn.addEventListener('click', () => applyConflictChoice(conflict, 'left'));

    const rightBtn = document.createElement('button');
    rightBtn.className = 'chip chip--ghost';
    rightBtn.textContent = 'Usar B';
    rightBtn.addEventListener('click', () => applyConflictChoice(conflict, 'right'));

    const mixBtn = document.createElement('button');
    mixBtn.className = 'chip';
    mixBtn.textContent = 'Mantener mix';
    mixBtn.addEventListener('click', () => applyConflictChoice(conflict, 'mix'));

    actions.append(leftBtn, rightBtn, mixBtn);
    wrapper.append(title, preview, actions);
    conflictList.appendChild(wrapper);
  });
}

function applyConflictChoice(conflict, choice) {
  if (!mergedOutput) return;
  const lines = mergedOutput.value.split('\n');
  const current = conflict.suggestion;
  let replacement = current;

  if (choice === 'left') replacement = conflict.left;
  if (choice === 'right') replacement = conflict.right;
  if (choice === 'mix') replacement = conflict.suggestion;

  lines[conflict.index] = replacement;
  mergedOutput.value = lines.join('\n');
}

function renderScore(score) {
  matchValue.textContent = `${score}%`;
  matchFill.style.width = `${score}%`;
}

function executeMerge(pulse = true) {
  const left = document.querySelector('.editor-input[data-editor-target="left"]')?.value ?? '';
  const right = document.querySelector('.editor-input[data-editor-target="right"]')?.value ?? '';

  const { merged, conflicts, score } = smartMerge(left, right);
  mergedOutput.value = merged;
  lastConflicts = conflicts;
  renderConflicts(conflicts);
  renderScore(score);

  if (pulse) {
    mergedOutput.classList.add('pulse');
    setTimeout(() => mergedOutput.classList.remove('pulse'), 500);
  }
}

const autoMerge = debounce(() => executeMerge(false), 280);

editorInputs.forEach(textarea => {
  const shell = textarea.closest('.editor-shell');
  if (!shell) return;

  textarea.addEventListener('input', () => {
    refreshEditor(shell);
    autoMerge();
  });
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
      executeMerge();
    };
    reader.readAsText(file);
  });
});

mergeButton?.addEventListener('click', () => executeMerge());
quickMerge?.addEventListener('click', () => executeMerge());

swapButton?.addEventListener('click', () => {
  const left = document.querySelector('.editor-input[data-editor-target="left"]');
  const right = document.querySelector('.editor-input[data-editor-target="right"]');
  if (!left || !right) return;
  const temp = left.value;
  left.value = right.value;
  right.value = temp;
  document.querySelectorAll('.editor-shell').forEach(shell => refreshEditor(shell));
  executeMerge();
});

clearButton?.addEventListener('click', () => {
  editorInputs.forEach(textarea => {
    textarea.value = '';
    const shell = textarea.closest('.editor-shell');
    if (shell) refreshEditor(shell);
  });
  mergedOutput.value = '';
  renderScore(0);
  renderConflicts([]);
});

copyMerged?.addEventListener('click', async () => {
  if (!navigator.clipboard) return;
  await navigator.clipboard.writeText(mergedOutput.value ?? '');
});

sendLeft?.addEventListener('click', () => {
  const textarea = document.querySelector('.editor-input[data-editor-target="left"]');
  if (!textarea) return;
  textarea.value = mergedOutput.value;
  const shell = textarea.closest('.editor-shell');
  if (shell) refreshEditor(shell);
  executeMerge(false);
});

sendRight?.addEventListener('click', () => {
  const textarea = document.querySelector('.editor-input[data-editor-target="right"]');
  if (!textarea) return;
  textarea.value = mergedOutput.value;
  const shell = textarea.closest('.editor-shell');
  if (shell) refreshEditor(shell);
  executeMerge(false);
});

executeMerge(false);