#!/usr/bin/env python3
"""各章の扉ページを組む。

章の変わり目に区切りが無く、前の章の図解から次の章の漫画へ
そのまま流れていた。紙の本の中扉にあたるページを入れて、
読者が「ここから新しい話」と分かるようにする。

見出しは章タイトル、下に置く一文はその章で答える問いにしてある。
章のあいだで一度立ち止まらせる役目なので、情報は載せない。
"""
import os, subprocess

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
HERE = os.path.dirname(os.path.abspath(__file__))

TPL = """<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="style.css">
<style>
body {{ padding:0; justify-content:center; align-items:center; text-align:center;
       background:{bg}; }}
.num {{ font-size:40px; letter-spacing:.34em; color:{accent}; font-weight:bold;
       margin-bottom:40px; }}
.num .big {{ display:block; font-size:150px; letter-spacing:0; line-height:1;
       margin-top:14px; }}
h1 {{ font-size:{size}px; line-height:1.45; margin:0 68px; color:#2E2A26; }}
.bar {{ width:120px; height:7px; background:{accent}; border-radius:4px; margin:56px 0 46px; }}
.lead {{ font-size:40px; line-height:1.75; color:#6B6259; margin:0 96px; }}
.pages {{ position:absolute; bottom:104px; left:0; right:0;
       font-size:30px; color:#A99F94; letter-spacing:.1em; }}
</style>
<div class="num">CHAPTER<span class="big">{n}</span></div>
<h1>{title}</h1>
<div class="bar"></div>
<div class="lead">{lead}</div>
<div class="pages">— 第{n}章 —</div>
"""

CHAPTERS = [
    (1, "うちの子の口座、<br>どうすればいいの？", 76,
     "3ヶ月ぶん放置した<br>パンフレットの話から始まります。"),
    (2, "こどもNISAって、<br>何？", 84,
     "もうかる制度ではありません。<br>税金の制度です。"),
    (3, "学資保険と、<br>どっちがいいの？", 80,
     "どちらも否定しません。<br>比べるべきは利回りではないからです。"),
    (4, "12歳の壁と、<br>18歳の贈り物", 80,
     "ほとんどの解説が書かないことを、<br>ここで書きます。"),
    (5, "10月1日、<br>まず何をする？", 80,
     "完璧に理解してから<br>始めなくて大丈夫です。"),
]

# 章ごとに地の色をわずかに変える。同じ絵が5回続くと読み飛ばされる。
TONES = [("#FAF6EF", "#C8394F"), ("#F6F3EC", "#3F6B57"), ("#FAF4EE", "#8A6A3A"),
         ("#F5F2EE", "#4A5E7A"), ("#FAF6EF", "#C8394F")]

def main():
    os.chdir(HERE)
    for (n, title, size, lead), (bg, accent) in zip(CHAPTERS, TONES):
        name = "chapter%d" % n
        open(name + ".html", "w").write(
            TPL.format(n=n, title=title, size=size, lead=lead, bg=bg, accent=accent))
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                        "--hide-scrollbars", "--window-size=1440,2560",
                        "--screenshot=%s.png" % name, "%s.html" % name],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(name + ".png")

if __name__ == "__main__":
    main()
