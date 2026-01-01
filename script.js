const selectionText = document.getElementById('selectionText');
const loginTrigger = document.getElementById('loginTrigger');
const optionButtons = document.querySelectorAll('[data-action="select"]');

optionButtons.forEach(button => {
  button.addEventListener('click', () => {
    const card = button.closest('.option-card');
    const game = card?.dataset.game;
    if (!game) return;

    document.querySelectorAll('.option-card').forEach(el => el.classList.remove('is-selected'));
    card.classList.add('is-selected');

    const label = game === 'gta' ? 'GTA V' : 'Red Dead Redemption 2';
    selectionText.textContent = `Has elegido ${label}. Prepara tus merges.`;
  });
});

loginTrigger?.addEventListener('click', () => {
  selectionText.textContent = 'La pantalla de inicio de sesión estará disponible más adelante.';
});
