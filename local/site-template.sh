#!/usr/bin/env bash
# Baixa o site template oficial do xwalk (o zip que o wizard "Create Site" importa).
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

DEST="$ROOT/local/downloads"
mkdir -p "$DEST"

step "consultando o último release de adobe-rnd/aem-boilerplate-xwalk"
URL=$(curl -sL https://api.github.com/repos/adobe-rnd/aem-boilerplate-xwalk/releases/latest \
  | grep -o 'https://github.com/[^"]*\.zip' | head -1)

if [ -z "$URL" ]; then
  fail "não consegui resolver a URL do release"
  echo "  baixe manualmente em https://github.com/adobe-rnd/aem-boilerplate-xwalk/releases"
  exit 1
fi

FILE="$DEST/$(basename "$URL")"
if [ -f "$FILE" ]; then
  ok "já baixado: ${FILE#"$ROOT"/}"
else
  curl -sL --progress-bar -o "$FILE" "$URL"
  ok "baixado: ${FILE#"$ROOT"/}"
fi

echo
echo "Importe no author:"
echo "  1. $AUTHOR_URL/sites.html/content"
echo "  2. Create > Site from template > Import"
echo "  3. selecione $FILE"
echo "  4. crie o site com:"
echo "       Site title  : $EDS_SITE"
echo "       GitHub URL  : https://github.com/$EDS_ORG/$EDS_SITE"
echo "     (org/repo TÊM que bater com EDS_ORG/EDS_SITE do .env)"
