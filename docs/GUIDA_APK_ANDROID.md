# Come generare l'APK Android di Edilristrutturazioni

Il progetto Android nativo è già pronto nella cartella `android/` (o nello ZIP `android-edilristrutturazioni.zip`).
Nome app: **Edilristrutturazioni** — Pacchetto: **it.edilristrutturazioni.app** — Icona: logo aziendale.

## Metodo 1 — Android Studio (consigliato, gratis)

1. Scarica e installa **Android Studio**: https://developer.android.com/studio
2. Apri Android Studio → **Open** → seleziona la cartella `android/`
3. Attendi la prima sincronizzazione Gradle (scarica l'SDK in automatico, 5-10 minuti la prima volta)
4. Menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**
5. Al termine clicca **locate**: trovi l'APK in `android/app/build/outputs/apk/debug/app-debug.apk`
6. Copia l'APK sul telefono (USB, email, Drive) e installalo. Android chiederà di autorizzare "origini sconosciute": è normale per APK installati manualmente.

### APK "release" (per distribuirla ad altri)

1. **Build → Generate Signed App Bundle / APK → APK**
2. Crea un nuovo **keystore** (salva file e password in un posto sicuro: serve per OGNI aggiornamento futuro)
3. Seleziona **release** e termina. Otterrai `app-release.apk` installabile da chiunque.

## Metodo 2 — PWABuilder (più veloce, niente installazioni)

L'app è già una PWA completa (manifest, icone, service worker).

1. Vai su https://www.pwabuilder.com
2. Inserisci l'URL pubblicato dell'app: https://workforce-whisperer-18.lovable.app
3. Clicca **Package for Android** → scarica lo ZIP
4. Dentro trovi **apk** installabile subito e **aab** per il Play Store.

## Dopo ogni modifica all'app

```bash
bun run build
bunx cap sync android
```

e poi ricompila l'APK da Android Studio (Build APK).

## Note

- L'APK include l'intera app compilata: funziona anche offline con i dati in cache locale.
- Login, dati e notifiche passano dal tuo database Supabase personale: nessuna dipendenza da Lovable.
