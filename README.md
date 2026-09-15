# ImprovApp — Life RPG

Un tracker della tua vita costruito come la schermata delle statistiche di un videogioco:
quattro sezioni, una settimana da riempire la domenica sera e da rispettare fino alla
domenica successiva, XP e livelli che salgono solo se sei costante.

![sezioni](https://img.shields.io/badge/sezioni-Dieta%20%C2%B7%20Workout%20%C2%B7%20Studio%20%C2%B7%20Routine-informational)

## Avvio

```bash
npm install
npm run dev        # http://localhost:5173
npm run dev:host   # stesso server, raggiungibile dal telefono sulla stessa rete
```

`dev:host` stampa un indirizzo tipo `http://192.168.1.42:5173`: aprilo dal telefono
collegato al tuo stesso Wi-Fi e usi l'app da lì, senza pubblicarla da nessuna parte
(finché il server resta acceso sul computer).

Altri comandi: `npm run build` (build di produzione in `dist/`), `npm run preview`,
`npm run typecheck`.

I dati vivono nel **localStorage del browser**: nessun server, nessun account, niente
che esce dal tuo dispositivo. Tutto si salva da solo mentre scrivi; se il browser
impedisce il salvataggio (navigazione privata, dati dei siti bloccati, spazio esaurito)
l'app te lo dice con un avviso in cima, invece di lasciarti lavorare a vuoto.

Da *Impostazioni* puoi esportare e importare tutto come JSON — fallo prima di cambiare
browser o dispositivo — e caricare un set di esempio di sei settimane per vedere com'è
l'app "a regime".

## Com'è organizzata

### 🗓️ Settimana — la schermata principale
È la home dell'app e occupa tutto lo schermo. Una griglia lunedì → domenica: la
domenica sera assegni a ogni giorno il giorno di split (o il riposo), l'obiettivo di
studio con i suoi blocchi orari e le task. La dieta non va assegnata: compare da sola,
presa dalla dieta settimanale. Durante la settimana ti limiti a eseguire e a spuntare.
Il pulsante **Copia precedente** riporta l'intera settimana passata, così la
pianificazione ricorrente costa dieci secondi.

In cima c'è una striscia con livello, barra XP, avanzamento delle quattro sezioni e
streak; le quattro sezioni stanno nella barra laterale.

### 🍽️ Dieta
Qui scrivi la tua **dieta settimanale**: sette giorni, per ognuno i pasti con alimenti,
quantità e kcal. Si salva da sola a ogni tasto premuto — non esiste nessun pulsante
"Salva" da ricordarsi — e finisce in automatico nei giorni della Settimana, senza doverla
assegnare. Un giorno si copia sugli altri con *Copia su…*.

Ogni giorno registri il peso e dichiari quanto hai seguito la dieta (*Perfetto / Bene /
Così così / Sgarro*). I grafici mostrano il peso con la media mobile a 7 giorni (che
smorza il rumore di acqua e sale) contro il peso obiettivo, e le kcal giorno per giorno
contro il tuo target.

### 🏋️ Workout
Il tuo split (Push, Pull, Gambe…) con esercizi, serie, ripetizioni, carichi e kcal
stimate. Quando registri una sessione, i carichi inseriti diventano i nuovi carichi di
riferimento dello split: il grafico **Transizione dei carichi** mostra come si è mosso
ogni singolo esercizio nel tempo. In più: kcal bruciate per settimana e volume totale
(kg × serie × ripetizioni).

### 📚 Studio
Il calendario delle lezioni universitarie (corsi e slot ricorrenti, si ripetono ogni
settimana) e un **timer con tecnica pomodoro**, di default 50 minuti di focus e 10 di
pausa. Le ore di studio si contano solo da lì: non c'è nessun campo per digitare i
minuti a mano.

Il tempo è misurato sull'orologio di sistema, non su un conteggio interno, quindi una
sessione sopravvive a un refresh e non si falsa sospendendo la scheda. Se fermi il focus
a metà vengono registrati i minuti fatti fin lì; sotto il minuto non si registra niente.
Grafici sui minuti per giorno, sulle ore per settimana e sulla ripartizione per corso.

### ✅ Routine
Una to-do list per le cose secondarie: priorità, scadenza, ricorrenza (una task
ricorrente, quando la spunti, si ricrea da sola). Le task con una data compaiono nel
giorno corrispondente del pianificatore settimanale.

### 📈 Statistiche
Livello, barra XP, streak, anelli di completamento settimanale per sezione, le quest di
oggi, gli XP guadagnati per sezione nelle ultime otto settimane e il calendario della
costanza.

## Le regole del gioco (XP)

| Sezione | XP |
|---|---|
| Dieta | fino a 30 XP al giorno in base all'aderenza, +5 XP se ti pesi |
| Workout | 45 XP a sessione, +1 XP ogni 25 kcal bruciate |
| Studio | 1 XP ogni 4 minuti cronometrati, +20 XP quando centri l'obiettivo del giorno |
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
├─ lib/                 date (settimane ISO lun→dom), format, storage, timer pomodoro, router
├─ pages/               Week (home), Diet, Workout, Study, Routine, Stats, Settings
└─ store/               types, store persistente, selettori (XP, livelli, streak), seed demo
```

## Metterla online

`npm run build` produce una cartella `dist/` completamente statica (la `base` è
relativa, quindi funziona anche servita da una sottocartella). Puoi pubblicarla su
GitHub Pages, Netlify, Vercel o su qualsiasi hosting statico. Ricorda che i dati
restano nel browser da cui la usi.
