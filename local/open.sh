#!/usr/bin/env bash
# Abre o Universal Editor e mostra as URLs do sandbox.
. "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

PAGE="https://localhost:${AEM_CLI_PORT}/"

step "URLs do sandbox"
echo "  site (código local + conteúdo do author) : $PAGE"
echo "  author                                   : $AUTHOR_URL  (${AEM_AUTHOR_USER}/${AEM_AUTHOR_PASSWORD})"
echo "  author via https                         : https://localhost:${AEM_TLS_PORT}"
echo "  markup cru do author                     : ${DELIVERY_BASE}/index.html"
echo "  universal editor service                 : https://localhost:${UES_PORT}"

step "abrindo o Universal Editor"
echo "  cole no campo 'Site URL' do editor: $PAGE"
echo
warn "não use o botão 'Editar' do console de Sites local:"
echo "     ele navega para /ui#/aem/... (unified shell), que não existe no SDK — dá 404."
open "https://experience.adobe.com/#/aem/editor" 2>/dev/null || \
  echo "  abra manualmente: https://experience.adobe.com/#/aem/editor"
