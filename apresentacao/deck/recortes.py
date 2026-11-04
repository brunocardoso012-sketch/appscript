"""
Recorta, do PDF da apresentação editada no Google Apresentações ("Apresentação Projeto"), os visuais que só
existem nela: a planta da capa, o print do PPT antigo, os arquivos por ciclo, o arquivo único e os diagramas de
conexão manual e automática. Saem em media-projeto/, para o build-projeto.js.

Uso: python3 recortes.py "Apresentação Projeto.pdf"
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

AQUI = Path(__file__).parent
SAIDA = AQUI / 'media-projeto'
K = 3.0  # 300 dpi: a página de 720 × 405 pt vira 3000 × 1688 px; as caixas abaixo estão em 1000 × 563

RECORTES = [
    (1, (0, 0, 520, 563), 'capa-planta.png'),
    (2, (238, 135, 762, 404), 'antes-ppt.png'),
    (2, (238, 421, 467, 537), 'antes-arquivos.png'),
    (2, (476, 421, 766, 537), 'antes-conexao.png'),
    (3, (233, 129, 751, 394), 'depois-app.png'),
    (3, (234, 406, 439, 536), 'depois-arquivo.png'),
    (3, (444, 406, 751, 536), 'depois-conexao.png'),
]


def main(pdf):
    SAIDA.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(['pdftoppm', '-png', '-r', '300', '-f', '1', '-l', '3', pdf, str(Path(tmp) / 'pg')], check=True)
        for pg, caixa, nome in RECORTES:
            im = Image.open(Path(tmp) / f'pg-{pg}.png')
            im.crop(tuple(int(v * K) for v in caixa)).save(SAIDA / nome)
            print(nome)


if __name__ == '__main__':
    main(sys.argv[1])
