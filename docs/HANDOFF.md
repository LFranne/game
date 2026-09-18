# Handoff: „Ab ins Grüne" – Postkarten-Generator

Stand: 2026-09-18. Dieses Dokument reicht aus, um ohne den bisherigen Chatverlauf weiterzuarbeiten.

**Live unter https://lfranne.github.io/game/** (GitHub Pages aus `master`).

## 1. Projektstand

Funktionsfähiger Frontend-Prototyp: **vanilla HTML/CSS/JS, kein Build-Tool, keine npm-Dependencies, kein Backend.** `index.html` lässt sich direkt im Browser öffnen.

Gast lädt ein Foto hoch → wählt den Bildausschnitt → tippt Empfänger, Absender und Nachricht → dreht die Karte → teilt sie als Bild.

Fertig und im Browser gegengeprüft:

- **Foto-Upload mit Zuschneide-Dialog** (Ziehen, Zoom per Mausrad/Pinch/Slider, Abbrechen stellt den Zustand davor vollständig wieder her, nachträglich änderbar über „Ausschnitt anpassen")
- **Adaptives Kartenformat**, quer oder hoch, anhand des Fotoverhältnisses
- **Empfänger** und **Absender** (je `maxlength="40"`), **Nachricht** (200 Zeichen mit Zähler) — alle mit Überlaufsicherung, Text kann nie über den Kartenrand laufen
- **Briefmarken-Auswahl**: vier gestaltete Motive, Auswahl über Bildkacheln in der Formularspalte
- **Vorder-/Rückseite** mit CSS-3D-Flip
- **Teilen** über genau einen Button: `navigator.share` mit Datei, sonst Download. Zwei Formate wählbar: „Beide Seiten" (2880×4112) oder **„Story 9:16"** (2700×4800, für Instagram Story und WhatsApp-Status)
- **Klebende Kartenvorschau** auf dem Smartphone, damit die Karte beim Tippen sichtbar bleibt

**Git:** Branch `master`, Commit `cfb6300`, **gepusht und live**. Der Remote `github.com/LFranne/game` ist **öffentlich**; die Veröffentlichung ist bewusst erfolgt. Frühere Fassungen dieses Dokuments stecken in `16321ad` und `efbfdf6`, falls Details zur Historie gebraucht werden.

**Vorsicht beim Nachprüfen:** GitHub Pages liefert mit `Cache-Control: max-age=600`. Nach einem Push zeigt der Browser bis zu zehn Minuten die alte Fassung — mit Strg+F5 neu laden, sonst diagnostiziert man am falschen Stand. Eine Query an die HTML-Adresse hängen hilft **nicht**, weil `postkarte.js` ohne Query eingebunden ist und aus seinem eigenen Cache-Eintrag kommt.

## 2. Getroffene Entscheidungen

**Produkt**

- Kein Login, keine Datenbank, kein Backend, keine Speicherung vergangener Karten (so im PRD festgelegt).
- **Absender-Feld** erweitert den PRD-Scope bewusst und ist entschieden — nicht erneut hinterfragen.
- **Teilen per Link** (Empfänger öffnet eine Seite und dreht die Karte selbst) ist besprochen und **auf Phase 2 vertagt**, siehe Abschnitt 5.
- Gebaut und **auf Nutzerwunsch wieder entfernt**: Sticker, WhatsApp-/E-Mail-Buttons, ein separater „Bild speichern"-Button. Nicht ungefragt neu bauen.
- **Briefmarken-Auswahl ist ausdrücklich gewünscht und bleibt.** Achtung, Stolperfalle in der Historie: In einer früheren Iteration wurden drei Briefmarken-Varianten gebaut und auf Wunsch wieder entfernt. Die heutigen vier sind etwas anderes — **von Franziska selbst gestaltete Bilddateien**, am 2026-09-18 auf ausdrücklichen Wunsch eingebaut. Nicht mit der alten Entfernung verwechseln.
- Die vier Motive **liegen im Repository** (`assets/AIG_marke_*.webp`). Die Rechtefrage ist geklärt: Franziska hat sie selbst erstellt. Eine frühere `.gitignore`-Ausnahme dafür ist wieder entfernt.

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
- **Das untere Marken-Band ist unsichtbar:** es wird mit `COLORS.dust` gefüllt, derselben Farbe wie der Kartenhintergrund. Optisch sichtbar ist die Fläche vom Fotorahmen bis zur Kartenunterkante. Logo und Grußtext werden deshalb in `h - bandY` zentriert, **nicht** in `bandHeight`. Dieselbe Falle ist bei den Briefmarken eingetreten: Die Motive „Hasen" und „Wasserrad" hatten weiße bzw. cremefarbene Flächen ohne Alphakanal und mussten freigestellt werden. Das Motiv „Wasserrad" bleibt auch freigestellt das schwächste der vier — seine Grundfläche ist so hell, dass es sich auf dem Dust-Grund kaum als eigenes Objekt absetzt.

**Briefmarken**

- Die vier Motive **bringen ihren Zackenrand selbst mit** und sind freigestellt. `drawStamp()` (goldenes Rechteck + Signet) läuft deshalb nur noch als **Rückfall**, wenn eine Datei nicht lädt — dann verschwindet auch die Auswahlgruppe. Der Generator funktioniert ohne die Dateien.
- Zwei Motive sind hoch-, zwei querformatig. `drawStampArt()` passt jedes per **„contain"** in den Markenplatz ein und **gibt die belegte Höhe zurück**; der Adressblock richtet sich daran aus. Bei fester Höhe wäre die Sommerbergbahn-Marke 660 px breit geworden und über die Trennlinie ins Nachrichtenfeld gelaufen.
- **Die Motive werden einzeln geladen** (bewusst kein `Promise.all`), damit eine fehlende Datei die übrigen nicht mitreißt. Daraus folgt eine Falle, die schon einmal zugeschlagen hat: In `updateStampOptions()` muss **„noch nicht geladen" (`undefined`) von „fehlgeschlagen" (`null`) unterschieden** werden. Eine bloße Falsy-Prüfung greift beim ersten eintreffenden Motiv, weil alle anderen dann noch `undefined` sind — die Voreinstellung wird dadurch zufällig das zuerst geladene Motiv. Lokal unsichtbar, live beim ersten Aufruf mit kaltem Cache sofort da.
- Aufbereitung der Dateien: „Hasen" und „Wasserrad" hatten **keinen Alphakanal** (weißer bzw. cremefarbener Hintergrund) und wurden per Flood-Fill vom Rand freigestellt — sonst säße ein heller Kasten auf dem Dust-Grund und der Zackenrand wäre zunichte. Alle vier als WebP, Qualität 92, maximal 1400 px Kantenlänge: 1,03 MB statt 8,1 MB als PNG, bei Kartengröße nicht vom Original zu unterscheiden. Die Kantenlänge liegt bewusst über der maximalen Zeichengröße von 749 px, damit beim Verkleinern Reserve bleibt.

**Canvas und Export**

- **`imageSmoothingQuality` steht per Vorgabe auf `'low'`** — ein billiger Filter, der bei jedem Verkleinern Detail kostet: Urlaubsfoto auf Kartenbreite, Markenmotiv, Story-Export. `setHighQuality(ctx)` setzt ihn auf `'high'` und muss **am Anfang jeder Zeichenfunktion** stehen, nicht einmalig im Init: Das Setzen von `canvas.width` setzt den gesamten Kontextzustand zurück, also auch diese Einstellung.
- **Auflösungsgrenze ist der gestapelte Export.** Karte 2880×2036 ergibt „Beide Seiten" mit 2880×4112 = 11,8 MP. Darüber wird es riskant: **iOS Safari begrenzt Canvas auf rund 16,7 MP** und liefert darüber ohne Fehlermeldung ein leeres Canvas. Die Renderzeit ist kein Argument dagegen (gemessen 0,1–0,2 ms pro Rückseite) — die Grenze ist allein der Speicher.
- **Die Story zeichnet die Karten in Zielgröße neu**, statt die fertigen Vorschau-Canvases zu verkleinern. Dafür nehmen `renderFrontTo(canvas, ctx)` und `renderBackTo(canvas, ctx)` ein beliebiges Ziel entgegen; `renderCardAt()` legt das Offscreen-Canvas an. Vorher wurde jedes Element zweimal resampled (Foto → Karte → Story, Marke 1400 → 749 → 597) — sichtbar weich bei Text und Markenbeschriftung.
- **Die Markengröße in der Story hängt allein von `STORY.width` ab**, nicht von der Kartenauflösung: rund 22 % davon (0,26 Kartenanteil × 0,85 Rahmenanteil). Wer dort schärfer werden will, muss den **Rahmen** vergrößern — die Karte höher aufzulösen bringt nichts. Genau das hat einen Anlauf gekostet.
- Eine **1:1-Platzierung der Karte in der Story ist nicht möglich**: dafür müsste der Rahmen rund 3400 px breit sein und läge bei über 20 MP. Bei 2700×4800 wird die Karte auf 90 % skaliert — praktisch verlustfrei — und das Bild bleibt mit 13,0 MP unter der iOS-Grenze.
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
4. **Story im Hochformat:** die zwei gestapelten Karten belegen nur ~50 % der Story-Breite, der Nachrichtentext wird auf dem Handy klein. Zwei Hochkant-Karten übereinander sind in 9:16 zwangsläufig sehr hoch — bräuchte ein eigenes Story-Layout, nicht nur einen anderen Skalierungsfaktor. Die Auflösungsarbeit vom 2026-09-18 hat daran nichts geändert, sie betraf die Schärfe, nicht die Aufteilung.
5. **Story bleibt naturgemäß etwas hinter „Beide Seiten" zurück:** die Karte ist dort 2295 px breit statt 2880. Reine Geometrie — eine querformatige Karte in einem hochformatigen Rahmen. Nur über ein eigenes Story-Layout zu verbessern (siehe Punkt 4).
6. **Dritte Teilen-Option „nur diese Seite"** wäre der Weg zu spürbar mehr Auflösung: ohne den Stapel könnte eine einzelne Karte deutlich höher aufgelöst werden, ohne an die iOS-Canvas-Grenze zu stoßen. Besprochen, bewusst nicht gebaut.

## 5. Phase 2: Teilen per Link

Zurückgestellt, Erkenntnisse festgehalten damit sie nicht verloren gehen:

- **Instagram und TikTok nehmen von einer Website aus keine Links entgegen**, weder Feed noch Story. Dafür bleibt der Bild-/Story-Export der einzige Weg. Links lohnen für WhatsApp, Telegram, Signal, E-Mail, SMS, Facebook.
- Ein Link braucht zwingend **Speicherung der Karte** (die URL kann das Foto nicht tragen) **und eine serverseitig ausgelieferte Vorschau**: WhatsApps Crawler führt kein JavaScript aus, ohne `og:image` erscheint nur ein nackter Link — und genau dieses Vorschaubild ist der Werbeeffekt, um den es dem PRD geht.
- Minimale Bauform: Objektspeicher + kleine serverlose Funktion. Die Freigabeseite könnte das vorhandene `.postcard-flip`-Markup unverändert wiederverwenden, wenn Vorder- und Rückseite als Bilder abgelegt werden.
- **Bricht bewusst den PRD-Scope** und bringt DSGVO-Pflichten: Gästefotos sind personenbezogene Daten — EU-Hosting, Löschfrist, Löschmöglichkeit, Hinweis im Flow. Ohne Konten gilt: wer den Link hat, sieht die Karte.
- `wa.me` und `mailto:` können **technisch kein Bild anhängen**, nur Text. Das ist keine Einstellungssache und war der Grund, die Messenger-Buttons wieder zu entfernen.

## 6. Relevante Dateien

```
index.html            Startseite: Vorschauspalte, Formularspalte, Zuschneide-Dialog am Body-Ende
postkarte.css         Marken-Tokens in :root, Flip, Dialog, Sticky-Vorschau, Teilen-Bedienung
postkarte.js          Gesamte Logik (~1180 Zeilen), Abschnitte per Kommentar getrennt
assets/               4 Original-Logo-SVGs (wald + dust, jeweils Schriftzug und Signet)
                      + 4 Briefmarken-Motive AIG_marke_*.webp (siehe Abschnitt 3)
docs/PRD.md           Vollständige Produktanforderungen
docs/HANDOFF.md       Dieses Dokument
docs/Ab_ins_Gruene_Brand_Guideline.pdf   Brand Book, lokal, bewusst gitignored (Repo ist öffentlich)

postkarte.html        Nur noch eine Weiterleitung auf ./ — der Generator lag frueher hier.
                      Entfernbar, sobald keine alten Links mehr im Umlauf sind.
```

Das Repository hiess urspruenglich `game` und enthielt ein separates Pac-Man-Mini-Projekt (`index.html`, `style.css`, `game.js`). Das ist am 2026-09-14 geloescht worden; der Generator ist seitdem die Startseite. Der Repo-Name passt dadurch nicht mehr zum Inhalt.

Orientierung in `postkarte.js`: `STAMPS`, `state` und `setPhoto()` ganz oben, dann Helfer (`coverFit`, `fitLines`, `setHighQuality`, `getFrontLayout`, `getCropAspect`), dann `drawStampArt()`/`drawStamp()`, dann `renderFrontTo()`/`renderBackTo()` mit den Hüllen `renderFront()`/`renderBack()` und `applyFormat()`, dann `updateStampOptions()`/`selectStamp()`, dann der Zuschneide-Dialog, dann `renderCardAt()`/`buildStoryCanvas()`/`buildCombinedCanvas()` und Teilen, zuletzt Init.

## 7. Arbeitsweise des Nutzers

- **Keine Features ungefragt hinzufügen.** Mehrfach betont. Was entfernt wurde, bleibt entfernt.
- Referenzen dienen als **Inspiration**, nicht als Vorlage. Brand Book hat immer Vorrang.
- Bei größeren Änderungen **erst analysieren und planen, dann umsetzen**.
- Änderungen im Browser gegenprüfen, Desktop **und** ~375 px.
