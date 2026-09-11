# -*- coding: utf-8 -*-
"""章末の「まとめ文章」ページ5枚を生成する。
図解が事実と数字を担うので、こちらは読者自身への問いかけを担当する。
役割を分けないと同じことを2回言うことになる。"""
import io, os, subprocess

CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome"

PAGES = [
  dict(n=1, ch="第1章", sub="うちの子の口座、どうすればいいの？",
       head="「決められない」のは<br>あなたのせいではない",
       pts=[("選択肢が2つある以上 迷って当然",
             "学資保険もこどもNISAも、どちらも国が用意した制度です。片方が正しくて片方が間違い、という話ではありません。"),
            ("「投資が怖い」という感覚は正しい",
             "増える可能性があるものは、減る可能性もあります。その不安を消そうとしなくて大丈夫です。"),
            ("危ないのは 迷うことではない",
             "知らないまま期限が過ぎることです。決めるのは後でも、知るのは今できます。")],
       q="わが家は いつまでに決めますか"),
  dict(n=2, ch="第2章", sub="こどもNISAって、何？",
       head="NISAは<br>もうかる制度ではない",
       pts=[("NISAは「箱」の名前",
             "投資商品の名前ではありません。中で増えた分に税金がかからなくなる、入れ物の名前です。"),
            ("箱に入れただけでは増えない",
             "何を入れるかは自分で選びます。そして選んだものが育つかどうかは、誰にも保証できません。"),
            ("18年かけて育てる設計",
             "こどもNISAは短期で増やす道具ではありません。時間をかけられる人ほど向いています。")],
       q="18年後 この子にいくら渡したいですか"),
  dict(n=3, ch="第3章", sub="学資保険と、どっちがいいの？",
       head="比べるべきは<br>利回りではない",
       pts=[("「増えるか」だけで比べない",
             "先に決めるのは、守りが要るかどうかです。そこが決まらないと数字を比べても答えは出ません。"),
            ("親に万一があったとき",
             "学資保険は以後の保険料が免除され、満期金は受け取れます。こどもNISAにこの仕組みはありません。"),
            ("両方持つ選択もある",
             "どちらか一方に全額入れる必要はありません。役割で分けている家庭も普通にあります。")],
       q="わが家に必要なのは<br>守りですか 増やすことですか"),
  dict(n=4, ch="第4章", sub="12歳の壁と、18歳の贈り物",
       head="お金に<br>使う時期の名札をつける",
       pts=[("12歳まで引き出せない",
             "中学受験を考えているなら、その費用は別の場所に置く必要があります。ここが最大の注意点です。"),
            ("大学費用とは相性がいい",
             "18年後に使うお金なら、途中で引き出せないことは、むしろ守りになります。"),
            ("口座は子ども名義",
             "親が自由に使えるお金ではありません。渡す前提のお金として扱ってください。")],
       q="このお金は 何歳のときに使うお金ですか"),
  dict(n=5, ch="第5章", sub="10月1日、まず何をする？",
       head="完璧に理解してから<br>始めなくていい",
       pts=[("口座を開くだけならお金はかからない",
             "開設してから考えても遅くありません。まず器を用意する、で十分です。"),
            ("金額は後から変えられる",
             "月1万円で始めて、慣れてから増やせます。最初から上限を狙う必要はありません。"),
            ("生活費を削ってまではやらない",
             "値下がりした年に耐えられなくなります。続けられる金額であることが、何より大事です。")],
       q="来月 最初のひとつは何をしますか"),
]

TPL = """<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="style.css"><style>
body{{padding:104px 84px;}}
.bar{{width:100%;height:10px;background:#1F7A6B;border-radius:6px;margin-bottom:44px;}}
.ch{{font-size:36px;color:#8A7F72;letter-spacing:.08em;}}
.sub{{font-size:38px;color:#8A7F72;margin-top:10px;}}
h1{{font-size:84px;line-height:1.32;margin-top:36px;}}
.pts{{margin-top:88px;}}
.pt{{display:flex;gap:34px;padding-bottom:46px;margin-bottom:46px;border-bottom:3px solid #E7DED0;}}
.pt:last-child{{border-bottom:none;}}
.no{{width:80px;height:80px;flex:none;border-radius:50%;background:#2E2A26;color:#fff;
    font-size:42px;display:flex;align-items:center;justify-content:center;margin-top:4px;}}
.tx .t{{font-size:60px;line-height:1.38;}}
.tx .d{{font-size:44px;line-height:1.62;color:#5C544C;margin-top:18px;}}
.q{{margin-top:auto;background:#1F7A6B;color:#fff;border-radius:24px;padding:56px 56px;}}
.q .lb{{font-size:34px;color:#A9D5CC;letter-spacing:.06em;}}
.q .t{{font-size:58px;line-height:1.4;margin-top:20px;}}
</style></head><body>
<div class="bar"></div>
<div class="ch">{ch} まとめ</div>
<div class="sub">{sub}</div>
<h1>{head}</h1>
<div class="pts">{pts}</div>
<div class="q"><div class="lb">あなたの場合は</div><div class="t">{q}</div></div>
<div class="page">— まとめ {n} —</div>
</body></html>
"""

for p in PAGES:
    pts = "".join(
        f'<div class="pt"><div class="no">{i+1}</div>'
        f'<div class="tx"><div class="t">{t}</div><div class="d">{d}</div></div></div>'
        for i, (t, d) in enumerate(p["pts"]))
    html = TPL.format(ch=p['ch'], sub=p['sub'], head=p['head'], q=p['q'], n=p['n'], pts=pts)
    name = f"matome{p['n']:02d}"
    io.open(f"{name}.html", "w", encoding="utf-8").write(html)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
                    "--window-size=1440,2560", f"--screenshot={name}.png",
                    f"file://{os.path.abspath(name)}.html"],
                   stderr=subprocess.DEVNULL, check=True)
    print(name, "生成")
