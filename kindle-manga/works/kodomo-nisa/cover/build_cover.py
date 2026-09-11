#!/usr/bin/env python3
"""表紙 cover.jpg を組む。

絵(art_src.png)は表紙専用に生成したもの。文字は画像生成AIに描かせず、
HTMLで組んでChromiumで焼き込む。書名の輪郭が保たれ、ストアの
サムネイル幅(約150px)でも読める。

赤いバッジが「10月1日 受付開始」という急ぎの理由を担当し、
絵は「読み終えたあとの状態」を担当する、という分担にしている。
"""
import os, subprocess
from PIL import Image

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    src = Image.open(os.path.join(HERE, 'art_src.png')).convert('RGB')
    # 幅1600に合わせて拡大し、顔が上3分の1に来る位置で1600x1800を切り出す
    w, h = src.size
    scaled = src.resize((1600, round(h * 1600 / w)), Image.LANCZOS)
    scaled.crop((0, 40, 1600, 1840)).save(os.path.join(HERE, 'art.png'))

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
