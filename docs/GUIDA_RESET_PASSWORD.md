# Guida passo-passo: Reset password automatico con Resend + Supabase

Questa guida ti permette di far funzionare il recupero password in automatico per tutti gli utenti dell'app Edilristrutturazioni.

Tempo stimato: **5-10 minuti**.
Costo: **gratuito** con Resend (fino a 100 email/giorno).

---

## Cosa ti serve avere pronto

- Accesso alla dashboard di **Resend** (https://resend.com)
- Accesso alla dashboard del tuo **Supabase** personale
- I dati DNS del dominio `edilristrutturazioni.it` gestibili dal tuo provider (Aruba, Register.it, OVH, Cloudflare, ecc.)

---

## PARTE 1 — Verifica il dominio su Resend

Vai su https://resend.com → Domains → `edilristrutturazioni.it`.

Devi aggiungere questi 4 record DNS esatti presso il tuo provider DNS:

### 1. DKIM
| Tipo | Nome | Valore |
|------|------|--------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC/wtqT5HE9+ri8fTNAOCXKzuqvcezO+UDup4lj4ztFyJU/3UWUqq85AhZc7H1iHHKNMDUO4LEDgGJcx5Lmw7Y0EdgVr77Ejbtz+BIPWZ2fdJ32KicwEPMrMNFqdGaXMtQuRa+8G/Bblvfd1bsS98FUL9VrfYnUorXgQZFULFn+qQIDAQAB` |

### 2. SPF
| Tipo | Nome | Valore |
|------|------|--------|
| CNAME | `rsend` | `rsend-euw1.forge.rmta.net` |
| CNAME | `send` | `send.forge.rmta.net` |

### 3. DMARC
| Tipo | Nome | Valore |
|------|------|--------|
| TXT | `_dmarc` | `v=DMARC1; p=none;` |

> **TTL**: lascia `Auto` (o `3600` se il tuo provider non ha Auto).

Dopo aver aggiunto i record, torna su Resend e clicca il pulsante **Verify domain**.
Se non si verifica subito, aspetta 15-30 minuti e riprova.

---

## PARTE 2 — Trova la tua API Key su Resend

1. Vai su https://resend.com → API Keys.
2. Copia la chiave che inizia con `re_` (es. `re_xxxxxxxxxxxxxxxx`).
3. Tienila a portata di mano: serve nel prossimo passaggio.

---

## PARTE 3 — Configura SMTP su Supabase

1. Accedi alla dashboard del tuo Supabase personale.
2. Clicca sull'icona **Settings** (ingranaggio) in basso a sinistra.
3. Nel menu a sinistra seleziona **Authentication**.
4. In alto seleziona la scheda **SMTP Settings**.
5. Attiva l'interruttore **Enable Custom SMTP**.
6. Compila i campi così:

| Campo | Valore |
|-------|--------|
| SMTP Host | `smtp.resend.com` |
| SMTP Port | `587` |
| SMTP Username | `resend` |
| SMTP Password | La tua API Key di Resend (quella che inizia con `re_`) |
| Sender Email | `noreply@edilristrutturazioni.it` |
| Sender Name | `Edilristrutturazioni` |

7. Clicca **Save**.

---

## PARTE 4 — Configura URL e template della email di reset

### URL Configuration

1. Vai su **Authentication** → **URL Configuration**.
2. Imposta:
   - **Site URL**: `https://workforce-whisperer-18.lovable.app`
   - **Redirect URLs**: aggiungi `https://workforce-whisperer-18.lovable.app/*`
3. Salva.

### Email Template Reset Password

1. Vai su **Authentication** → **Email Templates**.
2. Apri il template **Reset Password**.
3. Assicurati che nel corpo della mail ci sia questo link:

```html
<a href="{{ .ConfirmationURL }}">Clicca qui per reimpostare la password</a>
```

Se vuoi un testo più professionale, puoi usare:

```html
<p>Ciao,</p>
<p>Hai richiesto il reset della password per il tuo account Edilristrutturazioni.</p>
<p><a href="{{ .ConfirmationURL }}">Reimposta la password</a></p>
<p>Se non sei stato tu, ignora questa email.</p>
```

4. Salva.

---

## PARTE 5 — Testa il flusso

1. Apri l'app pubblicata: https://workforce-whisperer-18.lovable.app
2. Vai alla schermata di login.
3. Clicca **Password dimenticata?**
4. Inserisci la tua email.
5. Controlla la casella di posta (anche lo spam).
6. Dovresti ricevere una email da `noreply@edilristrutturazioni.it` con il link.
7. Cliccando il link arrivi alla pagina per inserire la nuova password.

---

## Se qualcosa non funziona

### La email non arriva
- Verifica che il dominio su Resend sia **Verified** (stato verde).
- Controlla lo spam/promozioni di Gmail.
- Assicurati che la API Key inserita in Supabase sia corretta e attiva.

### Il link dà errore "non valido o scaduto"
- Controlla che **Site URL** su Supabase sia esattamente `https://workforce-whisperer-18.lovable.app`.
- Assicurati che il link nella email punti a quel dominio.

### Il provider DNS non accetta i record CNAME
Alcuni provider italiani (es. Aruba in certi pannelli) possono richiedere di inserire i record SPF come TXT invece che CNAME. In quel caso contatta il supporto del provider o sposta la gestione DNS su Cloudflare (gratuito), che accetta tutti i tipi di record.

---

## Riassunto

Una volta completati questi passaggi, il recupero password funzionerà in automatico per tutti gli utenti. Non dovrai più fare nulla manualmente.
