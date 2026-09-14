// ============================================================
// Ab ins Grüne – Postkarten-Generator
// Marken-Logo wird aus /assets geladen (Original-SVG, siehe
// postkarte.css für die Farb-/Font-Tokens). Zum Austauschen der
// Marke: SVGs in /assets ersetzen + LOGO_* Pfade unten anpassen.
// ============================================================

const LOGO_FULL_SRC = 'assets/AIG_logotype_signet_links_wald.svg';
const LOGO_SIGNET_SRC = 'assets/AIG_signet_wald.svg';
// Helle Variante, laut Brand Guideline nur auf dunklem Grund erlaubt — genutzt
// auf dem Markenverlauf des Story-Formats.
const LOGO_FULL_DUST_SRC = 'assets/AIG_logotype_signet_links_dust.svg';
// SVGs only define a viewBox (no width/height attrs), so naturalWidth/
// naturalHeight is unreliable across browsers. Aspect ratios below are
// taken directly from each file's viewBox to guarantee undistorted logos.
const LOGO_FULL_RATIO = 559 / 103;
const LOGO_SIGNET_RATIO = 122.46 / 103;

const COLORS = {
  wald: '#253C28',
  wald2: '#4A613C',
  wald3: '#7C8E51',
  fichte: '#BBD034',
  graphite: '#202829',
  dust: '#F2EFED',
  white: '#FFFFFF',
  gold: '#A17621',
  gold2: '#D4A12C',
  gold3: '#FFD962'
};

// Zwei feste Kartenformate (gleiches Pixelbudget, nur transponiert), statt
// des beliebigen Seitenverhältnisses des Originalfotos. Vorder- und
// Rückseite werden immer gemeinsam über applyFormat() gesetzt.
const FORMATS = {
  landscape: { width: 1697, height: 1200 },
  portrait: { width: 1200, height: 1697 }
};
const SQUARE_TOLERANCE = 0.08; // Fotos bis ~8% "höher als breit" zählen noch als Querformat

function pickFormat(imgW, imgH) {
  return (imgW / imgH) >= (1 - SQUARE_TOLERANCE) ? 'landscape' : 'portrait';
}

const state = {
  photo: null,
  // Zuschnitt-Rechteck in Naturpixeln von state.photo. Bewusst ein Rechteck
  // statt eines fertig zugeschnittenen Bildes: nur ein Resampling (Original →
  // Karte) statt zwei, kein zweites Vollbild-Canvas im Speicher (relevant bei
  // 12-MP-Handyfotos), nachträgliches Ändern bleibt möglich — und der Export
  // braucht null Sonderbehandlung, weil das Vorschau-Canvas die Exportquelle
  // ist. Invariante: crop gehört immer zum aktuellen photo; beide werden
  // ausschließlich gemeinsam über setPhoto() gesetzt, nie einzeln.
  crop: null,
  recipientName: '',
  senderName: '',
  message: '',
  side: 'front',
  format: null
};

// Einzige Schreibstelle für photo + crop — erzwingt die Invariante oben.
function setPhoto(img, crop) {
  state.photo = img;
  state.crop = crop;
}

const logos = { full: null, signet: null, fullDust: null };

// ---------------- DOM refs ----------------
const canvasFront = document.getElementById('canvas-front');
const canvasBack = document.getElementById('canvas-back');
const ctxFront = canvasFront.getContext('2d');
const ctxBack = canvasBack.getContext('2d');

const flipInner = document.getElementById('postcard-flip-inner');
const flipWrapper = document.getElementById('postcard-flip');
const btnFlip = document.getElementById('btn-flip');
const btnShare = document.getElementById('btn-share');
const shareStatus = document.getElementById('share-status');

const fmtBoth = document.getElementById('fmt-both');
const fmtStory = document.getElementById('fmt-story');

const photoInput = document.getElementById('photo-input');
const recipientInput = document.getElementById('recipient-input');
const senderInput = document.getElementById('sender-input');
const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');

const btnRecrop = document.getElementById('btn-recrop');
const cropDialog = document.getElementById('crop-dialog');
const cropStage = document.getElementById('crop-stage');
const cropCanvas = document.getElementById('crop-canvas');
const cropCtx = cropCanvas.getContext('2d');
const cropZoomSlider = document.getElementById('crop-zoom');
const cropCancelBtn = document.getElementById('crop-cancel');
const cropConfirmBtn = document.getElementById('crop-confirm');

// ---------------- Helpers ----------------
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split('\n');
  let lines = [];
  paragraphs.forEach(paragraph => {
    const words = paragraph.split(' ');
    let currentLine = '';
    words.forEach(word => {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    });
    lines.push(currentLine);
  });
  lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * lineHeight);
  });
  return lines.length;
}

// Bricht text auf höchstens maxLines Zeilen um und gibt sie als Array zurück.
// Anders als wrapText() wird hier nichts gezeichnet, damit der Aufrufer die
// Zeilen selbst positionieren kann (z. B. auf vorgegebene Adresslinien).
// Einzelwörter, die breiter als die Zeile sind, werden hart umbrochen; passt
// der Text auch dann nicht, endet die letzte Zeile mit einer Ellipse.
// firstLineWidth erlaubt eine schmalere erste Zeile — gebraucht, wenn davor
// noch ein fester Präfix wie "An: " auf derselben Zeile steht.
function fitLines(ctx, text, maxWidth, maxLines, firstLineWidth) {
  const widthFor = index => (index === 0 && firstLineWidth ? firstLineWidth : maxWidth);
  const lines = [];
  let currentLine = '';

  const pushWord = word => {
    let rest = word;
    while (ctx.measureText(rest).width > widthFor(lines.length) && rest.length > 1) {
      const limit = widthFor(lines.length);
      let cut = rest.length;
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > limit) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    currentLine = rest;
  };

  text.split(' ').forEach(word => {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width <= widthFor(lines.length)) {
      currentLine = testLine;
      return;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = '';
    pushWord(word);
  });
  if (currentLine) lines.push(currentLine);

  if (lines.length > maxLines) {
    lines.length = maxLines;
    const limit = widthFor(maxLines - 1);
    let last = lines[maxLines - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > limit) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function coverFit(imgW, imgH, boxW, boxH) {
  const imgRatio = imgW / imgH;
  const boxRatio = boxW / boxH;
  let sw, sh, sx, sy;
  if (imgRatio > boxRatio) {
    sh = imgH;
    sw = imgH * boxRatio;
    sx = (imgW - sw) / 2;
    sy = 0;
  } else {
    sw = imgW;
    sh = imgW / boxRatio;
    sx = 0;
    sy = (imgH - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

// Geometrie der Vorderseite an einer einzigen Stelle. Der Zuschneide-Dialog
// braucht exakt dasselbe Foto-Rechteck wie renderFront() — ohne die Zahlen zu
// duplizieren. Reine Funktion, alle Werte als Anteil von w/h.
function getFrontLayout(w, h) {
  const margin = w * 0.035;
  const bandHeight = h * 0.16;
  const frame = {
    x: margin,
    y: margin,
    w: w - margin * 2,
    h: h - bandHeight - margin * 2
  };
  const photoPad = 14;
  const photo = {
    x: frame.x + photoPad,
    y: frame.y + photoPad,
    w: frame.w - photoPad * 2,
    h: frame.h - photoPad * 2
  };
  return { margin, bandHeight, frame, photo };
}

// Seitenverhältnis des Foto-Ausschnitts im aktuellen Format. Entspricht NICHT
// dem Kartenverhältnis (quer ~1.800 vs. Karte 1.414, hoch ~0.828 vs. 0.707),
// weil Rand und Markenband Höhe wegnehmen.
function getCropAspect() {
  const l = getFrontLayout(canvasFront.width, canvasFront.height);
  return l.photo.w / l.photo.h;
}

function drawLogo(ctx, logoImg, ratio, x, y, height, align) {
  if (!logoImg) return;
  const width = height * ratio;
  const drawX = align === 'right' ? x - width : align === 'center' ? x - width / 2 : x;
  ctx.drawImage(logoImg, drawX, y, width, height);
  return width;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Briefmarke mit gezacktem Rand
function drawStamp(ctx, x, y, w, h) {
  const bite = 7;
  ctx.save();
  ctx.fillStyle = COLORS.gold2;
  ctx.beginPath();
  for (let i = 0; i * bite * 2 < w; i++) {
    ctx.arc(x + i * bite * 2 + bite, y, bite, Math.PI, 0, true);
  }
  for (let i = 0; i * bite * 2 < h; i++) {
    ctx.arc(x + w, y + i * bite * 2 + bite, bite, Math.PI * 1.5, Math.PI * 0.5, true);
  }
  for (let i = 0; i * bite * 2 < w; i++) {
    ctx.arc(x + w - i * bite * 2 - bite, y + h, bite, 0, Math.PI, true);
  }
  for (let i = 0; i * bite * 2 < h; i++) {
    ctx.arc(x, y + h - i * bite * 2 - bite, bite, Math.PI * 0.5, Math.PI * 1.5, true);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (logos.signet) {
    const margin = h * 0.18;
    const signetHeight = h - margin * 2;
    const signetWidth = signetHeight * LOGO_SIGNET_RATIO;
    ctx.drawImage(logos.signet, x + (w - signetWidth) / 2, y + margin, signetWidth, signetHeight);
  }
}

// ---------------- Rendering ----------------
function renderFront() {
  const w = canvasFront.width;
  const h = canvasFront.height;
  ctxFront.clearRect(0, 0, w, h);

  // Kartenhintergrund
  ctxFront.fillStyle = COLORS.dust;
  ctxFront.fillRect(0, 0, w, h);

  const { margin, bandHeight, frame, photo } = getFrontLayout(w, h);

  // Foto-Passepartout
  ctxFront.fillStyle = COLORS.white;
  drawRoundedRect(ctxFront, frame.x, frame.y, frame.w, frame.h, 14);
  ctxFront.fill();

  const px = photo.x;
  const py = photo.y;
  const pw = photo.w;
  const ph = photo.h;

  ctxFront.save();
  drawRoundedRect(ctxFront, px, py, pw, ph, 8);
  ctxFront.clip();

  if (state.photo) {
    const { sx, sy, sw, sh } =
      state.crop || coverFit(state.photo.naturalWidth, state.photo.naturalHeight, pw, ph);
    ctxFront.drawImage(state.photo, sx, sy, sw, sh, px, py, pw, ph);
  } else {
    ctxFront.fillStyle = COLORS.dust;
    ctxFront.fillRect(px, py, pw, ph);
    ctxFront.strokeStyle = COLORS.wald3;
    ctxFront.lineWidth = 4;
    ctxFront.setLineDash([16, 12]);
    ctxFront.strokeRect(px + 10, py + 10, pw - 20, ph - 20);
    ctxFront.setLineDash([]);

    ctxFront.fillStyle = COLORS.wald;
    ctxFront.font = `600 ${pw * 0.09}px ${getFontStack('heading')}`;
    ctxFront.textAlign = 'center';
    ctxFront.textBaseline = 'middle';
    ctxFront.fillText('📷', px + pw / 2, py + ph / 2 - pw * 0.06);
    ctxFront.font = `500 ${pw * 0.05}px ${getFontStack('body')}`;
    ctxFront.fillText('Foto hochladen', px + pw / 2, py + ph / 2 + pw * 0.08);
  }
  ctxFront.restore();

  // Unteres Marken-Band: Logo und Grußtext vertikal gestapelt und zentriert,
  // damit sie sich unabhängig von Textlänge/Canvas-Breite nie überlappen.
  const bandY = h - bandHeight - margin;
  ctxFront.fillStyle = COLORS.dust;
  drawRoundedRect(ctxFront, margin, bandY, w - margin * 2, bandHeight, 12);
  ctxFront.fill();

  const logoHeight = bandHeight * 0.38;
  const bandGap = bandHeight * 0.12;
  const taglineFontSize = bandHeight * 0.19;

  // Der Stapel (Logo + Abstand + Grusstext) wird als Ganzes vertikal zentriert,
  // und zwar in der OPTISCH sichtbaren Flaeche: vom unteren Rand des
  // Fotorahmens (= bandY) bis zur Kartenunterkante. Bewusst nicht nur innerhalb
  // von bandHeight — das Band ist mit COLORS.dust gefuellt, also derselben
  // Farbe wie der Kartenhintergrund, und damit gar nicht sichtbar. Unter dem
  // Band liegt noch der Kartenrand (margin) in derselben Farbe. Wer nur im Band
  // zentriert, laesst den Block deshalb um margin/2 zu hoch sitzen.
  const stackHeight = logoHeight + bandGap + taglineFontSize;
  const visibleAreaHeight = h - bandY;
  const logoY = bandY + (visibleAreaHeight - stackHeight) / 2;
  drawLogo(ctxFront, logos.full, LOGO_FULL_RATIO, w / 2, logoY, logoHeight, 'center');

  ctxFront.fillStyle = COLORS.wald;
  ctxFront.textAlign = 'center';
  ctxFront.textBaseline = 'middle';
  ctxFront.font = `600 ${taglineFontSize}px ${getFontStack('heading')}`;
  const taglineY = logoY + logoHeight + bandGap + taglineFontSize * 0.5;
  ctxFront.fillText('Grüße aus dem Schwarzwald', w / 2, taglineY);
}

function renderBack() {
  const w = canvasBack.width;
  const h = canvasBack.height;
  ctxBack.clearRect(0, 0, w, h);

  ctxBack.fillStyle = COLORS.dust;
  ctxBack.fillRect(0, 0, w, h);

  const margin = w * 0.06;
  const dividerX = w * 0.56;

  // Trennlinie
  ctxBack.strokeStyle = COLORS.wald3;
  ctxBack.lineWidth = 3;
  ctxBack.setLineDash([10, 10]);
  ctxBack.beginPath();
  ctxBack.moveTo(dividerX, margin);
  ctxBack.lineTo(dividerX, h - margin);
  ctxBack.stroke();
  ctxBack.setLineDash([]);

  // Linke Seite: Nachricht
  const msgX = margin;
  const msgY = margin + 10;
  const msgWidth = dividerX - margin * 1.6;

  ctxBack.fillStyle = COLORS.graphite;
  ctxBack.textAlign = 'left';
  ctxBack.textBaseline = 'alphabetic';
  const fontSize = w * 0.032;
  const lineHeight = fontSize * 1.5;
  ctxBack.font = `500 ${fontSize}px ${getFontStack('body')}`;

  const message = state.message || 'Deine persönliche Nachricht erscheint hier ...';
  ctxBack.globalAlpha = state.message ? 1 : 0.45;

  // dezente Schreiblinien
  ctxBack.save();
  ctxBack.strokeStyle = COLORS.wald3;
  ctxBack.globalAlpha = 0.25;
  ctxBack.lineWidth = 1.5;
  for (let ly = msgY + lineHeight; ly < h - margin; ly += lineHeight) {
    ctxBack.beginPath();
    ctxBack.moveTo(msgX, ly);
    ctxBack.lineTo(dividerX - margin * 0.6, ly);
    ctxBack.stroke();
  }
  ctxBack.restore();

  wrapText(ctxBack, message, msgX, msgY + lineHeight, msgWidth, lineHeight);
  ctxBack.globalAlpha = 1;

  // Rechte Seite: Briefmarke + Adresse
  const stampW = w * 0.2;
  const stampH = stampW * 1.2;
  const stampX = w - margin - stampW;
  const stampY = margin;
  drawStamp(ctxBack, stampX, stampY, stampW, stampH);

  // Adresszeilen
  const addrX = dividerX + margin * 0.6;
  const addrTop = stampY + stampH + h * 0.09;
  const addrLineGap = h * 0.075;
  const addrWidth = w - margin - addrX;

  ctxBack.strokeStyle = COLORS.wald2;
  ctxBack.globalAlpha = 0.5;
  ctxBack.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctxBack.beginPath();
    ctxBack.moveTo(addrX, addrTop + i * addrLineGap);
    ctxBack.lineTo(addrX + addrWidth, addrTop + i * addrLineGap);
    ctxBack.stroke();
  }
  ctxBack.globalAlpha = 1;

  ctxBack.fillStyle = COLORS.graphite;
  ctxBack.font = `600 ${w * 0.028}px ${getFontStack('body')}`;
  // Lange Empfängernamen auf zwei Zeilen umbrechen: eine Zeile fasst nur rund
  // 26 Zeichen, das Eingabefeld erlaubt aber 40 — ohne Umbruch lief der Name
  // ohne Hinweis über den Kartenrand hinaus. Jede Zeile sitzt auf einer der
  // vorgezeichneten Adresslinien, die dritte bleibt frei.
  const recipientPrefix = 'An: ';
  const recipientName = state.recipientName || '________________';
  const prefixWidth = ctxBack.measureText(recipientPrefix).width;
  const recipientLines = fitLines(
    ctxBack, recipientName, addrWidth, 2, addrWidth - prefixWidth
  );
  recipientLines.forEach((line, i) => {
    ctxBack.fillText(i === 0 ? recipientPrefix + line : line, addrX, addrTop + i * addrLineGap - 8);
  });

  // Absender auf der dritten, bislang ungenutzten Adresslinie. Gleiche
  // Ueberlaufsicherung wie beim Empfaenger: fitLines() mit einer Zeile und
  // schmalerer erster Zeile wegen des Praefixes — kein neuer Umbruchcode.
  if (state.senderName) {
    const senderPrefix = 'Von: ';
    const senderPrefixWidth = ctxBack.measureText(senderPrefix).width;
    const senderLines = fitLines(
      ctxBack, state.senderName, addrWidth, 1, addrWidth - senderPrefixWidth
    );
    ctxBack.fillText(senderPrefix + senderLines[0], addrX, addrTop + 2 * addrLineGap - 8);
  }

  // Kleines Logo unten rechts
  const smallLogoHeight = h * 0.035;
  drawLogo(ctxBack, logos.full, LOGO_FULL_RATIO, w - margin, h - margin, smallLogoHeight, 'right');
}

function getFontStack(kind) {
  return kind === 'heading'
    ? "'Zilla Slab', Georgia, serif"
    : "'Asap Condensed', 'Segoe UI', sans-serif";
}

function renderAll() {
  renderFront();
  renderBack();
}

// Setzt Vorder- und Rückseiten-Canvas gemeinsam auf dasselbe Format, damit
// sie strukturell nie voneinander abweichen können (auch nicht nach Flip,
// da rotateY nur dreht und die Canvas-Maße nicht berührt).
function applyFormat(key) {
  state.format = key;
  const { width, height } = FORMATS[key];
  canvasFront.width = width;
  canvasFront.height = height;
  canvasBack.width = width;
  canvasBack.height = height;
  flipInner.style.aspectRatio = `${width} / ${height}`;
  // Fuer die Hoehenbegrenzung der klebenden Vorschau (siehe postkarte.css,
  // @media max-width: 899px): die Kartenbreite wird dort aus 50vh * Verhaeltnis
  // gerechnet, damit Quer- und Hochformat dieselbe Maximalhoehe einhalten.
  flipWrapper.style.setProperty('--card-aspect', String(width / height));
  renderAll();
}

// ---------------- Interaction ----------------
photoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    loadImage(reader.result).then(img => {
      // Reihenfolge ist zwingend:
      //   Snapshot sichern -> applyFormat() -> getCropAspect() -> coverFit()
      // Der Snapshot muss VOR der Format-/Foto-Aenderung entstehen, sonst
      // sichert Abbrechen den bereits neuen Zustand. getCropAspect() haengt am
      // aktuellen Format, kann also erst nach applyFormat() gefragt werden.
      const snapshot = { photo: state.photo, crop: state.crop, format: state.format };

      // pickFormat() bewertet weiterhin das ORIGINAL-Verhaeltnis. Wuerde es den
      // Zuschnitt bewerten, entstuende eine Zirkelabhaengigkeit: das
      // Crop-Verhaeltnis haengt am Format, das Format am Crop.
      applyFormat(pickFormat(img.naturalWidth, img.naturalHeight));

      // Startwert = bisheriges Verhalten (mittig zugeschnitten).
      const base = coverFit(
        img.naturalWidth, img.naturalHeight, getCropAspect(), 1
      );
      setPhoto(img, base);
      renderFront();
      updateShareAvailability();
      updateRecropAvailability();
      openCropDialog(snapshot);
    });
  };
  reader.readAsDataURL(file);
});

recipientInput.addEventListener('input', () => {
  state.recipientName = recipientInput.value;
  renderBack();
});

senderInput.addEventListener('input', () => {
  state.senderName = senderInput.value;
  renderBack();
});

messageInput.addEventListener('input', () => {
  state.message = messageInput.value;
  charCount.textContent = state.message.length;
  renderBack();
});

function toggleFlip() {
  state.side = state.side === 'front' ? 'back' : 'front';
  flipInner.classList.toggle('is-flipped', state.side === 'back');
}

btnFlip.addEventListener('click', toggleFlip);
flipWrapper.addEventListener('click', e => {
  if (e.target.closest('#btn-flip')) return;
  toggleFlip();
});

function updateShareAvailability() {
  btnShare.disabled = !state.photo;
}

// ---------------- Zuschneide-Dialog ----------------
const MAX_ZOOM = 4;

// Ansichtszustand des Dialogs. Bewusst nicht das Rechteck direkt manipulieren,
// sondern Zoom + Mittelpunkt halten und das Rechteck daraus ableiten: dadurch
// ist „das Bild füllt den Ausschnitt immer vollständig" eine
// Konstruktionseigenschaft statt einer nachträglichen Prüfung. coverFit()
// liefert base.sw <= imgW; für zoom >= 1 gilt also sw <= imgW, die
// Klemmgrenzen können nie invertiert sein.
const cropView = { img: null, base: null, zoom: 1, cx: 0, cy: 0, stageW: 0, stageH: 0 };

let cropSnapshot = null;
let cropRaf = 0;
const cropPointers = new Map();
let cropLastDist = 0;

function cropRect() {
  const sw = cropView.base.sw / cropView.zoom;
  const sh = cropView.base.sh / cropView.zoom;
  return { sx: cropView.cx - sw / 2, sy: cropView.cy - sh / 2, sw, sh };
}

function clampCropCenter() {
  const { sw, sh } = cropRect();
  cropView.cx = clamp(cropView.cx, sw / 2, cropView.img.naturalWidth - sw / 2);
  cropView.cy = clamp(cropView.cy, sh / 2, cropView.img.naturalHeight - sh / 2);
}

// Stage-Größe in JS rechnen statt per aspect-ratio + max-height im CSS: das
// Canvas braucht ohnehin exakte Pixelmaße für den Backing Store, und die
// Pointer-Umrechnung hängt an genau diesen Werten.
function layoutCropStage() {
  const aspect = cropView.base.sw / cropView.base.sh;
  const maxH = Math.max(160, window.innerHeight * 0.5);
  let w = cropStage.clientWidth;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  cropView.stageW = w;
  cropView.stageH = h;

  const dpr = window.devicePixelRatio || 1;
  cropCanvas.style.width = w + 'px';
  cropCanvas.style.height = h + 'px';
  cropCanvas.width = Math.round(w * dpr);
  cropCanvas.height = Math.round(h * dpr);
}

function drawCrop() {
  cropRaf = 0;
  if (!cropView.img) return;
  const { sx, sy, sw, sh } = cropRect();
  cropCtx.fillStyle = COLORS.graphite;
  cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(cropView.img, sx, sy, sw, sh, 0, 0, cropCanvas.width, cropCanvas.height);
}

function requestCropDraw() {
  if (!cropRaf) cropRaf = requestAnimationFrame(drawCrop);
}

// Zoom mit Ankerpunkt: der Bildpunkt unter Cursor bzw. Finger-Mittelpunkt
// bleibt stehen. Gemeinsamer Pfad für Mausrad, Pinch und Slider (der Slider
// ankert mittig).
function setCropZoom(nextZoom, anchorX, anchorY) {
  const z = clamp(nextZoom, 1, MAX_ZOOM);
  const before = cropRect();
  const ax = anchorX === undefined ? cropView.stageW / 2 : anchorX;
  const ay = anchorY === undefined ? cropView.stageH / 2 : anchorY;
  const imgX = before.sx + ax * (before.sw / cropView.stageW);
  const imgY = before.sy + ay * (before.sh / cropView.stageH);

  cropView.zoom = z;
  const sw = cropView.base.sw / z;
  const sh = cropView.base.sh / z;
  cropView.cx = imgX + sw / 2 - ax * (sw / cropView.stageW);
  cropView.cy = imgY + sh / 2 - ay * (sh / cropView.stageH);

  clampCropCenter();
  cropZoomSlider.value = String(z);
  requestCropDraw();
}

// Pointer über getBoundingClientRect() umrechnen, NICHT über canvas.width —
// sonst läuft das Verschieben um den devicePixelRatio-Faktor daneben.
function cropPoint(e) {
  const rect = cropCanvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function cropPointerDist() {
  const pts = [...cropPointers.values()];
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}

function cropPointerMid() {
  const pts = [...cropPointers.values()];
  return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
}

function onCropPointerDown(e) {
  cropCanvas.setPointerCapture(e.pointerId);
  cropPointers.set(e.pointerId, cropPoint(e));
  if (cropPointers.size === 2) cropLastDist = cropPointerDist();
}

function onCropPointerMove(e) {
  if (!cropPointers.has(e.pointerId)) return;
  const prev = cropPointers.get(e.pointerId);
  const now = cropPoint(e);
  cropPointers.set(e.pointerId, now);

  if (cropPointers.size === 1) {
    const { sw, sh } = cropRect();
    cropView.cx -= (now.x - prev.x) * (sw / cropView.stageW);
    cropView.cy -= (now.y - prev.y) * (sh / cropView.stageH);
    clampCropCenter();
    requestCropDraw();
    return;
  }

  if (cropPointers.size === 2) {
    const dist = cropPointerDist();
    if (cropLastDist > 0 && dist > 0) {
      const mid = cropPointerMid();
      setCropZoom(cropView.zoom * (dist / cropLastDist), mid.x, mid.y);
    }
    cropLastDist = dist;
  }
}

function onCropPointerUp(e) {
  cropPointers.delete(e.pointerId);
  // Zurücksetzen ist nötig, sonst springt das Bild, sobald beim Pinchen ein
  // Finger abgehoben wird.
  cropLastDist = cropPointers.size === 2 ? cropPointerDist() : 0;
}

// { passive: false } ist zwingend, sonst wird preventDefault() ignoriert und
// die Seite scrollt beim Zoomen.
function onCropWheel(e) {
  e.preventDefault();
  const p = cropPoint(e);
  setCropZoom(cropView.zoom * Math.exp(-e.deltaY * 0.0015), p.x, p.y);
}

function onCropResize() {
  layoutCropStage();
  clampCropCenter();
  requestCropDraw();
}

// snapshot erlaubt dem Aufrufer, den Zustand VOR einer Format-/Foto-Änderung
// zu übergeben — der Upload-Pfad setzt beides bereits vor dem Öffnen.
function openCropDialog(snapshot) {
  if (!state.photo) return;
  cropSnapshot = snapshot || { photo: state.photo, crop: state.crop, format: state.format };

  cropView.img = state.photo;
  cropView.base = coverFit(
    state.photo.naturalWidth, state.photo.naturalHeight, getCropAspect(), 1
  );
  const current = state.crop || cropView.base;
  cropView.zoom = clamp(cropView.base.sw / current.sw, 1, MAX_ZOOM);
  cropView.cx = current.sx + current.sw / 2;
  cropView.cy = current.sy + current.sh / 2;
  cropZoomSlider.value = String(cropView.zoom);

  cropDialog.showModal();
  layoutCropStage();
  clampCropCenter();
  drawCrop();

  window.addEventListener('resize', onCropResize);
  cropCanvas.addEventListener('wheel', onCropWheel, { passive: false });
}

function closeCropDialog() {
  window.removeEventListener('resize', onCropResize);
  cropCanvas.removeEventListener('wheel', onCropWheel);
  cropPointers.clear();
  cropLastDist = 0;
  if (cropRaf) {
    cancelAnimationFrame(cropRaf);
    cropRaf = 0;
  }
  if (cropDialog.open) cropDialog.close();
  // Ohne Zurücksetzen lässt sich dieselbe Datei nicht erneut auswählen, weil
  // change dann nicht mehr feuert.
  photoInput.value = '';
}

function confirmCrop() {
  setPhoto(cropView.img, cropRect());
  closeCropDialog();
  renderFront();
  updateShareAvailability();
  updateRecropAvailability();
}

// Abbrechen stellt exakt den Zustand von vor dem Öffnen wieder her, inklusive
// Format: erster Upload + Abbrechen führt zurück zum leeren Platzhalter,
// Foto ersetzen + Abbrechen lässt altes Foto, alten Zuschnitt und altes Format
// stehen.
function cancelCrop() {
  if (cropSnapshot) {
    setPhoto(cropSnapshot.photo, cropSnapshot.crop);
    applyFormat(cropSnapshot.format);
  }
  closeCropDialog();
  updateShareAvailability();
  updateRecropAvailability();
}

function updateRecropAvailability() {
  btnRecrop.hidden = !state.photo;
}

cropCanvas.addEventListener('pointerdown', onCropPointerDown);
cropCanvas.addEventListener('pointermove', onCropPointerMove);
cropCanvas.addEventListener('pointerup', onCropPointerUp);
cropCanvas.addEventListener('pointercancel', onCropPointerUp);
cropZoomSlider.addEventListener('input', () => setCropZoom(parseFloat(cropZoomSlider.value)));
cropConfirmBtn.addEventListener('click', confirmCrop);
cropCancelBtn.addEventListener('click', cancelCrop);
// Escape nativ abfangen und über denselben Pfad wie der Abbrechen-Button
// laufen lassen, damit der Snapshot zurückgespielt wird.
cropDialog.addEventListener('cancel', e => {
  e.preventDefault();
  cancelCrop();
});
// Bewusst NICHT per Klick auf die Karte: diese Fläche hat bereits den
// Flip-Handler.
btnRecrop.addEventListener('click', () => openCropDialog());

// ---------------- Teilen / Export ----------------
// Story-Format 9:16 für Instagram Story / WhatsApp-Status. Bewusst eine eigene
// Funktion neben buildCombinedCanvas(): Letztere ist die unveränderte Quelle für
// den normalen Export und wird hier nicht angefasst.
const STORY = { width: 1080, height: 1920 };

// Karte mit weichem Schatten und runden Ecken auf den Story-Hintergrund setzen.
// Die Canvases selbst haben harte Ecken (der Radius lebt sonst nur im CSS) —
// auf farbigem Grund fällt das sofort auf, deshalb hier explizit.
function drawCardOnStory(ctx, source, x, y, w, h) {
  const radius = w * 0.03;

  ctx.save();
  ctx.shadowColor = 'rgba(15, 26, 17, 0.38)';
  ctx.shadowBlur = w * 0.05;
  ctx.shadowOffsetY = h * 0.025;
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.fillStyle = COLORS.dust;
  ctx.fill();
  ctx.restore();

  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(source, x, y, w, h);
  ctx.restore();
}

function buildStoryCanvas() {
  const story = document.createElement('canvas');
  story.width = STORY.width;
  story.height = STORY.height;
  const ctx = story.getContext('2d');

  // Markenverlauf wie auf der Seite (postkarte.css, body).
  const bg = ctx.createLinearGradient(0, 0, 0, STORY.height);
  bg.addColorStop(0, COLORS.wald);
  bg.addColorStop(0.45, COLORS.wald2);
  bg.addColorStop(1, COLORS.wald3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, STORY.width, STORY.height);

  // Vorder- und Rückseite direkt auf den Verlauf stapeln, damit zwischen den
  // Karten der Hintergrund durchscheint. buildCombinedCanvas() wäre hier falsch:
  // dessen wald-farbene Fläche läge als dunkler Kasten auf dem Verlauf.
  const cardW = canvasFront.width;
  const cardH = canvasFront.height;
  const gapSource = cardH * 0.05;
  const stackH = cardH * 2 + gapSource;

  // Unten mehr Platz lassen als oben: dort sitzt das Logo, und Story-Oberflächen
  // blenden am unteren Rand gern eigene Bedienelemente ein.
  const boxX = STORY.width * 0.075;
  const boxTop = STORY.height * 0.05;
  const boxBottom = STORY.height * 0.125;
  const boxW = STORY.width - boxX * 2;
  const boxH = STORY.height - boxTop - boxBottom;

  const scale = Math.min(boxW / cardW, boxH / stackH);
  const dw = cardW * scale;
  const dh = cardH * scale;
  const dx = (STORY.width - dw) / 2;
  const dy = boxTop + (boxH - stackH * scale) / 2;

  drawCardOnStory(ctx, canvasFront, dx, dy, dw, dh);
  drawCardOnStory(ctx, canvasBack, dx, dy + (cardH + gapSource) * scale, dw, dh);

  // Dust-Logovariante — laut Brand Guideline nur auf dunklem Grund, was hier
  // gegeben ist. Fehlt die Datei, bleibt die Story einfach ohne Logo.
  if (logos.fullDust) {
    const logoH = STORY.height * 0.032;
    const logoY = STORY.height - boxBottom + (boxBottom - logoH) / 2;
    drawLogo(ctx, logos.fullDust, LOGO_FULL_RATIO, STORY.width / 2, logoY, logoH, 'center');
  }

  return story;
}


function buildCombinedCanvas() {
  const gap = 40;
  const combined = document.createElement('canvas');
  combined.width = canvasFront.width;
  combined.height = canvasFront.height * 2 + gap;
  const ctx = combined.getContext('2d');
  ctx.fillStyle = COLORS.wald;
  ctx.fillRect(0, 0, combined.width, combined.height);
  ctx.drawImage(canvasFront, 0, 0);
  ctx.drawImage(canvasBack, 0, canvasFront.height + gap);
  return combined;
}

// 'both' = Vorder- und Rückseite gestapelt (bisheriges Verhalten),
// 'story' = 9:16 für Instagram Story und WhatsApp-Status.
let shareFormat = 'both';

function setShareFormat(key) {
  shareFormat = key;
  const storyActive = key === 'story';
  fmtStory.classList.toggle('is-active', storyActive);
  fmtBoth.classList.toggle('is-active', !storyActive);
  fmtStory.setAttribute('aria-pressed', String(storyActive));
  fmtBoth.setAttribute('aria-pressed', String(!storyActive));
  shareStatus.textContent = '';
}

function shareText() {
  return state.senderName
    ? `Eine Urlaubspostkarte von ${state.senderName} aus dem Schwarzwald.`
    : 'Schau dir meine Postkarte aus dem Schwarzwald an!';
}

// renderAll() stellt sicher, dass garantiert der aktuelle State exportiert
// wird, unabhängig davon, ob die Canvases zufällig schon aktuell sind.
function currentExport() {
  renderAll();
  const isStory = shareFormat === 'story';
  return {
    canvas: isStory ? buildStoryCanvas() : buildCombinedCanvas(),
    filename: isStory
      ? 'ab-ins-gruene-postkarte-story.png'
      : 'ab-ins-gruene-postkarte.png',
    isStory
  };
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function sharePostcard() {
  const { canvas: source, filename, isStory } = currentExport();
  source.toBlob(async blob => {
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Meine Ab ins Grüne Postkarte',
          text: shareText()
        });
        shareStatus.textContent = '';
      } catch (err) {
        if (err.name !== 'AbortError') {
          shareStatus.textContent = 'Teilen war leider nicht möglich.';
        }
      }
      return;
    }

    saveBlob(blob, filename);
    shareStatus.textContent = isStory
      ? 'Story-Bild wurde gespeichert!'
      : 'Postkarte wurde gespeichert!';
  }, 'image/png');
}

btnShare.addEventListener('click', sharePostcard);
fmtBoth.addEventListener('click', () => setShareFormat('both'));
fmtStory.addEventListener('click', () => setShareFormat('story'));

// ---------------- Init ----------------
applyFormat('landscape');
updateRecropAvailability();

Promise.all([
  loadImage(LOGO_FULL_SRC),
  loadImage(LOGO_SIGNET_SRC),
  loadImage(LOGO_FULL_DUST_SRC)
])
  .then(([full, signet, fullDust]) => {
    logos.full = full;
    logos.signet = signet;
    logos.fullDust = fullDust;
    renderAll();
  })
  .catch(() => {
    renderAll();
  });

// Web-Fonts (Zilla Slab / Asap Condensed) laden asynchron; Canvas-Text, das
// vor Ladeende gezeichnet wurde, nutzt Fallback-Metriken. Einmaliger
// Re-Render nach Ladeende korrigiert Zeilenumbruch/Positionierung verlässlich.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => renderAll());
}
