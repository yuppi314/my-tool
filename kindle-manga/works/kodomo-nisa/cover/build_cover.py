#!/usr/bin/env python3
"""扉ページ(P01)の絵から表紙 cover.jpg を作る。

タイトル文字は画像生成AIに描かせず、HTMLで組んでChromiumで焼き込む。
ストアのサムネイルは幅150px程度まで縮むため、書名を大きく取っている。
"""
import os, subprocess
from PIL import Image

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))
BAND_TOP = 1910   # 扉の濃紺タイトル帯が始まるy座標。ここから上だけを絵として使う。

def main():
    src = Image.open(os.path.join(HERE, '..', 'manga', 'P01.jpg')).convert('RGB')
    art = src.crop((0, 0, 1440, BAND_TOP)).resize((1600, 2122), Image.LANCZOS)
    # 学資保険のパンフレットが下端のグラデーションに沈まない位置まで上を詰める
    art.crop((0, 322, 1600, 2122)).save(os.path.join(HERE, 'art.png'))

    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--window-size=1600,2560',
                    '--screenshot=' + os.path.join(HERE, 'cover_raw.png'),
                    os.path.join(HERE, 'cover.html')], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    out = os.path.join(HERE, '..', 'cover.jpg')
    Image.open(os.path.join(HERE, 'cover_raw.png')).convert('RGB').save(
        out, 'JPEG', quality=93, subsampling=0, progressive=False, optimize=True)
    print('%s (%d KB)' % (out, os.path.getsize(out) // 1024))

if __name__ == '__main__':
    main()
