#!/usr/bin/env python3
"""扉ページ(manga/P01.jpg)を組む。

表紙と同じ絵を使うが、受付開始日の赤いバッジは載せない。
あれは店頭で手に取ってもらうための要素で、本を開いた中にあると浮く。

書名は画像生成AIに描かせず、本文と同じ1440x2560でHTMLから焼き込む。
"""
import os, subprocess
from PIL import Image

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    src = Image.open(os.path.join(HERE, '..', 'cover', 'art_src.png')).convert('RGB')
    # 9:16の絵なので、幅1440に合わせるとほぼ2560になる。切らずに全面へ敷く。
    src.resize((1440, 2560), Image.LANCZOS).save(os.path.join(HERE, 'art.png'))

    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--window-size=1440,2560',
                    '--screenshot=' + os.path.join(HERE, 'tobira_raw.png'),
                    os.path.join(HERE, 'tobira.html')], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    out = os.path.join(HERE, '..', 'manga', 'P01.jpg')
    Image.open(os.path.join(HERE, 'tobira_raw.png')).convert('RGB').save(
        out, 'JPEG', quality=92, subsampling=0, progressive=False, optimize=True)
    print('%s (%d KB)' % (out, os.path.getsize(out) // 1024))

if __name__ == '__main__':
    main()
