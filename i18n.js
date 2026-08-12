const translations = {
  it: {
    title: 'Fiat Picker',
    subtitle: 'Scegli il colore della tua Fiat 500',
    start: 'Inizia',
    singleColor: 'Colore unico',
    twoColor: 'Due colori',
    body: 'Carrozzeria',
    roof: 'Tetto',
    screenshot: 'Scatta foto',
    back: 'Indietro',
    loading: 'Caricamento modello',
    bgStudio: 'Studio',
    bg1: 'Sfondo 1',
    bg2: 'Sfondo 2',
    bg3: 'Sfondo 3',
    bgCustom: 'Aggiungi sfondo',
    bgCustomFrame: 'Regola inquadratura',
    bgDrop: 'Trascina qui una foto',
    cropTitle: 'Scegli l’inquadratura',
    cropHint: 'Trascina il riquadro, pizzica o usa lo zoom',
    cropChange: 'Cambia foto',
    cropZoom: 'Zoom',
    cropCancel: 'Annulla',
    cropApply: 'Applica',
  },
  en: {
    title: 'Fiat Picker',
    subtitle: 'Pick the color of your Fiat 500',
    start: 'Start',
    singleColor: 'Single color',
    twoColor: 'Two colors',
    body: 'Body',
    roof: 'Roof',
    screenshot: 'Take photo',
    back: 'Back',
    loading: 'Loading model',
    bgStudio: 'Studio',
    bg1: 'Background 1',
    bg2: 'Background 2',
    bg3: 'Background 3',
    bgCustom: 'Add background',
    bgCustomFrame: 'Adjust framing',
    bgDrop: 'Drop a photo here',
    cropTitle: 'Choose the framing',
    cropHint: 'Drag the frame, pinch or use the zoom',
    cropChange: 'Change photo',
    cropZoom: 'Zoom',
    cropCancel: 'Cancel',
    cropApply: 'Apply',
  },
};

function getLang() {
  const stored = localStorage.getItem('fp_lang');
  if (stored && translations[stored]) return stored;
  const nav = (navigator.language || 'it').slice(0, 2);
  return translations[nav] ? nav : 'it';
}

function setLang(lang) {
  if (!translations[lang]) return;
  localStorage.setItem('fp_lang', lang);
  document.documentElement.lang = lang;
  applyTranslations();
  updateFlagState();
}

export function t(key) {
  return translations[getLang()][key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}

function updateFlagState() {
  const current = getLang();
  document.querySelectorAll('.flag-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === current);
  });
}

export function initLangSwitch() {
  document.querySelectorAll('.flag-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });
  applyTranslations();
  updateFlagState();
}
