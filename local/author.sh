#!/usr/bin/env bash
# Sobe o AEM SDK author já apontado para o Universal Editor Service local.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

if [ ! -x "$AEM_SDK_DIR/bin/start" ]; then
  fail "AEM SDK não encontrado em $AEM_SDK_DIR"
  echo "  ajuste AEM_SDK_DIR no .env"
  exit 1
fi

if author_up; then
  ok "author já está rodando em $AUTHOR_URL"
  exit 0
fi

step "subindo o author (leva alguns minutos no primeiro boot)"

# Lido pelo com.adobe.aem.wcm.franklin.internal.UniversalEditorSettings:
# é o endpoint do UE que o author anuncia na meta tag da página.
export AEM_XWALK_AUE_ENDPOINT="https://localhost:${UES_PORT}"
export CQ_PORT="$AEM_AUTHOR_PORT"
export CQ_RUNMODE="author"
export CQ_JVM_OPTS="$AEM_JVM_OPTS"

"$AEM_SDK_DIR/bin/start"

printf '  aguardando %s' "$AUTHOR_URL"
for _ in $(seq 1 180); do
  if author_up; then
    printf '\n'
    ok "author no ar: $AUTHOR_URL (${AEM_AUTHOR_USER}/${AEM_AUTHOR_PASSWORD})"
    ok "AEM_XWALK_AUE_ENDPOINT=$AEM_XWALK_AUE_ENDPOINT"
    exit 0
  fi
  printf '.'
  sleep 5
done

printf '\n'
fail "author não respondeu em 15min — veja $AEM_SDK_DIR/logs/error.log"
exit 1
