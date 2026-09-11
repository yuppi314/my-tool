#!/usr/bin/env python3
"""表紙 cover.jpg を組む。

文字は画像生成AIに描かせず、HTMLで組んでChromiumで焼き込む。
書名の輪郭が保たれ、ストアのサムネイル幅(約150px)でも読める。
また、本文と矛盾する売り文句が混ざらないよう、文言をこちらで管理できる。

cover.html は art_src.png を直接読む。切り抜きはCSSのグラデーションで
左端を白へ溶かして代用しており、絵の差し替えは art_src.png の置換だけで済む。
"""
import os, subprocess
from PIL import Image

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--window-size=1600,2560',
                    '--screenshot=' + os.path.join(HERE, 'cover_raw.png'),
                    os.path.join(HERE, 'cover.html')], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    out = os.path.join(HERE, '..', 'cover.jpg')
    im = Image.open(os.path.join(HERE, 'cover_raw.png')).convert('RGB')
    assert im.size == (1600, 2560), im.size
    im.save(out, 'JPEG', quality=93, subsampling=0, progressive=False, optimize=True)
    print('%s (%d KB)' % (out, os.path.getsize(out) // 1024))

if __name__ == '__main__':
    main()
