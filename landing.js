import { initLangSwitch } from './i18n.js';

initLangSwitch();

document.getElementById('startBtn').addEventListener('click', () => {
  window.location.href = 'configurator.html';
});
