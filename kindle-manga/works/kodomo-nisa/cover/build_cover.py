#!/usr/bin/env python3
"""表紙 cover.jpg を入稿サイズに整える。

絵と文字は chatgpt-cover.png として外から受け取る。以前はHTMLで
文字を焼き込んでいたが、実用書らしい作り込み(切り抜き人物・筆文字の帯・
塗りのアイコン)は生成側で作ったほうが仕上がりが良かったため、
ここは受け取った1枚を規格に合わせる役だけにしている。

KDPの推奨は1600x2560のJPEG。受領画像は1:1.6で来ているので、
拡大だけで比率は変わらない。
"""
import os
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
TARGET = (1600, 2560)
SRC = 'chatgpt-cover.png'

def main():
    src = Image.open(os.path.join(HERE, SRC)).convert('RGB')
    w, h = src.size
    ratio = h / w
    # 1:1.6から大きく外れていたら、黙って引き伸ばさずに止める。
    # 表紙が歪むとストア一覧で一目で分かる。
    if abs(ratio - 1.6) > 0.02:
        raise SystemExit('縦横比が1:%.3f です。1:1.6の画像を用意してください。' % ratio)

    out = os.path.join(HERE, '..', 'cover.jpg')
    src.resize(TARGET, Image.LANCZOS).save(
        out, 'JPEG', quality=93, subsampling=0, progressive=False, optimize=True)
    print('%s  %dx%d  %d KB' % (out, *TARGET, os.path.getsize(out) // 1024))

if __name__ == '__main__':
    main()
