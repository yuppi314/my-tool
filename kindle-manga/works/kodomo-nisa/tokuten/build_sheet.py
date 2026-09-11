#!/usr/bin/env python3
"""読者特典「教育費 使う時期 仕分けシート」を組む。

本の図解5が「10月1日にやること3つ」を既に扱っているため、
特典を手順の焼き直しにすると「本と同じ」と受け取られる。
まとめ4で説明した考え方を、実際に書き込める道具にしてある。
本が考え方を教え、特典が手を動かす、で役割が重ならない。

LINEはPDFを直接送れないので、チャットにそのまま出せる
1080x1920のPNGにしている。
"""
import os, subprocess

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    os.chdir(HERE)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--hide-scrollbars', '--window-size=1080,1920',
                    '--screenshot=sheet.png', 'sheet.html'],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print('sheet.png')

if __name__ == '__main__':
    main()
