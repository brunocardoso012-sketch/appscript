#!/bin/bash
# folha.sh video.mp4 saida.jpg  -> 12 quadros (a cada 1/12 da duração) num mosaico 4x3
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
ffmpeg -loglevel error -y -i "$1" -vf "fps=12/$d,scale=640:-1,tile=4x3" -frames:v 1 "$2"
