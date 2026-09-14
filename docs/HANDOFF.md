# Handoff: „Ab ins Grüne" – Postkarten-Generator

Stand: 2026-09-14. Dieses Dokument reicht aus, um ohne den bisherigen Chatverlauf weiterzuarbeiten.

## 1. Projektstand

Funktionsfähiger Frontend-Prototyp: **vanilla HTML/CSS/JS, kein Build-Tool, keine npm-Dependencies, kein Backend.** `postkarte.html` lässt sich direkt im Browser öffnen.

Gast lädt ein Foto hoch → wählt den Bildausschnitt → tippt Empfänger, Absender und Nachricht → dreht die Karte → teilt sie als Bild.

Fertig und im Browser gegengeprüft:

- **Foto-Upload mit Zuschneide-Dialog** (Ziehen, Zoom per Mausrad/Pinch/Slider, Abbrechen stellt den Zustand davor vollständig wieder her, nachträglich änderbar über „Ausschnitt anpassen")
- **Adaptives Kartenformat**, quer oder hoch, anhand des Fotoverhältnisses
- **Empfänger** und **Absender** (je `maxlength="40"`), **Nachricht** (200 Zeichen mit Zähler) — alle mit Überlaufsicherung, Text kann nie über den Kartenrand laufen
- **Vorder-/Rückseite** mit CSS-3D-Flip
- **Teilen** über genau einen Button: `navigator.share` mit Datei, sonst Download. Zwei Formate wählbar: „Beide Seiten" (1697×2440) oder **„Story 9:16"** (1080×1920, für Instagram Story und WhatsApp-Status)
- **Klebende Kartenvorschau** auf dem Smartphone, damit die Karte beim Tippen sichtbar bleibt

**Git:** Branch `postkarten-generator`, Commit `16321ad`. **Nichts gepusht.** Der Remote `github.com/LFranne/game` ist **öffentlich** — vor einem Push Sichtbarkeit klären. Die frühere, deutlich längere Fassung dieses Dokuments steckt in genau diesem Commit, falls Details zur Historie gebraucht werden.

## 2. Getroffene Entscheidungen

**Produkt**

- Kein Login, keine Datenbank, kein Backend, keine Speicherung vergangener Karten (so im PRD festgelegt).
- **Absender-Feld** erweitert den PRD-Scope bewusst und ist entschieden — nicht erneut hinterfragen.
- **Teilen per Link** (Empfänger öffnet eine Seite und dreht die Karte selbst) ist besprochen und **auf Phase 2 vertagt**, siehe Abschnitt 5.
- Gebaut und **auf Nutzerwunsch wieder entfernt**: Sticker, drei Briefmarken-Varianten, WhatsApp-/E-Mail-Buttons, ein separater „Bild speichern"-Button. Nicht ungefragt neu bauen.

**Marke** (verbindlich, Quelle: `Ab_ins_Gruene_Brand_Guideline.pdf`, liegt lokal in `docs/`, ist bewusst gitignored)

- Farben als CSS-Custom-Properties in `postkarte.css` (`:root`): `--c-wald #253C28`, `--c-wald2 #4A613C`, `--c-wald3 #7C8E51`, `--c-fichte #BBD034`, `--c-graphite #202829`, `--c-dust #F2EFED`, Gold-Töne `#A17621 / #D4A12C / #FFD962`. Dieselben Werte gespiegelt in `COLORS` in `postkarte.js` für Canvas.
- Schriften: **Zilla Slab** (Überschriften), **Asap Condensed** (Fließtext/UI), per Google Fonts geladen.
- Logos nur als Original-SVG aus `assets/`, nicht verzerren oder einfärben. Die **helle Dust-Variante nur auf dunklem Grund**.
- Bildsprache „hochwertig, nie steril": keine Comic-/Cartoon-Optik, keine Retro-/Sepia-Filter.

**Technik**

- Der Flip wird **nicht** umgebaut. Er funktioniert und ist verifiziert (Details in Abschnitt 3).
- Die Texteingabe wird **nicht** an der Referenz `wishpost.one` ausgerichtet: die hat kein einziges `maxlength`, schneidet Namen mitten im Buchstaben ab und verliert lange Nachrichten stillschweigend. Unser Stand ist dort besser.

## 3. Technische Erkenntnisse

Das hier sind die nicht offensichtlichen Stellen. Wer sie übersieht, baut funktionierende Dinge kaputt.

**Flip**

- `.postcard-face` (Rotation + `backface-visibility`) und `.postcard-face-clip` (`overflow`/`border-radius`) sind bewusst **zwei verschachtelte Elemente**. Zusammengelegt greift ein WebKit-Bug und die Rückseite erscheint spiegelverkehrt. **Nicht zusammenführen.**
- Auf `.postcard-flip-inner` darf **kein `filter`, `opacity` oder `mask`** liegen. Diese Grouping-Properties flachen den `preserve-3d`-Kontext ab — ein `filter: drop-shadow()` dort hat genau den Spiegel-Bug erzeugt. Der Kartenschatten liegt deshalb als `box-shadow` auf `.postcard-face-clip`.

**Zuschnitt**

- `state.crop` ist ein Rechteck `{sx, sy, sw, sh}` in **Naturpixeln des Originalfotos** und gehört immer zum aktuellen `state.photo`. Erzwungen durch die einzige Schreibstelle **`setPhoto(img, crop)`** — beide nie einzeln setzen.
- Rechteck statt fertig zugeschnittenem Bild, weil: nur ein Resampling, kein zweites Vollbild-Canvas im Speicher, nachträglich änderbar, und der **Export braucht null Sonderbehandlung** (das Vorschau-Canvas ist die Exportquelle).
- **Reihenfolge im Upload-Handler ist zwingend:** Snapshot sichern → `applyFormat(pickFormat(...))` → `getCropAspect()` → `coverFit()` → `setPhoto()` → `openCropDialog(snapshot)`. Der Snapshot muss **vor** jeder Änderung entstehen, sonst sichert Abbrechen den bereits neuen Zustand. `pickFormat()` bewertet weiterhin das **Original**-Verhältnis — sonst Zirkelabhängigkeit.
- **Das Foto-Seitenverhältnis ist nicht das Kartenverhältnis:** quer ≈ 1,800 und hoch ≈ 0,828 (Karte: 1,414 / 0,707), weil Rand und Markenband Höhe wegnehmen. Dafür gibt es `getFrontLayout()` und `getCropAspect()`.
- Im Dialog wird nicht das Rechteck manipuliert, sondern `{zoom, cx, cy}`. Dadurch ist „Bild füllt den Ausschnitt immer vollständig" eine Konstruktionseigenschaft statt einer Prüfung.

**Dialog und Pointer**

- Dialog-Markup steht am Ende von `<body>` **außerhalb von `.layout`**: `.postcard-flip` setzt `perspective`, `.postcard-flip-inner` ein `transform` — beides erzeugt einen Containing Block, in dem ein Overlay falsch säße. Natives `<dialog>` + `showModal()`.
- `touch-action: none` auf `#crop-canvas`, sonst scrollt/zoomt auf dem Smartphone die Seite statt des Ausschnitts.
- `wheel`-Listener mit `{ passive: false }`, sonst wird `preventDefault()` ignoriert.
- Pointer über `getBoundingClientRect()` umrechnen, **nicht** über `canvas.width` — sonst Fehler um den `devicePixelRatio`-Faktor.
- `photoInput.value = ''` beim Schließen, sonst lässt sich dieselbe Datei nicht erneut wählen.

**Layout**

- **Media Queries erhöhen die Spezifität nicht.** Der Sticky-Block muss in `postkarte.css` **nach** `.postcard-flip { width: 100% }` stehen, sonst ist die Höhenbegrenzung wirkungslos.
- `position: sticky` kann nur innerhalb der **eigenen Elternbox** wandern. Alles, was nicht mitkleben soll, muss die Vorschauspalte wirklich verlassen — deshalb sitzt die Teilen-Bedienung in der Formularspalte. Aktuell belegt die klebende Spalte 41 % (quer) bzw. 61 % (hoch) der Viewporthöhe bei 375×812; darüber wird es eng.
- `[hidden] { display: none !important; }` ist nötig, weil `.btn { display: inline-flex }` das Attribut sonst überschreibt.
- **Das untere Marken-Band ist unsichtbar:** es wird mit `COLORS.dust` gefüllt, derselben Farbe wie der Kartenhintergrund. Optisch sichtbar ist die Fläche vom Fotorahmen bis zur Kartenunterkante. Logo und Grußtext werden deshalb in `h - bandY` zentriert, **nicht** in `bandHeight`. Dieselbe Falle: eine helle Briefmarke bräuchte zwingend eine Kontur, sonst verschwindet die Perforation.

**Canvas und Export**

- Die Logo-SVGs haben **kein** `width`/`height`, nur ein `viewBox`. `naturalWidth` ist damit browserabhängig unzuverlässig — die Seitenverhältnisse sind als `LOGO_FULL_RATIO = 559/103` und `LOGO_SIGNET_RATIO = 122.46/103` fest codiert. Bei Logo-Austausch mit anpassen.
- `document.fonts.ready.then(() => renderAll())` am Dateiende ist nötig: Canvas-Text wartet nicht auf Web-Fonts und würde sonst mit Fallback-Metriken umbrechen.
- `buildStoryCanvas()` nutzt **nicht** `buildCombinedCanvas()` — dessen wald-farbene Fläche läge als dunkler Kasten auf dem Verlauf. Es zeichnet Vorder- und Rückseite direkt auf den Verlauf.

**Testen**

- Statischer Server mit `Cache-Control: no-store` verwenden, sonst liefert der Browser altes CSS/JS und man diagnostiziert am falschen Stand.
- **Canvas-`toDataURL()`-Hashes sind nicht deterministisch** (GPU-Resampling), auch bei unverändertem Code. Für Pixelgleichheit nicht hashen, sondern Geometriewerte oder `getImageData` vergleichen.
- **Escape im `<dialog>` lässt sich per Automatisierung nicht prüfen:** synthetische Tastendrücke lösen Chromes Close-Watcher nicht aus (gegengeprüft mit einem leeren `<dialog>` ohne Listener — Werkzeuggrenze, kein Code-Fehler). Am echten Gerät testen.

## 4. Offene Aufgaben

1. **Gerätetest** auf echtem iOS Safari und Android Chrome: Pinch und Ziehen im Zuschneide-Dialog, Escape, Web Share.
2. **EXIF-Orientierung** von iPhone-Fotos wird nicht ausgewertet. Betrifft schon den heutigen Code, wird durch den Zuschnitt aber erstmals sichtbar.
3. **Kontrast prüfen:** Logo und Grußtext auf sehr hellen und sehr dunklen Fotos — nie verifiziert.
4. **Story im Hochformat:** die zwei gestapelten Karten belegen nur ~50 % der Story-Breite, der Nachrichtentext wird auf dem Handy klein. Zwei Hochkant-Karten übereinander sind in 9:16 zwangsläufig sehr hoch — bräuchte ein eigenes Story-Layout, nicht nur einen anderen Skalierungsfaktor.
5. **Push-Entscheidung:** Repo ist öffentlich, Commit liegt nur lokal.

## 5. Phase 2: Teilen per Link

Zurückgestellt, Erkenntnisse festgehalten damit sie nicht verloren gehen:

- **Instagram und TikTok nehmen von einer Website aus keine Links entgegen**, weder Feed noch Story. Dafür bleibt der Bild-/Story-Export der einzige Weg. Links lohnen für WhatsApp, Telegram, Signal, E-Mail, SMS, Facebook.
- Ein Link braucht zwingend **Speicherung der Karte** (die URL kann das Foto nicht tragen) **und eine serverseitig ausgelieferte Vorschau**: WhatsApps Crawler führt kein JavaScript aus, ohne `og:image` erscheint nur ein nackter Link — und genau dieses Vorschaubild ist der Werbeeffekt, um den es dem PRD geht.
- Minimale Bauform: Objektspeicher + kleine serverlose Funktion. Die Freigabeseite könnte das vorhandene `.postcard-flip`-Markup unverändert wiederverwenden, wenn Vorder- und Rückseite als Bilder abgelegt werden.
- **Bricht bewusst den PRD-Scope** und bringt DSGVO-Pflichten: Gästefotos sind personenbezogene Daten — EU-Hosting, Löschfrist, Löschmöglichkeit, Hinweis im Flow. Ohne Konten gilt: wer den Link hat, sieht die Karte.
- `wa.me` und `mailto:` können **technisch kein Bild anhängen**, nur Text. Das ist keine Einstellungssache und war der Grund, die Messenger-Buttons wieder zu entfernen.

## 6. Relevante Dateien

```
postkarte.html        Struktur: Vorschauspalte, Formularspalte, Zuschneide-Dialog am Body-Ende
postkarte.css         Marken-Tokens in :root, Flip, Dialog, Sticky-Vorschau, Teilen-Bedienung
postkarte.js          Gesamte Logik (~990 Zeilen), Abschnitte per Kommentar getrennt
assets/               4 Original-Logo-SVGs (wald + dust, jeweils Schriftzug und Signet)
docs/PRD.md           Vollständige Produktanforderungen
docs/HANDOFF.md       Dieses Dokument
docs/Ab_ins_Gruene_Brand_Guideline.pdf   Brand Book, lokal, bewusst gitignored (Repo ist öffentlich)

index.html / style.css / game.js   Separates Pac-Man-Mini-Projekt. NICHT anfassen.
```

Orientierung in `postkarte.js`: `state` und `setPhoto()` ganz oben, dann Helfer (`coverFit`, `fitLines`, `getFrontLayout`, `getCropAspect`), dann `renderFront()`/`renderBack()`/`applyFormat()`, dann der Zuschneide-Dialog, dann Story-Format und Teilen, zuletzt Init.

## 7. Arbeitsweise des Nutzers

- **Keine Features ungefragt hinzufügen.** Mehrfach betont. Was entfernt wurde, bleibt entfernt.
- Referenzen dienen als **Inspiration**, nicht als Vorlage. Brand Book hat immer Vorrang.
- Bei größeren Änderungen **erst analysieren und planen, dann umsetzen**.
- Änderungen im Browser gegenprüfen, Desktop **und** ~375 px.
