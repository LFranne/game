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
// Gestapelte Variante (Signet ueber dem Schriftzug), sitzt auf der Rueckseite
// unten in der Nachrichtenspalte. Verhaeltnis aus dem viewBox (396.85 x 222.05).
const LOGO_STACKED_SRC = 'assets/AIG_logotype_signet_oben_wald.svg';
const LOGO_STACKED_RATIO = 396.85 / 222.05;

// Briefmarken-Motive. Die Dateien bringen ihren Zackenrand selbst mit und
// sind freigestellt — drawStamp() zeichnet deshalb keinen goldenen Rahmen
// darunter, sondern nur noch das Bild. Zwei Motive sind hoch-, zwei
// querformatig; deshalb wird jedes Motiv per "contain" in den Markenplatz
// eingepasst statt auf feste Masse gezogen (siehe drawStamp).
// Laedt eine Datei nicht, bleibt stampImages[...] null und es wird die
// gezeichnete Signet-Marke verwendet — der Generator funktioniert also auch
// ohne die Motive.
const STAMPS = [
  { id: 'bad-wildbad',    label: 'Bad Wildbad',    src: 'assets/AIG_marke_bad_wildbad.webp' },
  { id: 'hasen',          label: 'Hasen',          src: 'assets/AIG_marke_hasen.webp' },
  { id: 'sommerbergbahn', label: 'Sommerbergbahn', src: 'assets/AIG_marke_sommerbergbahn.webp' },
  { id: 'wasserrad',      label: 'Wasserrad',      src: 'assets/AIG_marke_wasserrad.webp' }
];

// Sticker liegen auf der RUECKSEITE unter den Adresszeilen, in festen Plaetzen
// (bis zu MAX_STICKERS Stueck, dasselbe Motiv auch mehrfach). Die Vorderseite
// bleibt bewusst frei: dort gehoert nur das Foto hin. Wie bei den Briefmarken
// sind die Dateien freigestellt und werden einzeln geladen: fehlt eine, bleiben
// die uebrigen waehlbar, und ein Sticker wird nur angeboten, wenn sein Bild da
// ist.
const STICKERS = [
  { id: 'bad-wildbad',      label: 'Bad Wildbad',               src: 'assets/AIG_sticker_bad_wildbad.webp' },
  { id: 'baumwipfelpfad',   label: 'Baumwipfelpfad',            src: 'assets/AIG_sticker_baumwipfelpfad.webp' },
  { id: 'palais-thermal',   label: 'Palais Thermal',            src: 'assets/AIG_sticker_palais_thermal.webp' },
  { id: 'paragliding',      label: 'Paragliding',               src: 'assets/AIG_sticker_paragliding.webp' },
  { id: 'kirschtorte',      label: 'Schwarzwälder Kirschtorte', src: 'assets/AIG_sticker_kirschtorte.webp' },
  { id: 'marie',            label: 'Schwarzwald Marie',         src: 'assets/AIG_sticker_marie.webp' },
  { id: 'wild-blue-forest', label: 'Wild Blue Forest',          src: 'assets/AIG_sticker_wild_blue_forest.webp' },
  { id: 'wildline',         label: 'Wildline',                  src: 'assets/AIG_sticker_wildline.webp' }
];
const MAX_STICKERS = 4;

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

// Nur Querformat. Hochformat war frueher als zweites Format vorhanden, sah
// aber nicht gut aus (Rueckseite und Stapel-Export) und wurde am 2026-09-29
// gestrichen. Hochformatfotos werden ueber den Zuschneide-Dialog auf das
// Querformat zugeschnitten. applyFormat()/state.format bleiben bestehen, weil
// der Abbrechen-Pfad des Dialogs damit arbeitet.
const FORMATS = {
  // 1,7x der urspruenglichen 1697x1200. Die gesamte Layout-Mathematik rechnet
  // in Anteilen von canvas.width/height, deshalb aendert eine hoehere
  // Aufloesung nichts am Aussehen — nur der Export gewinnt Detail. Noetig
  // wurde das durch die Briefmarken-Motive: deren Beschriftung war im
  // heruntergeladenen PNG beim Hineinzoomen nicht mehr aufzuloesen.
  // Obergrenze ist der gestapelte Export (Vorder- + Rueckseite in einem Bild):
  // 2880x4112 sind 11,8 Megapixel und lassen Luft zur Canvas-Grenze von iOS
  // Safari (16,7 MP), ab der ein Canvas ohne Fehlermeldung leer bleibt.
  // Die Renderzeit spielt keine Rolle (gemessen 0,1–0,2 ms pro Rueckseite).
  landscape: { width: 2880, height: 2036 }
};

// Eckenradien als Anteil der Kartenbreite. Frueher waren Rahmen und Foto feste
// 14/8 Pixel — bei 2880 px Breite wirkte das im Export fast eckig. Die aeussere
// Karte (Story/"Beide Seiten") und die Vorschau (postkarte.css:
// border-radius 4% / 5.66%, kreisrund im Kartenverhaeltnis 1,414) nutzen 4 %.
const CARD_RADIUS = { card: 0.04, frame: 0.016, photo: 0.011 };

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
  format: null,
  // id aus STAMPS. Startwert ist das erste Motiv; faellt auf die gezeichnete
  // Signet-Marke zurueck, wenn die Bilddatei nicht geladen werden konnte.
  stamp: STAMPS[0].id,
  // Ids aus STICKERS in der Reihenfolge der Plaetze (Index = Platz, max.
  // MAX_STICKERS). Wird ein Sticker entfernt, ruecken die uebrigen nach.
  stickers: []
};

// Einzige Schreibstelle für photo + crop — erzwingt die Invariante oben.
function setPhoto(img, crop) {
  state.photo = img;
  state.crop = crop;
}

// Standardbild fuer die Vorderseite, solange noch kein eigenes Foto gewaehlt ist
// (null = nicht geladen -> alter leerer Platzhalter).
const DEFAULT_PHOTO_SRC = 'assets/AIG_default_photo.webp';
let defaultPhoto = null;
const logos = { full: null, signet: null, fullDust: null, stacked: null };
// id -> Image, oder null wenn die Datei fehlt/nicht geladen werden konnte.
const stampImages = {};
const stickerImages = {};

// ---------------- DOM refs ----------------
const canvasFront = document.getElementById('canvas-front');
const canvasBack = document.getElementById('canvas-back');
const ctxFront = canvasFront.getContext('2d');
const ctxBack = canvasBack.getContext('2d');

const flipInner = document.getElementById('postcard-flip-inner');
const flipWrapper = document.getElementById('postcard-flip');
const btnFlip = document.getElementById('btn-flip');
const btnShare = document.getElementById('btn-share');
const shareLabel = document.getElementById('share-label');
const shareStatus = document.getElementById('share-status');

const fmtBoth = document.getElementById('fmt-both');
const fmtStory = document.getElementById('fmt-story');
const fmtGif = document.getElementById('fmt-gif');
const fmtVideo = document.getElementById('fmt-video');

const photoInput = document.getElementById('photo-input');
const recipientInput = document.getElementById('recipient-input');
const senderInput = document.getElementById('sender-input');
const messageInput = document.getElementById('message-input');
const charCount = document.getElementById('char-count');

const btnRecrop = document.getElementById('btn-recrop');
const stampGroup = document.getElementById('stamp-group');
const stampChoices = [...document.querySelectorAll('.stamp-choice')];
const stickerGroup = document.getElementById('sticker-group');
const stickerCount = document.getElementById('sticker-count');
const stickerChoices = [...document.querySelectorAll('.sticker-choice')];
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

// Bricht text an Leerzeichen und Zeilenumbruechen auf Zeilen der Breite maxWidth
// um und gibt sie als Array zurueck (ohne zu zeichnen).
function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  text.split('\n').forEach(paragraph => {
    let currentLine = '';
    paragraph.split(' ').forEach(word => {
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
  return lines;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const lines = wrapLines(ctx, text, maxWidth);
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

// Canvas-Standard fuer imageSmoothingQuality ist 'low' — ein billiger Filter,
// der beim Verkleinern sichtbar Detail kostet. Genau das passiert hier
// staendig: das Urlaubsfoto (oft 4000px breit) auf Kartenbreite, das
// Briefmarken-Motiv von 1400 auf rund 750, und im Story-Export die komplette
// Karte. Muss nach jedem Setzen von canvas.width erneut gesetzt werden, weil
// eine Groessenaenderung den gesamten Kontextzustand zuruecksetzt — deshalb
// steht der Aufruf am Anfang jeder Zeichenfunktion, nicht einmalig im Init.
function setHighQuality(ctx) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

// Zeichnet den Bildausschnitt rect (Naturpixel) in das Zielrechteck. Ragt rect
// ueber das Bild hinaus (Herauszoomen), bleibt der Rand dust-farbig statt das
// Bild zu strecken; drawImage mit Quelle ausserhalb des Bildes ist je nach
// Browser unzuverlaessig, deshalb wird auf die Bildflaeche geschnitten.
function drawPhotoRect(ctx, img, rect, dx, dy, dw, dh) {
  const { sx, sy, sw, sh } = rect;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (sx >= 0 && sy >= 0 && sx + sw <= iw + 0.5 && sy + sh <= ih + 0.5) {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  ctx.fillStyle = COLORS.dust;
  ctx.fillRect(dx, dy, dw, dh);
  const x0 = Math.max(sx, 0);
  const y0 = Math.max(sy, 0);
  const x1 = Math.min(sx + sw, iw);
  const y1 = Math.min(sy + sh, ih);
  if (x1 <= x0 || y1 <= y0) return;
  const kx = dw / sw;
  const ky = dh / sh;
  ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0,
    dx + (x0 - sx) * kx, dy + (y0 - sy) * ky, (x1 - x0) * kx, (y1 - y0) * ky);
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
// Zeichnet das gewaehlte Briefmarken-Motiv rechtsbuendig oben in den
// uebergebenen Platz und liefert die tatsaechlich belegte Hoehe zurueck —
// der Adressblock darunter richtet sich daran aus.
// x/y/w/h beschreiben den maximal verfuegbaren Platz, nicht die Zielmasse:
// Das Motiv wird per "contain" eingepasst, damit die querformatigen Marken
// nicht ueber die gestrichelte Trennlinie ins Nachrichtenfeld laufen (bei
// gleichbleibender Hoehe waere die Sommerbergbahn-Marke 660px breit und
// haette die Linie um rund 15px ueberschritten).
function drawStampArt(ctx, img, x, y, w, h) {
  const ratio = img.naturalWidth / img.naturalHeight;
  let drawW = w;
  let drawH = w / ratio;
  if (drawH > h) {
    drawH = h;
    drawW = h * ratio;
  }
  ctx.drawImage(img, x + (w - drawW), y, drawW, drawH);
  return drawH;
}

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

// Einpassen (contain) eines Bildes in ein Quadrat, zentriert. Die Sticker sind
// hoch, quer oder quadratisch und sollen nie verzerrt werden.
function containInSquare(img, x, y, size) {
  const ratio = img.naturalWidth / img.naturalHeight;
  const w = ratio >= 1 ? size : size * ratio;
  const h = ratio >= 1 ? size / ratio : size;
  return { x: x + (size - w) / 2, y: y + (size - h) / 2, w, h };
}

// Platz und Groesse der Sticker je nach Anzahl (1-4), alles in dem uebergebenen
// Bereich zentriert: 1 = eine grosse Zelle, 2 = nebeneinander oder untereinander
// (was mehr Platz nutzt), 3 = eine Reihe oder 2x2 mit zentrierter dritter Zelle (was groesser wird), 4 = 2x2. Die
// Zellgroesse ist pro Anzahl gedeckelt (Anteil der Kartenbreite), damit ein
// einzelner Sticker die Rueckseite nicht erschlaegt.
function getStickerLayout(n, x, y, w, h, cardW) {
  if (n < 1) return [];
  const gap = Math.min(w, h) * 0.04;
  let cols;
  let rows;
  let cell;
  if (n === 1) {
    cols = 1; rows = 1;
    cell = Math.min(w, h, cardW * 0.26);
  } else if (n === 2) {
    const side = Math.min((w - gap) / 2, h);
    const stack = Math.min(w, (h - gap) / 2);
    cell = Math.min(Math.max(side, stack), cardW * 0.21);
    const sideBySide = side >= stack;
    cols = sideBySide ? 2 : 1;
    rows = sideBySide ? 1 : 2;
  } else {
    const grid = Math.min((w - gap) / 2, (h - gap) / 2);
    const row = n === 3 ? Math.min((w - gap * 2) / 3, h) : 0;
    if (row > grid) {
      // Drei in einer Reihe nutzt die flache Flaeche besser als 2x2.
      cols = 3; rows = 1;
      cell = Math.min(row, cardW * 0.17);
    } else {
      cols = 2; rows = 2;
      cell = Math.min(grid, cardW * 0.15);
    }
  }
  cell = Math.max(cell, 0);

  const gridW = cell * cols + gap * (cols - 1);
  const gridH = cell * rows + gap * (rows - 1);
  const startX = x + (w - gridW) / 2;
  const startY = y + Math.max((h - gridH) / 2, 0);

  const cells = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    // Einzelne Zelle in der letzten Zeile (n = 3) mittig setzen.
    const inRow = Math.min(cols, n - row * cols);
    const rowOffset = (cols - inRow) * (cell + gap) / 2;
    cells.push({ x: startX + rowOffset + col * (cell + gap), y: startY + row * (cell + gap), size: cell });
  }
  return cells;
}

// Zeichnet die gewaehlten Sticker in den uebergebenen Platz (x/y/w/h = maximal
// verfuegbar, nicht Zielmass), Bilder per contain, nie verzerrt.
// showSlots (nur Vorschau, nie Export): solange noch kein Sticker gewaehlt ist,
// zeigen vier gestrichelte, nummerierte Zellen die moeglichen Plaetze; mit dem
// ersten Sticker passt sich das Layout der Anzahl an. Ohne Sticker und ohne
// showSlots bleibt der Bereich komplett leer.
function drawBackStickers(ctx, x, y, w, h, showSlots) {
  if (w <= 0 || h <= 0) return;
  const placed = state.stickers.filter(id => stickerImages[id]);
  if (!placed.length && !showSlots) return;

  if (!placed.length) {
    // Leere Vorschau: alle vier moeglichen Plaetze nummeriert zeigen.
    getStickerLayout(MAX_STICKERS, x, y, w, h, ctx.canvas.width).forEach((slot, i) => {
      ctx.save();
      ctx.strokeStyle = COLORS.wald3;
      ctx.fillStyle = COLORS.wald3;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(2, slot.size * 0.012);
      ctx.setLineDash([slot.size * 0.05, slot.size * 0.04]);
      drawRoundedRect(ctx, slot.x, slot.y, slot.size, slot.size, slot.size * 0.08);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `600 ${slot.size * 0.36}px ${getFontStack('heading')}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), slot.x + slot.size / 2, slot.y + slot.size / 2);
      ctx.restore();
    });
    return;
  }

  const cells = getStickerLayout(placed.length, x, y, w, h, ctx.canvas.width);
  placed.forEach((id, i) => {
    const { x: cx, y: cy, size } = cells[i];
    const img = stickerImages[id];
    const box = containInSquare(img, cx, cy, size);
    // Dezenter Schatten, damit der Sticker wie aufgeklebt wirkt.
    ctx.save();
    ctx.shadowColor = 'rgba(15, 26, 17, 0.28)';
    ctx.shadowBlur = size * 0.03;
    ctx.shadowOffsetY = size * 0.012;
    ctx.drawImage(img, box.x, box.y, box.w, box.h);
    ctx.restore();
  });
}

// Eine Adresszeile: Beschriftung ("An:" / "Von:") links in Zilla Slab,
// der eingegebene Name kursiv direkt dahinter. Passt
// der Name nicht, wird die Schrift zuerst bis auf 70 % verkleinert, erst dann
// mit Ellipse gekuerzt — das Eingabefeld erlaubt 40 Zeichen.
function drawAddressLine(ctx, label, name, x, lineY, maxWidth, fontSize) {
  const baseline = lineY - fontSize * 0.14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Beschriftung in Zilla Slab (Ueberschriftenschrift der Guideline).
  ctx.font = `600 ${fontSize}px ${getFontStack('heading')}`;
  ctx.fillText(label, x, baseline);
  if (!name) return;

  const pad = fontSize * 0.3;
  const nameStart = x + ctx.measureText(label).width + pad;
  const nameWidth = x + maxWidth - nameStart;
  let size = fontSize * 1.05;
  const setFont = () => { ctx.font = `italic 500 ${size}px ${getFontStack('body')}`; };
  setFont();
  while (ctx.measureText(name).width > nameWidth && size > fontSize * 0.7) {
    size -= fontSize * 0.02;
    setFont();
  }
  const text = ctx.measureText(name).width > nameWidth
    ? fitLines(ctx, name, nameWidth, 1)[0]
    : name;
  // Direkt hinter dem Doppelpunkt, linksbuendig.
  ctx.fillText(text, nameStart, baseline);
}

// Kamera-Symbol fuer den leeren Fotoplatz, gezeichnet statt als Emoji (ein
// Emoji kaeme aus einer Systemschrift, erlaubt sind nur die Guideline-Schriften).
function drawCameraIcon(ctx, cx, cy, size, color = COLORS.wald) {
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.stroke(new Path2D('M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'));
  ctx.beginPath();
  ctx.arc(12, 13, 3.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------------- Rendering ----------------
// Hinweis auf dem Standardbild: zeigt, dass hier ein eigenes Foto hinein kann.
// Nur die Vorschau zeichnet ihn (showHint), nie die Exporte.
function drawDefaultPhotoHint(ctx, px, py, pw, ph) {
  const label = 'Eigenes Foto hochladen';
  const fontSize = pw * 0.038;
  const icon = fontSize * 1.5;
  ctx.save();
  ctx.font = `600 ${fontSize}px ${getFontStack('body')}`;
  const textW = ctx.measureText(label).width;
  const padX = fontSize * 0.9;
  const gap = fontSize * 0.55;
  const boxW = padX * 2 + icon + gap + textW;
  const boxH = fontSize * 2.5;
  const bx = px + (pw - boxW) / 2;
  const by = py + ph - boxH - ph * 0.06;

  ctx.shadowColor = 'rgba(15, 26, 17, 0.35)';
  ctx.shadowBlur = fontSize * 0.8;
  drawRoundedRect(ctx, bx, by, boxW, boxH, boxH / 2);
  ctx.fillStyle = 'rgba(37, 60, 40, 0.88)';
  ctx.fill();
  ctx.shadowColor = 'transparent';

  drawCameraIcon(ctx, bx + padX + icon / 2, by + boxH / 2, icon, COLORS.white);
  ctx.fillStyle = COLORS.white;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, bx + padX + icon + gap, by + boxH / 2 + fontSize * 0.04);
  ctx.restore();
}

function renderFrontTo(canvas, ctx, showHint) {
  setHighQuality(ctx);
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // Kartenhintergrund
  ctx.fillStyle = COLORS.dust;
  ctx.fillRect(0, 0, w, h);

  const { margin, bandHeight, frame, photo } = getFrontLayout(w, h);

  // Foto-Passepartout
  ctx.fillStyle = COLORS.white;
  drawRoundedRect(ctx, frame.x, frame.y, frame.w, frame.h, w * CARD_RADIUS.frame);
  ctx.fill();

  const px = photo.x;
  const py = photo.y;
  const pw = photo.w;
  const ph = photo.h;

  ctx.save();
  drawRoundedRect(ctx, px, py, pw, ph, w * CARD_RADIUS.photo);
  ctx.clip();

  if (state.photo) {
    const { sx, sy, sw, sh } =
      state.crop || coverFit(state.photo.naturalWidth, state.photo.naturalHeight, pw, ph);
    drawPhotoRect(ctx, state.photo, { sx, sy, sw, sh }, px, py, pw, ph);
  } else if (defaultPhoto) {
    const c = coverFit(defaultPhoto.naturalWidth, defaultPhoto.naturalHeight, pw, ph);
    drawPhotoRect(ctx, defaultPhoto, c, px, py, pw, ph);
    if (showHint) drawDefaultPhotoHint(ctx, px, py, pw, ph);
  } else {
    ctx.fillStyle = COLORS.dust;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = COLORS.wald3;
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(px + 10, py + 10, pw - 20, ph - 20);
    ctx.setLineDash([]);

    ctx.fillStyle = COLORS.wald;
    ctx.font = `600 ${pw * 0.09}px ${getFontStack('heading')}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    drawCameraIcon(ctx, px + pw / 2, py + ph / 2 - pw * 0.06, pw * 0.09);
    ctx.font = `500 ${pw * 0.05}px ${getFontStack('body')}`;
    ctx.fillText('Foto hochladen', px + pw / 2, py + ph / 2 + pw * 0.08);
  }
  ctx.restore();

  // Unteres Marken-Band: Logo und Grußtext vertikal gestapelt und zentriert,
  // damit sie sich unabhängig von Textlänge/Canvas-Breite nie überlappen.
  const bandY = h - bandHeight - margin;
  ctx.fillStyle = COLORS.dust;
  drawRoundedRect(ctx, margin, bandY, w - margin * 2, bandHeight, 12);
  ctx.fill();

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
  drawLogo(ctx, logos.full, LOGO_FULL_RATIO, w / 2, logoY, logoHeight, 'center');

  ctx.fillStyle = COLORS.wald;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${taglineFontSize}px ${getFontStack('heading')}`;
  const taglineY = logoY + logoHeight + bandGap + taglineFontSize * 0.5;
  ctx.fillText('Grüße aus dem Schwarzwald', w / 2, taglineY);
}

function renderFront() {
  invalidatePendingShare();
  renderFrontTo(canvasFront, ctxFront, true);
}

function renderBackTo(canvas, ctx, showSlots) {
  setHighQuality(ctx);
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  ctx.fillStyle = COLORS.dust;
  ctx.fillRect(0, 0, w, h);

  const margin = w * 0.06;
  // Bewusst links von der Mitte: die Nachrichtenspalte ist schmaler als frueher,
  // damit rechts genug Breite fuer Adresszeilen und Sticker bleibt.
  const dividerX = w * 0.5;

  // Trennlinie
  ctx.strokeStyle = COLORS.wald3;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(dividerX, margin);
  ctx.lineTo(dividerX, h - margin);
  ctx.stroke();
  ctx.setLineDash([]);

  // Linke Seite: Nachricht
  const msgX = margin;
  const msgY = margin + 10;
  const msgWidth = dividerX - margin * 1.6;

  // Logo unten in der Nachrichtenspalte (gestapelte Variante), mittig unter den
  // Schreiblinien. Die Nachricht endet oberhalb davon.
  const lineEndX = dividerX - margin * 0.6;
  const logoH = h * 0.135;
  const logoTop = h - margin - logoH;
  const msgBottom = logoTop - h * 0.03;
  drawLogo(ctx, logos.stacked, LOGO_STACKED_RATIO, (msgX + lineEndX) / 2, logoTop, logoH, 'center');

  ctx.fillStyle = COLORS.graphite;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const message = state.message || 'Deine persönliche Nachricht erscheint hier ...';

  // Schrift bis auf 70 % verkleinern, falls die (maximal 200 Zeichen lange)
  // Nachricht sonst in das Logo liefe. Im Normalfall bleibt es bei voller Groesse.
  // Schrift wie bei den Namen in den Adresszeilen (Asap Condensed Italic 500).
  // Der Text beginnt eine Zeile tiefer als frueher (msgTop), der Nachrichten-
  // bereich ist damit von oben um eine Zeile kleiner.
  const baseFontSize = w * 0.032;
  let fontSize = baseFontSize;
  let lineHeight;
  let lines;
  let msgTop;
  for (;;) {
    lineHeight = fontSize * 1.5;
    msgTop = msgY + lineHeight;
    ctx.font = `italic 500 ${fontSize}px ${getFontStack('body')}`;
    lines = wrapLines(ctx, message, msgWidth);
    const lastBaseline = msgTop + lineHeight + (lines.length - 1) * lineHeight;
    if (lastBaseline <= msgBottom || fontSize <= baseFontSize * 0.7) break;
    fontSize *= 0.96;
  }
  ctx.globalAlpha = state.message ? 1 : 0.45;

  // dezente Schreiblinien, nur bis zum Logo
  ctx.save();
  ctx.strokeStyle = COLORS.wald3;
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 1.5;
  for (let ly = msgTop + lineHeight; ly <= msgBottom; ly += lineHeight) {
    ctx.beginPath();
    ctx.moveTo(msgX, ly);
    ctx.lineTo(lineEndX, ly);
    ctx.stroke();
  }
  ctx.restore();

  lines.forEach((line, i) => ctx.fillText(line, msgX, msgTop + lineHeight + i * lineHeight));
  ctx.globalAlpha = 1;

  // Rechte Seite: Briefmarke, Adresszeilen, Sticker
  // Die Marke ist klein (rund 17 % der Kartenbreite, etwa wie eine echte
  // Briefmarke). Adresszeilen und Sticker richten sich bewusst nach dem
  // MAXIMALEN Markenplatz (stampH), nicht nach der tatsaechlich gezeichneten
  // Hoehe: sonst wuerden sie beim Wechsel zwischen hoch- und querformatiger
  // Marke springen. Die Anordnung ist fuer jedes Motiv identisch.
  const stampW = w * 0.17;
  const stampH = stampW * 1.2;
  const stampX = w - margin - stampW;
  const stampY = margin;
  const stampArt = stampImages[state.stamp];
  if (stampArt) {
    // Querformatige Motive duerfen breiter sein (bis 23 % der Kartenbreite),
    // die Hoehe bleibt auf stampH gedeckelt. Hochformatige sind hoehengebunden
    // und bleiben so gross wie vorher. Die Anordnung darunter aendert sich nie.
    const artW = stampArt.naturalWidth > stampArt.naturalHeight ? w * 0.23 : stampW;
    drawStampArt(ctx, stampArt, w - margin - artW, stampY, artW, stampH);
  } else {
    drawStamp(ctx, stampX, stampY, stampW, stampH);
  }

  const addrX = dividerX + margin * 0.6;
  const addrWidth = w - margin - addrX;

  // Adresszeilen: eine fuer den Empfaenger, eine fuer den Absender.
  const addrTop = stampY + stampH + h * 0.045;
  const addrLineGap = h * 0.08;

  ctx.strokeStyle = COLORS.wald2;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.moveTo(addrX, addrTop + i * addrLineGap);
    ctx.lineTo(addrX + addrWidth, addrTop + i * addrLineGap);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.graphite;
  const addrFontSize = w * 0.034;
  drawAddressLine(ctx, 'An:', state.recipientName, addrX, addrTop, addrWidth, addrFontSize);
  drawAddressLine(ctx, 'Von:', state.senderName, addrX, addrTop + addrLineGap, addrWidth, addrFontSize);

  // Sticker unter den Adresszeilen bis zum unteren Kartenrand.
  const stickerTop = addrTop + addrLineGap + h * 0.04;
  const stickerBottom = h - margin;
  drawBackStickers(ctx, addrX, stickerTop, addrWidth, stickerBottom - stickerTop, showSlots);
}

function renderBack() {
  invalidatePendingShare();
  // Nur die Vorschau zeigt die freien, nummerierten Sticker-Plaetze.
  renderBackTo(canvasBack, ctxBack, true);
}

// Blendet Motive aus, deren Datei nicht geladen werden konnte, markiert das
// aktive und versteckt die ganze Gruppe, wenn kein einziges Motiv da ist.
// Wird nach jedem Ladeversuch erneut aufgerufen, weil die Bilder einzeln und
// asynchron eintreffen.
function updateStampOptions() {
  let verfuegbar = 0;
  stampChoices.forEach(btn => {
    const id = btn.dataset.stamp;
    const geladen = Boolean(stampImages[id]);
    btn.hidden = !geladen;
    btn.setAttribute('aria-pressed', String(geladen && state.stamp === id));
    btn.classList.toggle('is-active', geladen && state.stamp === id);
    if (geladen) verfuegbar++;
  });
  stampGroup.hidden = verfuegbar === 0;

  // Faellt das aktive Motiv aus, auf das erste verfuegbare wechseln, damit
  // nie eine Auswahl markiert ist, die es nicht gibt.
  // Wichtig ist die Unterscheidung zwischen "fehlgeschlagen" und "noch nicht
  // geladen": die Motive treffen einzeln und in unvorhersehbarer Reihenfolge
  // ein. Eine blosse Falsy-Pruefung wuerde beim ersten eintreffenden Motiv
  // zuschlagen, weil die uebrigen zu dem Zeitpunkt noch undefined sind — die
  // Voreinstellung waere dann zufaellig das zuerst geladene Motiv statt des
  // ersten aus STAMPS. Fehlgeschlagen ist nur, was explizit auf null steht.
  const aktivesFehlgeschlagen =
    Object.prototype.hasOwnProperty.call(stampImages, state.stamp) && !stampImages[state.stamp];
  if (verfuegbar > 0 && aktivesFehlgeschlagen) {
    const ersatz = STAMPS.find(s => stampImages[s.id]);
    if (ersatz) {
      state.stamp = ersatz.id;
      updateStampOptions();
      renderBack();
    }
  }
}

function selectStamp(id) {
  if (!stampImages[id] || state.stamp === id) return;
  state.stamp = id;
  updateStampOptions();
  renderBack();
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

      // Immer Querformat, siehe FORMATS.
      applyFormat('landscape');

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
// Solange noch kein Foto da ist, lockt die Vorderseite mit Kamera-Symbol und
// "Foto hochladen": Ein Tipp in diese Fläche öffnet direkt die Fotoauswahl,
// statt die Karte umzudrehen. Ausserhalb der Fläche (Rand, Band) und sobald
// ein Foto gesetzt ist, dreht ein Tipp die Karte wie bisher.
function isTapOnEmptyPhotoArea(e) {
  if (state.photo || state.side !== 'front') return false;
  const rect = canvasFront.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const { photo } = getFrontLayout(canvasFront.width, canvasFront.height);
  const x = (e.clientX - rect.left) * (canvasFront.width / rect.width);
  const y = (e.clientY - rect.top) * (canvasFront.height / rect.height);
  return x >= photo.x && x <= photo.x + photo.w && y >= photo.y && y <= photo.y + photo.h;
}

flipWrapper.addEventListener('click', e => {
  if (e.target.closest('#btn-flip')) return;
  if (isTapOnEmptyPhotoArea(e)) {
    photoInput.click();
    return;
  }
  toggleFlip();
});

// Teilen geht auch mit dem Standardbild; dann ein Hinweis, damit niemand
// versehentlich das Standardbild verschickt.
function updateShareAvailability() {
  btnShare.disabled = !state.photo && !defaultPhoto;
  if (!state.photo && defaultPhoto) {
    shareStatus.textContent = 'Du nutzt gerade das Standardbild. Tippe auf die Karte, um dein eigenes Foto zu wählen.';
  } else if (state.photo && /Standardbild/.test(shareStatus.textContent)) {
    shareStatus.textContent = '';
  }
}

// ---------------- Sticker ----------------
// Die Kacheln sind Schalter: Antippen waehlt ein Motiv (jedes hoechstens
// einmal), die Zahl auf der Kachel ist sein Platz auf der Rueckseite, nochmal
// Antippen entfernt es. Kacheln erscheinen, sobald ihr Bild geladen ist; bei
// vier gewaehlten Motiven sind die uebrigen gesperrt. Die Gruppe verschwindet,
// wenn kein Motiv geladen werden konnte.
function updateStickerOptions() {
  let verfuegbar = 0;
  const voll = state.stickers.length >= MAX_STICKERS;
  stickerChoices.forEach(btn => {
    const type = btn.dataset.sticker;
    const platz = state.stickers.indexOf(type) + 1;
    const geladen = Boolean(stickerImages[type]);
    btn.hidden = !geladen;
    btn.disabled = !platz && voll;
    btn.setAttribute('aria-pressed', String(platz > 0));
    if (platz) btn.dataset.number = String(platz);
    else delete btn.dataset.number;
    if (geladen) verfuegbar++;
  });
  stickerGroup.hidden = verfuegbar === 0;
  stickerCount.textContent = `${state.stickers.length} / ${MAX_STICKERS}`;
}

function toggleSticker(type) {
  const index = state.stickers.indexOf(type);
  if (index >= 0) {
    // Nachfolgende Sticker ruecken einen Platz nach vorn.
    state.stickers.splice(index, 1);
  } else {
    if (!stickerImages[type] || state.stickers.length >= MAX_STICKERS) return;
    state.stickers.push(type);
  }
  updateStickerOptions();
  renderBack();
  // Die Sticker liegen auf der Rueckseite — dorthin drehen, damit der Gast
  // sieht, was er gewaehlt hat.
  if (index < 0 && state.side === 'front') toggleFlip();
}

stickerChoices.forEach(btn => {
  btn.addEventListener('click', () => toggleSticker(btn.dataset.sticker));
});

// ---------------- Grossansicht fuer Briefmarken und Sticker ----------------
// Kleine Lupe in der Ecke jeder Kachel. Sie liegt als <span> IN der Kachel (ein
// Button im Button waere ungueltig) und faengt den Klick vor der Kachel ab,
// damit die Auswahl unveraendert per Tipp auf die Kachel funktioniert.
const previewDialog = document.getElementById('preview-dialog');
const previewImg = document.getElementById('preview-img');
const previewTitle = document.getElementById('preview-title');
const previewAction = document.getElementById('preview-action');
const previewClose = document.getElementById('preview-close');
let previewTarget = null;

const ZOOM_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/></svg>';

function updatePreviewAction() {
  if (!previewTarget) return;
  const { kind, id } = previewTarget;
  if (kind === 'stamp') {
    const aktiv = state.stamp === id;
    previewAction.textContent = aktiv ? 'Ausgewählt' : 'Auswählen';
    previewAction.disabled = aktiv;
    return;
  }
  const gewaehlt = state.stickers.includes(id);
  const voll = state.stickers.length >= MAX_STICKERS;
  previewAction.textContent = gewaehlt ? 'Entfernen' : voll ? `Alle ${MAX_STICKERS} Plätze belegt` : 'Auswählen';
  previewAction.disabled = !gewaehlt && voll;
}

function openPreview(kind, id) {
  const list = kind === 'stamp' ? STAMPS : STICKERS;
  const item = list.find(entry => entry.id === id);
  if (!item) return;
  previewTarget = { kind, id };
  previewImg.src = item.src;
  previewImg.alt = item.label;
  previewTitle.textContent = item.label;
  updatePreviewAction();
  previewDialog.showModal();
}

previewAction.addEventListener('click', () => {
  if (!previewTarget) return;
  const { kind, id } = previewTarget;
  if (kind === 'stamp') selectStamp(id);
  else toggleSticker(id);
  previewDialog.close();
});
previewClose.addEventListener('click', () => previewDialog.close());
// Klick auf den abgedunkelten Hintergrund schliesst ebenfalls.
previewDialog.addEventListener('click', e => {
  if (e.target === previewDialog) previewDialog.close();
});

[[stampChoices, 'stamp', 'stamp'], [stickerChoices, 'sticker', 'sticker']].forEach(([buttons, kind, key]) => {
  buttons.forEach(btn => {
    const hint = document.createElement('span');
    hint.className = 'zoom-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = ZOOM_ICON;
    hint.addEventListener('click', e => {
      e.stopPropagation();
      openPreview(kind, btn.dataset[key]);
    });
    btn.appendChild(hint);
  });
});

// ---------------- Zuschneide-Dialog ----------------
const MAX_ZOOM = 4;

// Ansichtszustand des Dialogs. Bewusst nicht das Rechteck direkt manipulieren,
// sondern Zoom + Mittelpunkt halten und das Rechteck daraus ableiten: dadurch
// sind die Klemmgrenzen nie invertiert. Ab zoom < 1 darf der Ausschnitt ueber
// das Bild hinausragen; clampCropCenter() zentriert das Bild dann.
const cropView = { img: null, base: null, zoom: 1, minZoom: 1, cx: 0, cy: 0, stageW: 0, stageH: 0 };

let cropSnapshot = null;
let cropRaf = 0;
const cropPointers = new Map();
let cropLastDist = 0;

function cropRect() {
  const sw = cropView.base.sw / cropView.zoom;
  const sh = cropView.base.sh / cropView.zoom;
  return { sx: cropView.cx - sw / 2, sy: cropView.cy - sh / 2, sw, sh };
}

// Ist der Ausschnitt breiter/hoeher als das Bild (Herauszoomen), bleibt das
// Bild auf dieser Achse mittig stehen.
function clampCropCenter() {
  const { sw, sh } = cropRect();
  const iw = cropView.img.naturalWidth;
  const ih = cropView.img.naturalHeight;
  cropView.cx = sw >= iw ? iw / 2 : clamp(cropView.cx, sw / 2, iw - sw / 2);
  cropView.cy = sh >= ih ? ih / 2 : clamp(cropView.cy, sh / 2, ih - sh / 2);
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
  drawPhotoRect(cropCtx, cropView.img, { sx, sy, sw, sh }, 0, 0, cropCanvas.width, cropCanvas.height);
}

function requestCropDraw() {
  if (!cropRaf) cropRaf = requestAnimationFrame(drawCrop);
}

// Zoom mit Ankerpunkt: der Bildpunkt unter Cursor bzw. Finger-Mittelpunkt
// bleibt stehen. Gemeinsamer Pfad für Mausrad, Pinch und Slider (der Slider
// ankert mittig).
function setCropZoom(nextZoom, anchorX, anchorY) {
  const z = clamp(nextZoom, cropView.minZoom, MAX_ZOOM);
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
  // Kleinster Zoom = ganzes Foto sichtbar (contain), plus etwas Luft (x 0,6),
  // damit sich auch ein passendes Foto noch verkleinern laesst; der Rest der
  // Flaeche wird dust-farben aufgefuellt (drawPhotoRect).
  const aspect = cropView.base.sw / cropView.base.sh;
  const containW = Math.max(state.photo.naturalWidth, state.photo.naturalHeight * aspect);
  cropView.minZoom = Math.min(1, cropView.base.sw / containW) * 0.6;
  cropZoomSlider.min = String(cropView.minZoom);
  const current = state.crop || cropView.base;
  cropView.zoom = clamp(cropView.base.sw / current.sw, cropView.minZoom, MAX_ZOOM);
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
// Story-Format 9:16 für Instagram Story / WhatsApp-Status. Eigene Funktion neben
// buildCombinedCanvas() ("Beide Seiten"): anderes Seitenverhältnis, Logo unten.
// Der Story-Export war lange der schlechteste Pfad: zwei Karten uebereinander
// in ein 9:16-Bild zwingt die Karte auf die Breite des Rahmens herunter. Bei
// 1350px Rahmenbreite landete die 2546px breite Karte bei 1148px — also 45%,
// die Beschriftung der Briefmarke war damit weg.
// Die gezeichnete Groesse der Marke haengt allein von STORY.width ab
// (0,26 Kartenanteil x 0,85 Rahmenanteil ≈ 22% der Story-Breite), nicht von
// der Kartenaufloesung. Deshalb hilft hier nur ein groesserer Rahmen.
// 2700 gewaehlt, weil die Karte damit auf 90% skaliert wird — praktisch
// verlustfrei — und das Bild mit 13,0 Megapixel unter der Canvas-Obergrenze
// von iOS Safari (16,7 MP) bleibt.
const STORY = { width: 2700, height: 4800 };

// Karte mit weichem Schatten und runden Ecken auf den Story-Hintergrund setzen.
// Die Canvases selbst haben harte Ecken (der Radius lebt sonst nur im CSS) —
// auf farbigem Grund fällt das sofort auf, deshalb hier explizit.
function drawCardOnStory(ctx, source, x, y, w, h) {
  const radius = w * CARD_RADIUS.card;

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

// Zeichnet eine Kartenseite in beliebiger Groesse auf ein Offscreen-Canvas.
// Moeglich, weil die gesamte Layout-Mathematik in Anteilen von
// canvas.width/height rechnet — dieselbe Eigenschaft, die schon die
// Aufloesungserhoehung der Karte kostenlos gemacht hat.
function renderCardAt(renderFn, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderFn(canvas, canvas.getContext('2d'));
  return canvas;
}

function buildStoryCanvas() {
  const story = document.createElement('canvas');
  story.width = STORY.width;
  story.height = STORY.height;
  const ctx = story.getContext('2d');
  setHighQuality(ctx);

  // Markenverlauf wie auf der Seite (postkarte.css, body).
  const bg = ctx.createLinearGradient(0, 0, 0, STORY.height);
  bg.addColorStop(0, COLORS.wald);
  bg.addColorStop(0.45, COLORS.wald2);
  bg.addColorStop(1, COLORS.wald3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, STORY.width, STORY.height);

  // Vorder- und Rückseite direkt auf den Verlauf stapeln, damit zwischen den
  // Karten der Hintergrund durchscheint (wie auch bei "Beide Seiten").
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
  const dw = Math.round(cardW * scale);
  const dh = Math.round(cardH * scale);
  const dx = (STORY.width - dw) / 2;
  const dy = boxTop + (boxH - stackH * scale) / 2;

  // Die Karten werden hier in Zielgroesse NEU GEZEICHNET statt die fertigen
  // Vorschau-Canvases zu verkleinern. Beim Verkleinern wuerde jedes Element
  // zweimal resampled (Foto → Karte → Story, Marke 1400 → 749 → 597); so
  // entsteht nur ein einziger Resampling-Schritt, und Text wird direkt in
  // Zielaufloesung gerastert statt weichgerechnet. Kostet zwei kurzlebige
  // Offscreen-Canvases, aber kein zusaetzliches Detail.
  // Eine 1:1-Platzierung ist nicht moeglich: dafuer muesste die Story rund
  // 3400px breit sein und laege bei ueber 20 Megapixel — weit ueber der
  // Canvas-Obergrenze von iOS Safari.
  const frontStory = renderCardAt(renderFrontTo, dw, dh);
  const backStory = renderCardAt(renderBackTo, dw, dh);

  drawCardOnStory(ctx, frontStory, dx, dy, dw, dh);
  drawCardOnStory(ctx, backStory, dx, dy + (cardH + gapSource) * scale, dw, dh);

  // Dust-Logovariante — laut Brand Guideline nur auf dunklem Grund, was hier
  // gegeben ist. Fehlt die Datei, bleibt die Story einfach ohne Logo.
  if (logos.fullDust) {
    const logoH = STORY.height * 0.032;
    const logoY = STORY.height - boxBottom + (boxBottom - logoH) / 2;
    drawLogo(ctx, logos.fullDust, LOGO_FULL_RATIO, STORY.width / 2, logoY, logoH, 'center');
  }

  return story;
}


function fillBrandGradient(ctx, w, h) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, COLORS.wald);
  bg.addColorStop(0.45, COLORS.wald2);
  bg.addColorStop(1, COLORS.wald3);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
}

// "Beide Seiten": Vorder- und Rueckseite untereinander. Fruehere Fassung hat die
// beiden fertigen Canvases mit harten Ecken auf eine dunkle Flaeche gelegt — das
// wirkte abgeschnitten, die runden Kartenecken fehlten. Jetzt sitzen beide
// Karten wie in der Story mit runden Ecken und Schatten auf dem Markenverlauf.
// Die Karten werden in Zielgroesse neu gezeichnet (90 % der Kartenbreite, der
// Rest ist Rand), die Rueckseite ohne die Sticker-Platzhalter der Vorschau.
// Breite bleibt 2880 px; Hoehe ~4060 px = 11,7 MP, unter der iOS-Canvas-Grenze.
function buildCombinedCanvas() {
  const W = canvasFront.width;
  const cardW = Math.round(W * 0.9);
  const cardH = Math.round(canvasFront.height * 0.9);
  const pad = Math.round(W * 0.05);
  const gap = Math.round(pad * 0.75);
  const H = pad * 2 + cardH * 2 + gap;

  const combined = document.createElement('canvas');
  combined.width = W;
  combined.height = H;
  const ctx = combined.getContext('2d');
  setHighQuality(ctx);
  fillBrandGradient(ctx, W, H);

  drawCardOnStory(ctx, renderCardAt(renderFrontTo, cardW, cardH), pad, pad, cardW, cardH);
  drawCardOnStory(ctx, renderCardAt(renderBackTo, cardW, cardH), pad, pad + cardH + gap, cardW, cardH);
  return combined;
}

// 'both' = Vorder- und Rückseite gestapelt (bisheriges Verhalten),
// 'story' = 9:16 für Instagram Story und WhatsApp-Status,
// 'gif' / 'video' = animiert, die Karte dreht sich von vorn nach hinten und
// zurück (Endlosschleife).
let shareFormat = 'both';

function setShareFormat(key) {
  shareFormat = key;
  invalidatePendingShare();
  [[fmtBoth, 'both'], [fmtStory, 'story'], [fmtGif, 'gif'], [fmtVideo, 'video']].forEach(([btn, id]) => {
    btn.classList.toggle('is-active', key === id);
    btn.setAttribute('aria-pressed', String(key === id));
  });
  shareStatus.textContent = '';
  updateShareAvailability();
}

function shareText() {
  return state.senderName
    ? `Eine Urlaubspostkarte von ${state.senderName} aus dem Schwarzwald.`
    : 'Schau dir meine Postkarte aus dem Schwarzwald an!';
}

// Alle Exporte zeichnen die Karten selbst in Zielgroesse aus dem State neu und
// fassen die Vorschau-Canvases nicht an — die Vorschau (mit den nummerierten
// Sticker-Platzhaltern) bleibt dadurch unberuehrt, und nichts davon landet im
// geteilten Bild.
function currentExport() {
  const exports = {
    both: () => ({
      canvas: buildCombinedCanvas(),
      filename: 'ab-ins-gruene-postkarte.png',
      saved: 'Postkarte wurde gespeichert!'
    }),
    story: () => ({
      canvas: buildStoryCanvas(),
      filename: 'ab-ins-gruene-postkarte-story.png',
      saved: 'Story-Bild wurde gespeichert!'
    })
  };
  return exports[shareFormat]();
}

// ---------------- Animiertes GIF / Video (Karte dreht sich) ----------------
// Beide Formate zeigen dieselbe Szene: Vorderseite halten -> Drehung nach hinten
// -> Rueckseite halten -> Drehung zurueck. Weil am Ende wieder die Vorderseite
// steht, laeuft die Endlosschleife nahtlos. Die Drehung ist gezeichnet: die
// Karte wird horizontal zu- und als andere Seite wieder aufgeschoben, in der
// Mitte leicht groesser, damit es nach Perspektive aussieht.
const FLIP_CARD_W = 800;
const FLIP_HOLD_FRONT_MS = 1800;
const FLIP_HOLD_BACK_MS = 3000;
const FLIP_MS = 700;
const GIF_FLIP_FRAMES = 10;

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Bereitet die Szene einmal vor; draw(angle) zeichnet ihn ins Canvas
// (0 = Vorderseite, PI = Rueckseite). Breite/Hoehe sind gerade, das verlangt
// H.264 (MP4).
function createFlipScene() {
  const cardW = FLIP_CARD_W;
  const cardH = Math.round(cardW * canvasFront.height / canvasFront.width);
  const padX = Math.round(cardW * 0.06);
  const padY = Math.round(cardH * 0.12);
  const W = Math.round((cardW + padX * 2) / 2) * 2;
  const H = Math.round((cardH + padY * 2) / 2) * 2;

  const front = renderCardAt(renderFrontTo, cardW, cardH);
  const back = renderCardAt(renderBackTo, cardW, cardH);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  setHighQuality(ctx);

  function draw(angle) {
    fillBrandGradient(ctx, W, H);
    const w = Math.max(cardW * Math.abs(Math.cos(angle)), 2);
    const h = cardH * (1 + 0.07 * Math.sin(angle));
    drawCardOnStory(ctx, angle < Math.PI / 2 ? front : back,
      (W - w) / 2, (H - h) / 2, w, h);
  }
  return { canvas, ctx, W, H, draw };
}

const nextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// ---- GIF ----
// gifenc (MIT, assets/gifenc.esm.js) wird erst beim ersten GIF-Export geladen.
// Jedes Bild bekommt eine eigene 256-Farben-Palette; das haelt Foto und Text
// brauchbar. Die Rueckdrehung schreibt die bereits kodierten Drehbilder
// rueckwaerts erneut, das spart Rechenzeit (nicht Dateigroesse).
let gifencPromise = null;
function loadGifenc() {
  if (!gifencPromise) {
    gifencPromise = import('./assets/gifenc.esm.js').catch(err => {
      gifencPromise = null;
      throw err;
    });
  }
  return gifencPromise;
}

async function buildFlipGif(onProgress) {
  const { GIFEncoder, quantize, applyPalette } = await loadGifenc();
  const scene = createFlipScene();
  const gif = GIFEncoder();
  const frameMs = Math.round(FLIP_MS / GIF_FLIP_FRAMES);
  const total = GIF_FLIP_FRAMES + 2;

  async function encode(angle, delay, index) {
    scene.draw(angle);
    const { data } = scene.ctx.getImageData(0, 0, scene.W, scene.H);
    const palette = quantize(data, 256);
    const frame = { pixels: applyPalette(data, palette), palette, delay };
    onProgress((index + 1) / total);
    await nextTick();
    return frame;
  }
  const write = f => gif.writeFrame(f.pixels, scene.W, scene.H, { palette: f.palette, delay: f.delay });

  write(await encode(0, FLIP_HOLD_FRONT_MS, 0));
  const flips = [];
  for (let i = 1; i <= GIF_FLIP_FRAMES; i++) {
    const angle = Math.PI * easeInOut(i / (GIF_FLIP_FRAMES + 1));
    const f = await encode(angle, frameMs, i);
    flips.push(f);
    write(f);
  }
  write(await encode(Math.PI, FLIP_HOLD_BACK_MS, total - 1));
  for (let i = flips.length - 1; i >= 0; i--) write(flips[i]);

  gif.finish();
  return new Blob([gif.bytes()], { type: 'image/gif' });
}

// ---- Video ----
// Nimmt das Canvas in Echtzeit per MediaRecorder auf. Format je nach Browser:
// iOS Safari und aktuelles Chrome liefern MP4, aeltere Chromium/Firefox WebM.
function pickVideoType() {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
  const candidates = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) || null;
}

function buildFlipVideo(mimeType, onProgress) {
  return new Promise((resolve, reject) => {
    const scene = createFlipScene();
    const total = FLIP_HOLD_FRONT_MS + FLIP_MS + FLIP_HOLD_BACK_MS + FLIP_MS;
    const stream = scene.canvas.captureStream(30);
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6000000 });
    } catch (err) {
      reject(err);
      return;
    }
    const chunks = [];
    recorder.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    recorder.onerror = e => reject(e.error || new Error('recorder'));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));

    function angleAt(t) {
      if (t < FLIP_HOLD_FRONT_MS) return 0;
      t -= FLIP_HOLD_FRONT_MS;
      if (t < FLIP_MS) return Math.PI * easeInOut(t / FLIP_MS);
      t -= FLIP_MS;
      if (t < FLIP_HOLD_BACK_MS) return Math.PI;
      t -= FLIP_HOLD_BACK_MS;
      return Math.PI * (1 - easeInOut(Math.min(t / FLIP_MS, 1)));
    }

    scene.draw(0);
    recorder.start();
    const start = performance.now();
    function tick(now) {
      const t = now - start;
      scene.draw(angleAt(t));
      onProgress(Math.min(t / total, 1));
      if (t < total) {
        requestAnimationFrame(tick);
      } else {
        // Letztes Bild noch kurz stehen lassen, damit es sicher im Video landet.
        setTimeout(() => recorder.stop(), 120);
      }
    }
    requestAnimationFrame(tick);
  });
}

// Teilen-Dialog nur direkt aus einem Tipp heraus: navigator.share() verlangt
// eine frische Nutzer-Geste, und die ist nach Sekunden (Video-Aufnahme, GIF-
// Berechnung) abgelaufen. Deshalb entsteht die Datei in einem ersten Tipp, und
// der Button wird zu "Jetzt teilen"; erst der zweite Tipp ruft share() auf.
// Ändert sich die Karte danach, verfällt die fertige Datei (invalidate...).
let pendingShare = null;

function invalidatePendingShare() {
  if (!pendingShare) return;
  pendingShare = null;
  shareLabel.textContent = 'Teilen';
}

async function deliverPending() {
  const { blob, filename, savedText } = pendingShare;
  const file = new File([blob], filename, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Meine Ab ins Grüne Postkarte', text: shareText() });
      shareStatus.textContent = '';
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Datei bleibt erhalten: zweite Chance ist das Speichern.
      saveBlob(blob, filename);
      shareStatus.textContent = 'Teilen ging nicht, die Datei wurde stattdessen gespeichert.';
    }
    return;
  }
  saveBlob(blob, filename);
  shareStatus.textContent = savedText;
}

async function shareAnimated(kind) {
  if (pendingShare && pendingShare.kind === kind) return deliverPending();

  btnShare.disabled = true;
  const label = kind === 'gif' ? 'GIF' : 'Video';
  const report = p => {
    shareStatus.textContent = kind === 'gif'
      ? `GIF wird erstellt … ${Math.round(p * 100)} %`
      : `Video wird aufgenommen … ${Math.round(p * 100)} % (Seite bitte offen lassen)`;
  };
  report(0);

  let blob;
  let filename = 'ab-ins-gruene-postkarte.gif';
  try {
    if (kind === 'gif') {
      blob = await buildFlipGif(report);
    } else {
      const type = pickVideoType();
      if (!type) {
        shareStatus.textContent = 'Video wird von diesem Browser leider nicht unterstützt. Probier das GIF.';
        updateShareAvailability();
        return;
      }
      blob = await buildFlipVideo(type, report);
      filename = 'ab-ins-gruene-postkarte.' + (type.startsWith('video/mp4') ? 'mp4' : 'webm');
    }
  } catch (err) {
    shareStatus.textContent = `Das ${label} konnte leider nicht erstellt werden.`;
    updateShareAvailability();
    return;
  }
  updateShareAvailability();
  pendingShare = { kind, blob, filename, savedText: `${label} wurde gespeichert!` };
  shareLabel.textContent = `${label} jetzt teilen`;
  shareStatus.textContent = `${label} ist fertig. Tippe auf „${label} jetzt teilen“.`;
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
  if (shareFormat === 'gif' || shareFormat === 'video') return shareAnimated(shareFormat);
  const { canvas: source, filename, saved } = currentExport();
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
    shareStatus.textContent = saved;
  }, 'image/png');
}

btnShare.addEventListener('click', sharePostcard);
fmtBoth.addEventListener('click', () => setShareFormat('both'));
fmtStory.addEventListener('click', () => setShareFormat('story'));
fmtGif.addEventListener('click', () => setShareFormat('gif'));
fmtVideo.addEventListener('click', () => setShareFormat('video'));

// ---------------- Init ----------------
applyFormat('landscape');
updateRecropAvailability();

Promise.all([
  loadImage(LOGO_FULL_SRC),
  loadImage(LOGO_SIGNET_SRC),
  loadImage(LOGO_FULL_DUST_SRC),
  loadImage(LOGO_STACKED_SRC)
])
  .then(([full, signet, fullDust, stacked]) => {
    logos.full = full;
    logos.signet = signet;
    logos.fullDust = fullDust;
    logos.stacked = stacked;
    renderAll();
  })
  .catch(() => {
    renderAll();
  });

stampChoices.forEach(btn => {
  btn.addEventListener('click', () => selectStamp(btn.dataset.stamp));
});

// Standardbild laden; fehlt die Datei, bleibt der leere Platzhalter.
loadImage(DEFAULT_PHOTO_SRC)
  .then(img => {
    defaultPhoto = img;
    renderFront();
    updateShareAvailability();
  })
  .catch(() => {});

// Briefmarken-Motive einzeln laden: fehlt eine Datei, sollen die uebrigen
// trotzdem waehlbar bleiben — deshalb bewusst kein Promise.all, das beim
// ersten Fehler alles verwerfen wuerde.
STAMPS.forEach(stamp => {
  loadImage(stamp.src)
    .then(img => {
      stampImages[stamp.id] = img;
      updateStampOptions();
      if (state.stamp === stamp.id) renderBack();
    })
    .catch(() => {
      stampImages[stamp.id] = null;
      updateStampOptions();
    });
});

// Sticker ebenfalls einzeln laden, aus demselben Grund wie die Briefmarken.
STICKERS.forEach(sticker => {
  loadImage(sticker.src)
    .then(img => {
      stickerImages[sticker.id] = img;
      updateStickerOptions();
    })
    .catch(() => {
      stickerImages[sticker.id] = null;
      updateStickerOptions();
    });
});

// Web-Fonts (Zilla Slab / Asap Condensed) laden asynchron; Canvas-Text, das
// vor Ladeende gezeichnet wurde, nutzt Fallback-Metriken. Einmaliger
// Re-Render nach Ladeende korrigiert Zeilenumbruch/Positionierung verlässlich.
if (document.fonts && document.fonts.ready) {
  // Canvas-Text loest kein Laden von Web-Fonts aus. Deshalb jeden im Canvas
  // benutzten Schnitt der beiden Guideline-Schriften (Asap Condensed, Zilla Slab)
  // explizit anfordern und erst danach zeichnen — sonst erscheint kurz (oder bei
  // einem Ladefehler dauerhaft) eine Ersatzschrift.
  Promise.all([
    document.fonts.load("500 40px 'Asap Condensed'"),
    document.fonts.load("600 40px 'Asap Condensed'"),
    document.fonts.load("italic 500 40px 'Asap Condensed'"),
    document.fonts.load("600 40px 'Zilla Slab'"),
    document.fonts.ready
  ]).then(() => renderAll());
}
