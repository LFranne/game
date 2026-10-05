// Texte in allen Sprachen. Deutsch ist die Vorlage und der Rueckfall: fehlt ein
// Schluessel in einer Sprache, wird der deutsche Text benutzt.
// Platzhalter in Texten: {name} (siehe t()).
const I18N = {
  de: {
    pageTitle: 'Ab ins Grüne – Postkarten-Generator',
    tagline: 'Gestalte deine persönliche Urlaubspostkarte',
    langAria: 'Sprache',
    frontAria: 'Vorderseite der Postkarte',
    backAria: 'Rückseite der Postkarte',
    flip: 'Karte umdrehen',
    photoLabel: 'Dein Urlaubsfoto',
    upload: 'Foto hochladen',
    recrop: 'Ausschnitt anpassen',
    recipient: 'Empfänger',
    recipientPh: 'z. B. Mama & Papa',
    sender: 'Absender',
    senderPh: 'z. B. Familie Müller',
    stamp: 'Briefmarke',
    stampAria: 'Briefmarken-Motiv',
    stampHasen: 'Hasen',
    stampWasserrad: 'Wasserrad im Kurpark',
    sticker: 'Sticker',
    stickerAria: 'Sticker auswählen',
    stickerAriaItem: 'Sticker {name}',
    stickerHint: 'Antippen wählt einen Sticker, nochmal antippen entfernt ihn. Über die Lupe siehst du ihn groß. Bis zu 4, ein einzelner Sticker wird größer.',
    message: 'Deine Nachricht',
    messagePh: 'Liebe Grüße aus dem Schwarzwald ...',
    share: 'Teilen',
    shareFormatAria: 'Format zum Teilen',
    fmtBoth: 'Beide Seiten',
    fmtStory: 'Story 9:16',
    fmtGif: 'GIF animiert',
    fmtVideo: 'Video',
    cropTitle: 'Bildausschnitt wählen',
    cropCanvasAria: 'Vorschau des gewählten Bildausschnitts',
    zoom: 'Zoom',
    cropHint: 'Zum Verschieben ziehen. Zum Zoomen (auch Verkleinern) den Regler, das Mausrad oder zwei Finger nutzen.',
    cancel: 'Abbrechen',
    confirm: 'Übernehmen',
    close: 'Schließen',
    select: 'Auswählen',
    selected: 'Ausgewählt',
    remove: 'Entfernen',
    slotsFull: 'Alle {n} Plätze belegt',
    // Auf der Karte selbst
    cardTagline: 'Grüße aus dem Schwarzwald',
    cardTo: 'An:',
    cardFrom: 'Von:',
    cardMessagePh: 'Deine persönliche Nachricht erscheint hier ...',
    cardUpload: 'Foto hochladen',
    hintUpload: 'Eigenes Foto hochladen',
    // Hinweise und Meldungen
    defaultNotice: 'Du nutzt gerade das Standardbild. Tippe auf die Karte, um dein eigenes Foto zu wählen.',
    shareTitle: 'Meine Ab ins Grüne Postkarte',
    shareTextFrom: 'Eine Urlaubspostkarte von {name} aus dem Schwarzwald.',
    shareText: 'Schau dir meine Postkarte aus dem Schwarzwald an!',
    savedBoth: 'Postkarte wurde gespeichert!',
    savedStory: 'Story-Bild wurde gespeichert!',
    savedGif: 'GIF wurde gespeichert!',
    savedVideo: 'Video wurde gespeichert!',
    shareFailed: 'Teilen war leider nicht möglich.',
    shareFailedSaved: 'Teilen ging nicht, die Datei wurde stattdessen gespeichert.',
    gifProgress: 'GIF wird erstellt … {p} %',
    videoProgress: 'Video wird aufgenommen … {p} % (Seite bitte offen lassen)',
    videoUnsupported: 'Video wird von diesem Browser leider nicht unterstützt. Probier das GIF.',
    gifFailed: 'Das GIF konnte leider nicht erstellt werden.',
    videoFailed: 'Das Video konnte leider nicht erstellt werden.',
    gifReady: 'GIF ist fertig. Tippe auf „GIF jetzt teilen“.',
    videoReady: 'Video ist fertig. Tippe auf „Video jetzt teilen“.',
    gifShareNow: 'GIF jetzt teilen',
    videoShareNow: 'Video jetzt teilen'
  },

  en: {
    pageTitle: 'Ab ins Grüne – Postcard Generator',
    tagline: 'Design your personal holiday postcard',
    langAria: 'Language',
    frontAria: 'Front of the postcard',
    backAria: 'Back of the postcard',
    flip: 'Flip card',
    photoLabel: 'Your holiday photo',
    upload: 'Upload photo',
    recrop: 'Adjust crop',
    recipient: 'Recipient',
    recipientPh: 'e.g. Mum & Dad',
    sender: 'Sender',
    senderPh: 'e.g. The Smith family',
    stamp: 'Stamp',
    stampAria: 'Stamp design',
    stampHasen: 'Hares',
    stampWasserrad: 'Water wheel in the spa gardens',
    sticker: 'Stickers',
    stickerAria: 'Choose stickers',
    stickerAriaItem: 'Sticker {name}',
    stickerHint: 'Tap to choose a sticker, tap again to remove it. Use the magnifier to see it larger. Up to 4; a single sticker is shown bigger.',
    message: 'Your message',
    messagePh: 'Kind regards from the Black Forest ...',
    share: 'Share',
    shareFormatAria: 'Format for sharing',
    fmtBoth: 'Both sides',
    fmtStory: 'Story 9:16',
    fmtGif: 'Animated GIF',
    fmtVideo: 'Video',
    cropTitle: 'Choose image crop',
    cropCanvasAria: 'Preview of the chosen image crop',
    zoom: 'Zoom',
    cropHint: 'Drag to move. To zoom in or out use the slider, the mouse wheel or two fingers.',
    cancel: 'Cancel',
    confirm: 'Apply',
    close: 'Close',
    select: 'Select',
    selected: 'Selected',
    remove: 'Remove',
    slotsFull: 'All {n} spots taken',
    cardTagline: 'Greetings from the Black Forest',
    cardTo: 'To:',
    cardFrom: 'From:',
    cardMessagePh: 'Your personal message appears here ...',
    cardUpload: 'Upload photo',
    hintUpload: 'Upload your own photo',
    defaultNotice: 'You are using the default photo. Tap the card to choose your own photo.',
    shareTitle: 'My Ab ins Grüne postcard',
    shareTextFrom: 'A holiday postcard from {name} from the Black Forest.',
    shareText: 'Take a look at my postcard from the Black Forest!',
    savedBoth: 'Postcard saved!',
    savedStory: 'Story image saved!',
    savedGif: 'GIF saved!',
    savedVideo: 'Video saved!',
    shareFailed: 'Sorry, sharing was not possible.',
    shareFailedSaved: 'Sharing did not work, the file was saved instead.',
    gifProgress: 'Creating GIF … {p} %',
    videoProgress: 'Recording video … {p} % (please keep this page open)',
    videoUnsupported: 'Sorry, this browser does not support video. Try the GIF.',
    gifFailed: 'Sorry, the GIF could not be created.',
    videoFailed: 'Sorry, the video could not be created.',
    gifReady: 'GIF is ready. Tap “Share GIF now”.',
    videoReady: 'Video is ready. Tap “Share video now”.',
    gifShareNow: 'Share GIF now',
    videoShareNow: 'Share video now'
  },

  fr: {
    pageTitle: 'Ab ins Grüne – Générateur de cartes postales',
    tagline: 'Crée ta carte postale de vacances personnelle',
    langAria: 'Langue',
    frontAria: 'Recto de la carte postale',
    backAria: 'Verso de la carte postale',
    flip: 'Retourner la carte',
    photoLabel: 'Ta photo de vacances',
    upload: 'Téléverser une photo',
    recrop: 'Ajuster le cadrage',
    recipient: 'Destinataire',
    recipientPh: 'p. ex. Maman & Papa',
    sender: 'Expéditeur',
    senderPh: 'p. ex. La famille Martin',
    stamp: 'Timbre',
    stampAria: 'Motif du timbre',
    stampHasen: 'Lièvres',
    stampWasserrad: 'Roue à eau du parc thermal',
    sticker: 'Autocollants',
    stickerAria: 'Choisir des autocollants',
    stickerAriaItem: 'Autocollant {name}',
    stickerHint: 'Touche pour choisir un autocollant, touche à nouveau pour le retirer. La loupe l’affiche en grand. Jusqu’à 4 ; un autocollant seul est plus grand.',
    message: 'Ton message',
    messagePh: 'Chaleureuses salutations de la Forêt-Noire ...',
    share: 'Partager',
    shareFormatAria: 'Format de partage',
    fmtBoth: 'Les deux faces',
    fmtStory: 'Story 9:16',
    fmtGif: 'GIF animé',
    fmtVideo: 'Vidéo',
    cropTitle: 'Choisir le cadrage',
    cropCanvasAria: 'Aperçu du cadrage choisi',
    zoom: 'Zoom',
    cropHint: 'Fais glisser pour déplacer. Pour zoomer ou dézoomer, utilise le curseur, la molette ou deux doigts.',
    cancel: 'Annuler',
    confirm: 'Valider',
    close: 'Fermer',
    select: 'Choisir',
    selected: 'Choisi',
    remove: 'Retirer',
    slotsFull: 'Les {n} places sont prises',
    cardTagline: 'Salutations de la Forêt-Noire',
    cardTo: 'À :',
    cardFrom: 'De :',
    cardMessagePh: 'Ton message personnel apparaît ici ...',
    cardUpload: 'Téléverser une photo',
    hintUpload: 'Téléverser ta photo',
    defaultNotice: 'Tu utilises la photo par défaut. Touche la carte pour choisir ta propre photo.',
    shareTitle: 'Ma carte postale Ab ins Grüne',
    shareTextFrom: 'Une carte postale de vacances de {name} depuis la Forêt-Noire.',
    shareText: 'Regarde ma carte postale de la Forêt-Noire !',
    savedBoth: 'Carte postale enregistrée !',
    savedStory: 'Image de story enregistrée !',
    savedGif: 'GIF enregistré !',
    savedVideo: 'Vidéo enregistrée !',
    shareFailed: 'Désolé, le partage n’a pas été possible.',
    shareFailedSaved: 'Le partage n’a pas fonctionné, le fichier a été enregistré à la place.',
    gifProgress: 'Création du GIF … {p} %',
    videoProgress: 'Enregistrement de la vidéo … {p} % (garde cette page ouverte)',
    videoUnsupported: 'Désolé, ce navigateur ne prend pas en charge la vidéo. Essaie le GIF.',
    gifFailed: 'Désolé, le GIF n’a pas pu être créé.',
    videoFailed: 'Désolé, la vidéo n’a pas pu être créée.',
    gifReady: 'Le GIF est prêt. Touche « Partager le GIF ».',
    videoReady: 'La vidéo est prête. Touche « Partager la vidéo ».',
    gifShareNow: 'Partager le GIF',
    videoShareNow: 'Partager la vidéo'
  },

  nl: {
    pageTitle: 'Ab ins Grüne – Ansichtkaartgenerator',
    tagline: 'Ontwerp je persoonlijke vakantiekaart',
    langAria: 'Taal',
    frontAria: 'Voorkant van de ansichtkaart',
    backAria: 'Achterkant van de ansichtkaart',
    flip: 'Kaart omdraaien',
    photoLabel: 'Je vakantiefoto',
    upload: 'Foto uploaden',
    recrop: 'Uitsnede aanpassen',
    recipient: 'Ontvanger',
    recipientPh: 'bijv. Mama & Papa',
    sender: 'Afzender',
    senderPh: 'bijv. Familie Jansen',
    stamp: 'Postzegel',
    stampAria: 'Postzegelmotief',
    stampHasen: 'Hazen',
    stampWasserrad: 'Waterrad in het kuurpark',
    sticker: 'Stickers',
    stickerAria: 'Stickers kiezen',
    stickerAriaItem: 'Sticker {name}',
    stickerHint: 'Tik om een sticker te kiezen, tik nogmaals om hem te verwijderen. Met het vergrootglas zie je hem groot. Maximaal 4; een enkele sticker wordt groter getoond.',
    message: 'Je bericht',
    messagePh: 'Hartelijke groeten uit het Zwarte Woud ...',
    share: 'Delen',
    shareFormatAria: 'Formaat om te delen',
    fmtBoth: 'Beide zijden',
    fmtStory: 'Story 9:16',
    fmtGif: 'GIF animatie',
    fmtVideo: 'Video',
    cropTitle: 'Uitsnede kiezen',
    cropCanvasAria: 'Voorbeeld van de gekozen uitsnede',
    zoom: 'Zoom',
    cropHint: 'Sleep om te verschuiven. Gebruik de schuifregelaar, het muiswiel of twee vingers om in of uit te zoomen.',
    cancel: 'Annuleren',
    confirm: 'Toepassen',
    close: 'Sluiten',
    select: 'Kiezen',
    selected: 'Gekozen',
    remove: 'Verwijderen',
    slotsFull: 'Alle {n} plekken zijn bezet',
    cardTagline: 'Groeten uit het Zwarte Woud',
    cardTo: 'Aan:',
    cardFrom: 'Van:',
    cardMessagePh: 'Je persoonlijke bericht verschijnt hier ...',
    cardUpload: 'Foto uploaden',
    hintUpload: 'Eigen foto uploaden',
    defaultNotice: 'Je gebruikt nu de standaardfoto. Tik op de kaart om je eigen foto te kiezen.',
    shareTitle: 'Mijn Ab ins Grüne ansichtkaart',
    shareTextFrom: 'Een vakantiekaart van {name} uit het Zwarte Woud.',
    shareText: 'Kijk eens naar mijn ansichtkaart uit het Zwarte Woud!',
    savedBoth: 'Ansichtkaart opgeslagen!',
    savedStory: 'Story-afbeelding opgeslagen!',
    savedGif: 'GIF opgeslagen!',
    savedVideo: 'Video opgeslagen!',
    shareFailed: 'Delen was helaas niet mogelijk.',
    shareFailedSaved: 'Delen lukte niet, het bestand is in plaats daarvan opgeslagen.',
    gifProgress: 'GIF wordt gemaakt … {p} %',
    videoProgress: 'Video wordt opgenomen … {p} % (laat deze pagina open)',
    videoUnsupported: 'Deze browser ondersteunt helaas geen video. Probeer de GIF.',
    gifFailed: 'De GIF kon helaas niet worden gemaakt.',
    videoFailed: 'De video kon helaas niet worden gemaakt.',
    gifReady: 'De GIF is klaar. Tik op “GIF nu delen”.',
    videoReady: 'De video is klaar. Tik op “Video nu delen”.',
    gifShareNow: 'GIF nu delen',
    videoShareNow: 'Video nu delen'
  },

  es: {
    pageTitle: 'Ab ins Grüne – Generador de postales',
    tagline: 'Diseña tu postal de vacaciones personal',
    langAria: 'Idioma',
    frontAria: 'Anverso de la postal',
    backAria: 'Reverso de la postal',
    flip: 'Dar la vuelta a la postal',
    photoLabel: 'Tu foto de vacaciones',
    upload: 'Subir foto',
    recrop: 'Ajustar el recorte',
    recipient: 'Destinatario',
    recipientPh: 'p. ej. Mamá y Papá',
    sender: 'Remitente',
    senderPh: 'p. ej. Familia García',
    stamp: 'Sello',
    stampAria: 'Motivo del sello',
    stampHasen: 'Liebres',
    stampWasserrad: 'Noria en el parque termal',
    sticker: 'Pegatinas',
    stickerAria: 'Elegir pegatinas',
    stickerAriaItem: 'Pegatina {name}',
    stickerHint: 'Toca para elegir una pegatina y vuelve a tocar para quitarla. Con la lupa la ves en grande. Hasta 4; una sola pegatina se muestra más grande.',
    message: 'Tu mensaje',
    messagePh: 'Un cordial saludo desde la Selva Negra ...',
    share: 'Compartir',
    shareFormatAria: 'Formato para compartir',
    fmtBoth: 'Ambas caras',
    fmtStory: 'Story 9:16',
    fmtGif: 'GIF animado',
    fmtVideo: 'Vídeo',
    cropTitle: 'Elegir el recorte',
    cropCanvasAria: 'Vista previa del recorte elegido',
    zoom: 'Zoom',
    cropHint: 'Arrastra para mover. Para ampliar o reducir usa el control deslizante, la rueda del ratón o dos dedos.',
    cancel: 'Cancelar',
    confirm: 'Aplicar',
    close: 'Cerrar',
    select: 'Elegir',
    selected: 'Elegida',
    remove: 'Quitar',
    slotsFull: 'Los {n} huecos están ocupados',
    cardTagline: 'Saludos desde la Selva Negra',
    cardTo: 'Para:',
    cardFrom: 'De:',
    cardMessagePh: 'Tu mensaje personal aparece aquí ...',
    cardUpload: 'Subir foto',
    hintUpload: 'Sube tu propia foto',
    defaultNotice: 'Estás usando la foto predeterminada. Toca la postal para elegir tu propia foto.',
    shareTitle: 'Mi postal de Ab ins Grüne',
    shareTextFrom: 'Una postal de vacaciones de {name} desde la Selva Negra.',
    shareText: '¡Mira mi postal de la Selva Negra!',
    savedBoth: '¡Postal guardada!',
    savedStory: '¡Imagen de story guardada!',
    savedGif: '¡GIF guardado!',
    savedVideo: '¡Vídeo guardado!',
    shareFailed: 'Lo sentimos, no se pudo compartir.',
    shareFailedSaved: 'No se pudo compartir, el archivo se guardó en su lugar.',
    gifProgress: 'Creando el GIF … {p} %',
    videoProgress: 'Grabando el vídeo … {p} % (mantén esta página abierta)',
    videoUnsupported: 'Lo sentimos, este navegador no admite vídeo. Prueba el GIF.',
    gifFailed: 'Lo sentimos, no se pudo crear el GIF.',
    videoFailed: 'Lo sentimos, no se pudo crear el vídeo.',
    gifReady: 'El GIF está listo. Toca «Compartir GIF».',
    videoReady: 'El vídeo está listo. Toca «Compartir vídeo».',
    gifShareNow: 'Compartir GIF',
    videoShareNow: 'Compartir vídeo'
  }
};

const LANGS = ['de', 'en', 'fr', 'nl', 'es'];
let currentLang = 'de';

function t(key, vars) {
  const table = I18N[currentLang] || I18N.de;
  let text = table[key];
  if (text === undefined) text = I18N.de[key];
  if (text === undefined) return key;
  if (vars) {
    text = text.replace(/\{(\w+)\}/g, (m, name) => (vars[name] === undefined ? m : String(vars[name])));
  }
  return text;
}

// Startsprache: ?lang=nl im Link > gemerkte Wahl > Browsersprache > Deutsch.
function detectLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS.includes(q.toLowerCase())) return q.toLowerCase();
  } catch (e) { /* ignorieren */ }
  try {
    const saved = localStorage.getItem('lang');
    if (saved && LANGS.includes(saved)) return saved;
  } catch (e) { /* Speicher gesperrt (privater Tab) */ }
  const prefs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'de'];
  for (const p of prefs) {
    const code = String(p).slice(0, 2).toLowerCase();
    if (LANGS.includes(code)) return code;
  }
  return 'de';
}

// Statische Texte per Attribut: data-i18n (Textinhalt), data-i18n-placeholder,
// data-i18n-aria (aria-label), data-i18n-alt.
function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.title = t('pageTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  document.querySelectorAll('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt); });
  document.querySelectorAll('.lang-option').forEach(btn => {
    const active = btn.dataset.lang === currentLang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', String(active));
    if (active) {
      // Knopf zeigt die aktuelle Flagge und das Kuerzel.
      const flag = btn.querySelector('.lang-flag');
      const slot = document.getElementById('lang-toggle-flag');
      if (flag && slot) slot.innerHTML = flag.outerHTML;
      const code = document.getElementById('lang-toggle-code');
      if (code) code.textContent = currentLang.toUpperCase();
    }
  });
}

// Auf-/Zuklappen der Sprachliste.
function setLangListOpen(open) {
  const list = document.getElementById('lang-list');
  const toggle = document.getElementById('lang-toggle');
  if (!list || !toggle) return;
  list.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
}

document.addEventListener('click', e => {
  const toggle = document.getElementById('lang-toggle');
  if (!toggle) return;
  if (toggle.contains(e.target)) {
    setLangListOpen(toggle.getAttribute('aria-expanded') !== 'true');
  } else if (!e.target.closest('#lang-list')) {
    setLangListOpen(false);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') setLangListOpen(false);
});

// Wechselt die Sprache; postkarte.js hoert auf 'langchange' und zeichnet neu.
function setLang(lang, remember) {
  if (!LANGS.includes(lang)) return;
  currentLang = lang;
  if (remember) {
    try { localStorage.setItem('lang', lang); } catch (e) { /* egal */ }
  }
  applyStaticTranslations();
  setLangListOpen(false);
  window.dispatchEvent(new Event('langchange'));
}

currentLang = detectLang();
