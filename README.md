# Letterlab — sorteren (sorteer)

Twee tot vier groepen, bijvoorbeeld k en d. De cursist sleept elk kaartje
naar de juiste groep.

Link: `https://ligolimino.github.io/sorteer/`. Zonder oefening in de link
verschijnt een uitlegpagina met voorbeelden. Maak oefeningen met de
createpagina.

## Een oefening

| In de link | Betekenis |
|---|---|
| `groep=k\|d` | De koppen van de groepen (2 tot 4). |
| `g1=kat\|kip\|kam` | De kaartjes die bij groep 1 horen. Zo ook `g2=`, `g3=` en `g4=`. |

De kaartjes staan altijd door elkaar. Een groep heeft plaats voor de
kaartjes die erin horen, plus één, en groeit mee als er meer in komen.
Horizontaal staan de groepen naast elkaar, verticaal onder elkaar.

Voorbeeld: `?groep=k~g:k|d~g:d&g1=kat|kip|kam&g2=das|dak|doos&luister=ja`

## Wat staat er op een kaartje?

Een kaartje, een vast item of een groepskop kan tekst, een afbeelding en/of
geluid hebben. In de link staan die delen met `~` ertussen:

| In de link | Wat de cursist ziet |
|---|---|
| `kat` | het woord kat |
| `b:kat` | de afbeelding kat (uit `assets/afbeeldingen/`) |
| `g:k` | een luisterknop met de klank k |
| `kat~b:kat` | de afbeelding met het woord eronder |
| `kat~g:kat` | het woord, dat je kunt beluisteren |

Items staan na elkaar met `|` ertussen.

- Afbeeldingen komen uit de centrale repository **assets**
  (`afbeeldingen/kat.webp`, `.jpg`, `.png`), anders uit
  `assets/afbeeldingen/` in deze repository. Een volledige link kan ook.
- Geluid (`g:`) zoekt eerst in `audio/klanken/` (bij korte namen), dan in
  `audio/woorden/` en `audio/woorden/nonsens/`; een getal in
  `audio/getallen/`, een zin in `audio/zinnen/`.
- Een kaartje met geluid heeft een klein luidsprekertje in de hoek.
  Bestaat de opname niet, dan verschijnt er geen luidsprekertje.

## Alle mogelijkheden in de link

| In de link | Betekenis |
|---|---|
| `richting=verticaal` | Onder elkaar in plaats van naast elkaar. |
| `nakijken=meteen` | Elk kaartje wordt meteen nagekeken: een fout kaartje schudt en springt terug. Zonder deze toevoeging wordt nagekeken als alles op zijn plaats staat (foute kaartjes worden rood). |
| `luister=ja` | Tik op een woord of letter zonder eigen geluid: de opname van dat woord of die klank is te horen, als ze bestaat. |
| `weergave=volledig` | Volledige versie met instructie-audio, om los te gebruiken. Zonder deze toevoeging: doorzichtige achtergrond, voor Genially. |
| `instructie=` | Instructie-audio uit `audio/instructies/` van de repository assets. |
| `grootte=80` | Kaartjes kleiner (50 tot 100). Groter dan wat past, kan niet. |

## Wat de cursist doet

- **Slepen**: een kaartje naar een vakje of groep slepen. In de buurt
  loslaten volstaat: het kaartje klikt vast.
- **Tikken**: op een kaartje tikken kiest het (roze rand) en laat het
  geluid horen. Tik daarna op een vakje of groep om het daar te zetten.
  Voor cursisten die moeilijk kunnen slepen.
- **Terugzetten**: een kaartje terug naar onderen slepen, of het
  aantikken en daarna op de lege ruimte onderaan tikken.
- Op een vast item of een groepskop tikken laat het geluid horen.
- Alles wordt vanzelf zo groot als het scherm of het insluitvak in Genially
  toelaat, op gsm, tablet en computer.

## Zelfstandig en onderhoudsvrij

- Alleen gewone bestanden (`index.html`, `styles.css`, `app.js`): geen
  installatie, geen bouwstap, geen databank.
- Het lettertype Andika staat in de repository zelf.
- De volledige oefening staat in de link.
- `app.js` en `styles.css` zijn dezelfde bestanden in de repositories
  **koppel** en **sorteer**. Pas je er één aan, kopieer de wijziging dan ook
  naar de andere. Verhoog daarna het versienummer in `index.html`
  (`app.js?v=1` wordt `app.js?v=2`).

## Publiceren (eenmalig)

1. Maak op github.com, bij de account **ligolimino**, een nieuwe openbare
   repository met de naam van deze map.
2. Zet de inhoud van deze map erin.
3. **Settings → Pages**: kies *Branch* `main` en `/ (root)`, en **Save**.

## Licentie lettertype

Andika valt onder de SIL Open Font License, zie
`assets/fonts/OFL-LICENSE.txt`.
