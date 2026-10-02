#!/bin/zsh
set -eu
bridge_dir="${0:A:h}"
bridge_node="${CUTNOTE_NODE:-}"
if [[ -z "$bridge_node" ]]; then bridge_node="$(command -v node 2>/dev/null || true)"; fi
if [[ -z "$bridge_node" || ! -x "$bridge_node" ]]; then
  print -u2 'Node.js 22.13.0 이상을 설치하거나 CUTNOTE_NODE에 Node 실행 파일의 절대 경로를 지정해주세요.'
  exit 1
fi
cd "$bridge_dir"
"$bridge_node" "$bridge_dir/server.mjs" "$@"
