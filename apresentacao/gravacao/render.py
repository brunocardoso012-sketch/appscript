"""
Monta o vídeo (1920x1080, 30 fps, sem som) a partir da gravação: quadros do screencast, câmera (recortes com
transição suave) e cursor com o efeito de clique.

Uso: python3 render.py out/<nome> videos/<arquivo>.mp4
"""
import json
import math
import subprocess
import sys
from bisect import bisect_right
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FONTE = '/usr/share/fonts/opentype/inter/Inter-Bold.otf'

W, H, FPS = 1920, 1080, 30


def suave(k):
    k = max(0.0, min(1.0, k))
    return 4 * k * k * k if k < 0.5 else 1 - math.pow(-2 * k + 2, 3) / 2


def cursor_img(tam=64):
    """Seta do mouse (preta com borda branca e sombra), desenhada grande para reduzir sem serrilhar."""
    s = 4
    im = Image.new('RGBA', (tam * s, tam * s), (0, 0, 0, 0))
    pts = [(0, 0), (0, 17), (4, 13.2), (6.8, 19.6), (9.6, 18.4), (6.9, 12.2), (12.2, 12.2)]
    esc = tam * s / 22.0
    off = 2.2
    poly = [((x + off) * esc, (y + off) * esc) for x, y in pts]
    sombra = Image.new('RGBA', im.size, (0, 0, 0, 0))
    ImageDraw.Draw(sombra).polygon([(x + 0.9 * esc, y + 1.2 * esc) for x, y in poly], fill=(0, 0, 0, 110))
    sombra = sombra.filter(ImageFilter.GaussianBlur(1.1 * esc))
    im.alpha_composite(sombra)
    d = ImageDraw.Draw(im)
    d.polygon(poly, fill=(255, 255, 255, 255))
    # contorno branco: desenha o preto "encolhido" por dentro
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    dentro = [(cx + (x - cx) * 0.80 + 0.35 * esc, cy + (y - cy) * 0.80 + 0.2 * esc) for x, y in poly]
    d.polygon(dentro, fill=(20, 20, 24, 255))
    im = im.resize((tam, tam), Image.LANCZOS)
    return im, (off * tam / 22.0, off * tam / 22.0)


_fonte = None


def selo(img, texto, alfa):
    global _fonte
    if _fonte is None:
        _fonte = ImageFont.truetype(FONTE, 40)
    d0 = ImageDraw.Draw(img)
    l, t_, r_, b = d0.textbbox((0, 0), texto, font=_fonte)
    w, h = max(r_ - l + 56, 88), 84
    x, y = (W - w) // 2, H - h - 56
    camada = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(camada)
    a = int(255 * alfa)
    d.rounded_rectangle((x, y + 6, x + w, y + h + 6), 18, fill=(0, 0, 0, int(70 * alfa)))
    d.rounded_rectangle((x, y, x + w, y + h), 18, fill=(28, 30, 36, int(235 * alfa)), outline=(255, 255, 255, int(90 * alfa)), width=2)
    d.text((x + w / 2, y + h / 2), texto, font=_fonte, fill=(255, 255, 255, a), anchor='mm')
    return Image.alpha_composite(img.convert('RGBA'), camada).convert('RGB')


def main(pasta, saida):
    pasta = Path(pasta)
    r = json.loads((pasta / 'roteiro.json').read_text())
    vw, vh = r['vw'], r['vh']
    quadros = sorted(r['quadros'], key=lambda q: q['t'])
    tq = [q['t'] for q in quadros]
    mouse = sorted(r['mouse'], key=lambda m: m['t'])
    tm = [m['t'] for m in mouse]
    cam = sorted(r['camera'], key=lambda c: c['t'])
    cliques = r['cliques']
    t0 = r.get('corteInicio') or r['inicio']
    t1 = r.get('corteFim') or r['fim']
    t0 = max(t0, tq[0])
    n = int((t1 - t0) * FPS)

    seta, hot = cursor_img(46)
    cache = {}

    def quadro(t):
        i = max(0, bisect_right(tq, t) - 1)
        arq = quadros[i]['arq']
        if arq not in cache:
            cache.clear()
            cache[arq] = Image.open(pasta / 'q' / arq).convert('RGB')
        return cache[arq]

    tc = [c['t'] for c in cam]

    def camera(t):
        idx = max(0, bisect_right(tc, t) - 1)
        return camera_fim(idx, t)

    memo = {}

    def camera_fim(idx, t):
        """Posição da câmera `idx` no instante t (antes da próxima começar)."""
        chave = (idx, round(t, 3))
        if chave in memo:
            return memo[chave]
        c = cam[idx]
        if idx == 0 or c['dur'] <= 0:
            v = (c['x'], c['y'], c['w'])
        else:
            de = camera_fim(idx - 1, c['t'])
            k = suave((t - c['t']) / c['dur'])
            v = tuple(de[j] + (val - de[j]) * k for j, val in enumerate((c['x'], c['y'], c['w'])))
        memo[chave] = v
        return v

    def pos_mouse(t):
        i = bisect_right(tm, t)
        if i <= 0:
            return mouse[0]['x'], mouse[0]['y']
        if i >= len(mouse):
            return mouse[-1]['x'], mouse[-1]['y']
        a, b = mouse[i - 1], mouse[i]
        k = (t - a['t']) / max(1e-6, b['t'] - a['t'])
        return a['x'] + (b['x'] - a['x']) * k, a['y'] + (b['y'] - a['y']) * k

    saida = Path(saida)
    saida.parent.mkdir(parents=True, exist_ok=True)
    ff = subprocess.Popen([
        'ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
        '-i', '-', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', str(saida)], stdin=subprocess.PIPE)
    mostrar_cursor = not r.get('semCursor')
    for f in range(n):
        t = t0 + f / FPS
        img = quadro(t)
        esc = img.width / vw
        x, y, w = camera(t)
        h = w * 9 / 16
        caixa = (x * esc, y * esc, (x + w) * esc, (y + h) * esc)
        out = img.resize((W, H), Image.LANCZOS, box=caixa)
        k = W / w  # px de saída por px CSS
        if mostrar_cursor:
            mx, my = pos_mouse(t)
            ox, oy = (mx - x) * k, (my - y) * k
            # clique: anel que se expande
            for c in cliques:
                dt = t - c['t']
                if 0 <= dt <= 0.55:
                    p = dt / 0.55
                    raio = (10 + 34 * suave(p)) * max(1.0, k * 0.8)
                    alfa = int(170 * (1 - p))
                    cx, cy = (c['x'] - x) * k, (c['y'] - y) * k
                    camada = Image.new('RGBA', out.size, (0, 0, 0, 0))
                    ImageDraw.Draw(camada).ellipse((cx - raio, cy - raio, cx + raio, cy + raio),
                                                   fill=(255, 140, 0, alfa // 3), outline=(255, 120, 0, alfa), width=4)
                    out = Image.alpha_composite(out.convert('RGBA'), camada).convert('RGB')
            fator = min(1.6, max(1.0, k * 0.75))
            s = seta if fator == 1.0 else seta.resize((int(seta.width * fator), int(seta.height * fator)), Image.LANCZOS)
            out = out.convert('RGBA')
            out.alpha_composite(s, (int(ox - hot[0] * fator), int(oy - hot[1] * fator))) if -60 < ox < W and -60 < oy < H else None
            out = out.convert('RGB')
        # selo da tecla apertada (ex.: F, →, Esc), no canto de baixo
        for lg in r.get('legendas', []):
            dt = t - lg['t']
            if 0 <= dt <= 1.4:
                alfa = min(1.0, dt / 0.12, (1.4 - dt) / 0.25)
                out = selo(out, lg['texto'], alfa)
        ff.stdin.write(out.tobytes())
    ff.stdin.close()
    ff.wait()
    print(saida, f'{n / FPS:.1f}s')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
