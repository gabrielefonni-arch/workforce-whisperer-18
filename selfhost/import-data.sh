#!/usr/bin/env bash
# =====================================================================
# Importa i dati esportati (CSV) nel nuovo database indipendente.
#
# Uso:
#   export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:5432/postgres"
#   ./import-data.sh /percorso/cartella-csv
#
# Prima di questo script esegui:  psql "$DATABASE_URL" -f schema.sql
# =====================================================================
set -euo pipefail

DIR="${1:-./data}"
: "${DATABASE_URL:?Imposta DATABASE_URL}"

# L'ordine conta: employees prima di day_entries (foreign key).
TABLES=(employees day_entries day_entries_history appointments location_history push_subscriptions)

for t in "${TABLES[@]}"; do
  f="$DIR/$t.csv"
  if [[ ! -f "$f" ]]; then
    echo "salto $t (file mancante)"
    continue
  fi
  echo "importo $t ..."
  psql "$DATABASE_URL" -c "\copy public.$t FROM '$f' WITH CSV HEADER"
done

echo "Import completato."
psql "$DATABASE_URL" -c "select 'employees' t, count(*) from public.employees
  union all select 'day_entries', count(*) from public.day_entries
  union all select 'day_entries_history', count(*) from public.day_entries_history;"
