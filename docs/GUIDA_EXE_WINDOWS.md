# App desktop Windows — Edilristrutturazioni

## Come si usa

1. Scarica `Edilristrutturazioni-windows-x64.zip`
2. Estrai la cartella (tasto destro → *Estrai tutto*)
3. Apri la cartella `Edilristrutturazioni-win32-x64`
4. Doppio clic su **Edilristrutturazioni.exe**

Suggerimento: tasto destro sull'exe → *Invia a → Desktop (crea collegamento)* per avere l'icona sul desktop.

Nota: alla prima apertura Windows può mostrare l'avviso SmartScreen (app senza firma digitale).
Clicca *Ulteriori informazioni → Esegui comunque*.

## Come funziona

- L'app desktop carica l'interfaccia in locale (nessun browser necessario)
- I dati restano sul database Supabase aziendale: stessi login, stessi dati dell'app web e mobile
- Serve connessione internet per leggere/salvare i dati (le funzioni offline dell'app restano attive)

## Come rigenerare il pacchetto

```bash
npx @electron/packager . "Edilristrutturazioni" --platform=win32 --arch=x64 \
  --out=electron-release --overwrite --app-version=1.0.0 \
  --ignore='node_modules' --ignore='^/src' --ignore='^/public' \
  --ignore='^/android' --ignore='^/ios' --ignore='^/selfhost' \
  --ignore='^/supabase' --ignore='^/docs' --ignore='^/electron-release'
```

Il main process è `electron/main.cjs`, che serve la build web da `dist/` su un mini server locale.
