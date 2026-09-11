#!/usr/bin/env python3
"""「はじめに」「おわりに」を組む。本文と同じ1440x2560。

はじめには試し読み(冒頭約10%)に入る。買うかどうかを決める人が
最初に読む文章なので、この本がすること/しないことを先に明示している。
"""
import os, subprocess

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"
HERE = os.path.dirname(os.path.abspath(__file__))

TPL = """<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="style.css">
<style>
body {{ padding:110px 92px; }}
.lead {{ font-size:54px; line-height:1.8; margin-bottom:52px; }}
.lead .em {{ font-weight:bold; }}
.cols {{ display:flex; gap:34px; margin:10px 0 44px; }}
.col {{ flex:1; border-radius:22px; padding:40px 38px; }}
.col.do {{ background:#EAF1E6; border:4px solid #7C9A6B; }}
.col.dont {{ background:#F3EDE4; border:4px solid #B9A78C; }}
.col h2 {{ font-size:46px; margin-bottom:22px; }}
.col.do h2 {{ color:#4F6B41; }}
.col.dont h2 {{ color:#8A7550; }}
.col li {{ font-size:36px; line-height:1.5; list-style:none; margin-bottom:18px;
  padding-left:40px; position:relative; }}
.col li::before {{ position:absolute; left:0; top:0; font-weight:bold; }}
.col.do li::before {{ content:"○"; color:#4F6B41; }}
.col.dont li::before {{ content:"×"; color:#B06A4A; }}
.sign {{ text-align:right; font-size:42px; color:#6B6259; margin-top:auto; }}
</style>
<div class="eyebrow">{eyebrow}</div>
<h1>{head}</h1>
<div class="rule"></div>
{body}
<div class="page">— {foot} —</div>
"""

HAJIME_BODY = """
<div class="lead">
学資保険のパンフレットを、<br>
もらったまま置いていませんか。<br><br>
2027年1月、0歳から使える<span class="em">こどもNISA</span>が始まります。<br>
口座開設の受付は、<span class="em">2026年10月1日</span>から。
</div>
<div class="cols">
  <div class="col do">
    <h2>この本がすること</h2>
    <ul>
      <li>制度の中身を正確に説明する</li>
      <li>学資保険との違いを並べる</li>
      <li>12歳まで引き出せない<br>壁も書く</li>
    </ul>
  </div>
  <div class="col dont">
    <h2>この本がしないこと</h2>
    <ul>
      <li>こどもNISAをすすめる</li>
      <li>学資保険を否定する</li>
      <li>特定の金融商品を<br>すすめる</li>
    </ul>
  </div>
</div>
<div class="lead">
ほとんどの解説が書かないことを、この本は書きます。<br>
こどもNISAのお金は、<span class="em">12歳まで1円も引き出せません</span>。<br>
中学受験の費用には、使えないということです。
</div>
<div class="foot">
  <div class="big">決めるのは、あなたです。</div>
  <div class="sub">この本は、そのための材料を置くだけです。
  32歳のワーママ・かなと一緒に、40ページの漫画で見ていきましょう。</div>
</div>
"""

OWARI_BODY = """
<div class="lead">
ここまで読んでくださって、ありがとうございました。<br><br>
書きながら、ずっと決めていたことがあります。<br>
<span class="em">「こどもNISAをやりましょう」とは書かない</span>。<br>
それだけは、最初から決めていました。<br><br>
制度は器です。あなたの家計と、性格と、<br>
お子さんの年齢によって、答えは変わります。
</div>
<div class="lead">
かなも、最後まで決めていません。<br>
決めたのは<span class="em">「10月1日に口座を開いてみる」</span>までです。<br>
それで十分だと思います。<br><br>
迷ったままでも、器だけ先に用意しておく。<br>
そういう選び方もあると、知ってもらえたなら嬉しいです。
</div>
<div class="foot">
  <div class="big">増えない年は、必ず来ます。</div>
  <div class="sub">投資には元本割れの可能性があります。
  それを知ったうえで選べたなら、この本の役目は終わりです。</div>
</div>
<div class="sign">あさひ なぎさ</div>
"""

PAGES = [
    ("hajimeni", "はじめに", "うちの子の口座、<br>どうすればいいの？", HAJIME_BODY, "はじめに"),
    ("owarini",  "おわりに", "決めるのは、<br>あなたです。",              OWARI_BODY,  "おわりに"),
]

def main():
    os.chdir(HERE)
    for name, eyebrow, head, body, foot in PAGES:
        open(name + ".html", "w").write(
            TPL.format(eyebrow=eyebrow, head=head, body=body, foot=foot))
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox",
                        "--hide-scrollbars", "--window-size=1440,2560",
                        "--screenshot=%s.png" % name, "%s.html" % name],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(name + ".png")

if __name__ == "__main__":
    main()
