#!/usr/bin/env python3
"""manga/ の40ページを、まとめ・図解の間へ差し込んで pages/ を組み立てる。

manga/ は品質92・クロマ間引きなしの保管用。pages/ へ入れるときに
品質85・4:2:0へ落としている。元絵が941pxからの拡大で細部を持たないため
見た目は変わらず、容量は約4割減る。

KindleはEPUBの容量に応じた配信コストを70%ロイヤリティから差し引くため、
画質が変わらない範囲で小さくしておくと1冊あたりの手取りが増える。

pages/*.jpg は manga/ から作り直せるのでGitには含めていない。
原稿を差し替えたら manga/ 側を直してこれを実行する。
"""
import os
from PIL import Image

QUALITY = 85
SUBSAMPLING = 2  # 4:2:0。吹き出しの文字は黒白=輝度のみなので影響しない。

# (pages/の番号, manga/のページ番号)。章ごとに まとめ+図解 が2枚ずつ挟まる。
SLOTS = (
    [(i, i)     for i in range(1, 8)]     # 001-007 = P1-P7
    + [(i, i-2) for i in range(10, 22)]   # 010-021 = P8-P19
    + [(i, i-4) for i in range(24, 34)]   # 024-033 = P20-P29
    + [(i, i-6) for i in range(36, 42)]   # 036-041 = P30-P35
    + [(i, i-8) for i in range(44, 49)]   # 044-048 = P36-P40
)

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for slot, page in SLOTS:
        src = os.path.join(here, 'manga', 'P%02d.jpg' % page)
        if not os.path.exists(src):
            raise SystemExit('原稿がありません: %s' % src)
        Image.open(src).convert('RGB').save(
            os.path.join(here, 'pages', '%03d.jpg' % slot), 'JPEG',
            quality=QUALITY, subsampling=SUBSAMPLING,
            progressive=False, optimize=True)
    print('%d ページを配置しました。' % len(SLOTS))

if __name__ == '__main__':
    main()
