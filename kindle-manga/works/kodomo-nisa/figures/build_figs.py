#!/usr/bin/env python3
"""章末の図解ページを fig*.html からまとめて書き出す。

以前は1枚ずつ手でChromiumを叩いていたため、文言を直したあとに
書き出し忘れる余地があった。まとめて回せば取り違えが起きない。
"""
import glob, os, subprocess

CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    os.chdir(HERE)
    for html in sorted(glob.glob('fig0*.html')):
        png = html[:-5] + '.png'
        subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                        '--hide-scrollbars', '--window-size=1440,2560',
                        '--screenshot=' + png, html],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(png)

if __name__ == '__main__':
    main()
