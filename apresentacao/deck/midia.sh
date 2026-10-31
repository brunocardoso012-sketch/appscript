#!/bin/bash
# GIF (para o Google Apresentações), MP4 e capa de cada vídeo, e as durações.
set -e
cd "$(dirname "$0")"
V=../gravacao/videos
echo "{" > media/duracoes.json
primeiro=1
for i in 1 2 3 4 5 6 7 8; do
  ffmpeg -loglevel error -y -i $V/v$i.mp4 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -an media/v$i.mp4
  ffmpeg -loglevel error -y -ss 1.5 -i $V/v$i.mp4 -frames:v 1 media/v$i-capa.png
  ffmpeg -loglevel error -y -i $V/v$i.mp4 -vf "fps=10,scale=1024:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=192:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 media/v$i.gif &
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $V/v$i.mp4)
  [ $primeiro = 1 ] || echo "," >> media/duracoes.json
  echo "\"v$i\": $d" >> media/duracoes.json
  primeiro=0
done
echo "}" >> media/duracoes.json
wait
ls -la media
