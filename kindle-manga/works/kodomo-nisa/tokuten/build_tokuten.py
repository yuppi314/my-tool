#!/usr/bin/env python3
"""読者特典ページ(本の最終ページ)を組む。

固定レイアウトの本文は画像なので、URLを書いてもタップできない。
QRコードと、打ち込める短いURLの両方を載せている。

本の焼き直しを特典にすると「中身と同じ」と受け取られるため、
まとめ4の考え方を書き込める形にしたシートを渡す設計にしてある。
届くものを3つに限定し、商品のすすめと個別相談を行わないことを
このページにも明記している。本文の免責と食い違わせないため。
"""
import os, subprocess
import qrcode
from qrcode.constants import ERROR_CORRECT_Q
from PIL import Image

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))
URL = 'https://lin.ee/SARJZzZ'

def main():
    os.chdir(HERE)
    # Kindleの画面越しに読み取るため、誤り訂正は高めにする
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, box_size=20, border=3)
    qr.add_data(URL)
    qr.make(fit=True)
    qr.make_image(fill_color='#2E2A26', back_color='white').convert('RGB') \
      .resize((620, 620), Image.LANCZOS).save('qr.png')

    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--window-size=1440,2560',
                    '--screenshot=tokuten.png', 'tokuten.html'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('tokuten.png')

if __name__ == '__main__':
    main()
