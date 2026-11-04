#!/bin/bash
# Clipes curtos para o lado "solução" dos slides de problema vs solução (GIF para o Google Apresentações, MP4 para o
# PowerPoint): a checagem em tempo real (v13 inteiro) e o Analytics abrindo com os dados (trecho do v6).
set -e
cd "$(dirname "$0")"
V=../gravacao/videos
clipe() { # nome origem início duração
  ffmpeg -loglevel error -y -ss "$3" -t "$4" -i "$V/$2.mp4" -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -an "media/$1.mp4"
  ffmpeg -loglevel error -y -ss 0.5 -i "media/$1.mp4" -frames:v 1 "media/$1-capa.png"
  ffmpeg -loglevel error -y -i "media/$1.mp4" -vf "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 "media/$1.gif"
  echo "$1: $(ffprobe -v error -show_entries format=duration -of csv=p=0 media/$1.mp4) s"
}
clipe clip-checagem v13 0 15
clipe clip-dados v6 2.8 10
