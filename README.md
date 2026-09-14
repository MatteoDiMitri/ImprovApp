# ImprovApp — Life RPG

Un tracker della tua vita costruito come la schermata delle statistiche di un videogioco:
quattro sezioni, una settimana da riempire la domenica sera e da rispettare fino alla
domenica successiva, XP e livelli che salgono solo se sei costante.

![sezioni](https://img.shields.io/badge/sezioni-Dieta%20%C2%B7%20Workout%20%C2%B7%20Studio%20%C2%B7%20Routine-informational)

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
```

Altri comandi: `npm run build` (build di produzione in `dist/`), `npm run preview`,
`npm run typecheck`.

I dati vivono nel **localStorage del browser**: nessun server, nessun account, niente
che esce dal tuo dispositivo. Da *Impostazioni* puoi esportare e importare tutto come
JSON (fallo prima di cambiare browser o dispositivo) e caricare un set di esempio di
sei settimane per vedere com'è l'app "a regime".

## Com'è organizzata

### 🗓️ Settimana — il pianificatore
È il centro dell'app. Una griglia lunedì → domenica: la domenica sera assegni a ogni
giorno il piano alimentare, il giorno di split (o il riposo), l'obiettivo di studio con
i suoi blocchi orari e le task. Durante la settimana ti limiti a eseguire e a spuntare.
Il pulsante **Copia precedente** riporta l'intera settimana passata, così la
pianificazione ricorrente costa dieci secondi.

### 🍽️ Dieta
Piani alimentari scritti a mano — pasti, alimenti, quantità, kcal — riutilizzabili come
template sui giorni della settimana. Ogni giorno registri il peso e dichiari quanto hai
seguito il piano (*Perfetto / Bene / Così così / Sgarro*). I grafici mostrano il peso con
la media mobile a 7 giorni (che smorza il rumore di acqua e sale) contro il peso
obiettivo, e le kcal giorno per giorno contro il tuo target.

### 🏋️ Workout
Il tuo split (Push, Pull, Gambe…) con esercizi, serie, ripetizioni, carichi e kcal
stimate. Quando registri una sessione, i carichi inseriti diventano i nuovi carichi di
riferimento dello split: il grafico **Transizione dei carichi** mostra come si è mosso
ogni singolo esercizio nel tempo. In più: kcal bruciate per settimana e volume totale
(kg × serie × ripetizioni).

### 📚 Studio
Il calendario delle lezioni universitarie (corsi e slot ricorrenti, si ripetono ogni
settimana) e lo studio che fai davvero, con obiettivi giornalieri e settimanali che
imposti tu. Grafici sui minuti per giorno, sulle ore per settimana e sulla ripartizione
per corso.

### ✅ Routine
Una to-do list per le cose secondarie: priorità, scadenza, ricorrenza (una task
ricorrente, quando la spunti, si ricrea da sola). Le task con una data compaiono nel
giorno corrispondente del pianificatore settimanale.

### 🎮 Panoramica
Livello, barra XP, streak, anelli di completamento settimanale per sezione, le quest di
oggi, gli XP guadagnati per sezione nelle ultime otto settimane e il calendario della
costanza.

## Le regole del gioco (XP)

| Sezione | XP |
|---|---|
| Dieta | fino a 30 XP al giorno in base all'aderenza, +5 XP se ti pesi |
| Workout | 45 XP a sessione, +1 XP ogni 25 kcal bruciate |
| Studio | 1 XP ogni 4 minuti, +20 XP quando centri l'obiettivo del giorno |
| Routine | 4 / 6 / 10 XP per task, in base alla priorità |

Il livello segue una curva quadratica: ogni livello costa più del precedente, quindi
la costanza pesa più di una settimana eroica isolata.

## Stack

React 19 + TypeScript + Vite, stato in [Zustand](https://zustand.docs.pmnd.rs/) con
persistenza su localStorage. I grafici sono SVG scritti a mano in
`src/components/charts/` — nessuna libreria di charting — su una palette verificata per
daltonismo e contrasto sulla superficie scura.

```
src/
├─ components/charts/   LineChart, BarChart, RadialGauge, Heatmap
├─ components/ui/       Card, Modal, Stat, Field, Bar…
├─ lib/                 date (settimane ISO lun→dom), format, router a hash
├─ pages/               Dashboard, Week, Diet, Workout, Study, Routine, Settings
└─ store/               types, store persistente, selettori (XP, livelli, streak), seed demo
```

## Metterla online

`npm run build` produce una cartella `dist/` completamente statica (la `base` è
relativa, quindi funziona anche servita da una sottocartella). Puoi pubblicarla su
GitHub Pages, Netlify, Vercel o su qualsiasi hosting statico. Ricorda che i dati
restano nel browser da cui la usi.
