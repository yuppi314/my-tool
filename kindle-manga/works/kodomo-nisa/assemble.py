#!/usr/bin/env python3
"""pages/ を manga/ と figures/ から組み立てる。

pages/ は中身をすべて他所から作れるので、Gitには入れていない。
以前は図解とまとめのPNGだけ pages/ に直接置いていたが、
本文の前後にページを足すたびに手で番号を振り直す必要があり、
ずれを生みやすかったので、並びの定義をこのファイル一箇所に集約した。

漫画は品質92で manga/ に保管し、pages/ へ入れるときに85・4:2:0へ落とす。
元絵が941pxからの拡大で細部を持たないため見た目は変わらず、容量は約4割減る。
Kindleは配信コストを容量に応じてロイヤリティから差し引くので、
画質が変わらない範囲の削減はそのまま1冊あたりの手取りになる。
"""
import os
from PIL import Image

QUALITY = 85
SUBSAMPLING = 2  # 4:2:0。吹き出しの文字は黒白=輝度のみなので影響しない。

# 本の並び。('manga', n) は manga/P{n}.jpg、('fig', 名前) は figures/{名前}.png。
LAYOUT = (
    # 扉ページ(manga P1)は入れない。表紙と書名も著者名も絵柄も重なり、
    # 読者には表紙が2回出たように見える。冒頭10%の試し読みは6ページ程度しか
    # 表示されないため、情報の重複に1ページ使うと漫画が1枚も届かなくなる。
    [('text', 'hajimeni'), ('fig', 'fig01-jinbutsu')]
    # 各章は扉で始める。前の章の図解から次の章の漫画へそのまま流れると、
    # 読者に章が変わったことが伝わらない。
    + [('fig', 'chapter1')] + [('manga', n) for n in range(2, 8)]
    + [('fig', 'matome01')]
    + [('fig', 'chapter2')] + [('manga', n) for n in range(8, 20)]
    + [('fig', 'matome02'), ('fig', 'fig02-hayawakari')]
    + [('fig', 'chapter3')] + [('manga', n) for n in range(20, 30)]
    + [('fig', 'matome03'), ('fig', 'fig03-hikaku')]
    + [('fig', 'chapter4')] + [('manga', n) for n in range(30, 36)]
    + [('fig', 'matome04'), ('fig', 'fig04-timeline')]
    + [('fig', 'chapter5')] + [('manga', n) for n in range(36, 41)]
    + [('fig', 'matome05'), ('fig', 'fig05-checklist')]
    + [('text', 'owarini'), ('fig', 'fig06-kanmatsu'), ('tokuten', 'tokuten')]
)

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, 'pages')
    os.makedirs(out, exist_ok=True)
    for f in os.listdir(out):
        os.remove(os.path.join(out, f))

    for slot, (kind, key) in enumerate(LAYOUT, start=1):
        if kind == 'manga':
            src = os.path.join(here, 'manga', 'P%02d.jpg' % key)
            dst = os.path.join(out, '%03d.jpg' % slot)
            if not os.path.exists(src):
                raise SystemExit('原稿がありません: %s' % src)
            Image.open(src).convert('RGB').save(
                dst, 'JPEG', quality=QUALITY, subsampling=SUBSAMPLING,
                progressive=False, optimize=True)
        else:
            folder = 'tokuten' if kind == 'tokuten' else 'figures'
            src = os.path.join(here, folder, '%s.png' % key)
            if not os.path.exists(src):
                raise SystemExit('図版がありません: %s' % src)
            Image.open(src).save(os.path.join(out, '%03d.png' % slot))

    print('%d ページを配置しました。' % len(LAYOUT))

if __name__ == '__main__':
    main()
