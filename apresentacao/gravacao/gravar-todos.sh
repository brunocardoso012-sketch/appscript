#!/bin/bash
# Grava os 8 vídeos e monta os MP4 (render em paralelo).
cd "$(dirname "$0")"
for v in "$@"; do node v$v.js || exit 1; done
for v in "$@"; do
  d=$(ls -d out/v$v-*/ | head -1)
  python3 render.py "$d" videos/v$v.mp4 &
done
wait
