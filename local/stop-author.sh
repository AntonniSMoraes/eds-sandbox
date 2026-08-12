#!/usr/bin/env bash
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if ! author_up && ! port_busy "$AEM_AUTHOR_PORT"; then
  ok "author já está parado"
  exit 0
fi

step "parando o author"
"$AEM_SDK_DIR/bin/stop" || true

for _ in $(seq 1 60); do
  port_busy "$AEM_AUTHOR_PORT" || { ok "author parado"; exit 0; }
  sleep 2
done

fail "author ainda escutando na porta $AEM_AUTHOR_PORT"
exit 1
