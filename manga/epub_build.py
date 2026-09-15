#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ページ画像100枚 → KDPにそのまま入稿できる固定レイアウト・右綴じEPUBを作る。

使い方:
    python3 epub_build.py --check  pages/          # 画像だけ検査する（EPUBは作らない）
    python3 epub_build.py          pages/ --cover cover.jpg

pages/ の中のファイル名は自由。ファイル名に含まれる数字でページ順に並べる。
（p001.png / 1.png / ページ01.jpg など、どれでもよい）
"""
import argparse
import datetime
import os
import re
import sys
import uuid
import zipfile

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# ─────────────────────────────────────────────
# 書誌情報（ここを直せば全体に反映される）
# ─────────────────────────────────────────────
TITLE = "漫画でわかる 離婚バイブル"
SUBTITLE = "子どもがいるママが損しないための 離婚前にやること・お金・養育費・離婚後の手続きのすべて"
# 奥付に描くときの折り返し（1行が長すぎると全体が縮んで読みにくくなるため）
SUBTITLE_LINES = """子どもがいるママが損しないための
離婚前にやること・お金・養育費・
離婚後の手続きのすべて"""
AUTHOR = "あさひ なぎさ"
PUBLISHER = "あさひ なぎさ"
LANG = "ja"
PUBDATE = "2026年9月15日"   # --pubdate で上書きできる
PAGE_W, PAGE_H = 1024, 1536
JPEG_QUALITY = 85

FRONT_PAGES = ["""本書をお読みになる前に

本書は、離婚に関する一般的な情報を、
漫画という形でわかりやすくお伝えすることを
目的とした読み物です。

・登場する人物、団体、エピソードは
　すべて架空のものです。

・本書の内容は、執筆時点で入手できる
　情報にもとづいています。法律・制度・
　金額・期限は改正されることがあります。

・記載した金額や日数は目安であり、
　個別の事情によって結果は変わります。

・本書は法律相談ではありません。
　ご自身の件については、必ず弁護士、
　司法書士、家庭裁判所の手続案内、
　お住まいの自治体の窓口など、
　専門の相談先にご確認ください。

・本書の情報を用いた行動の結果について、
　著者および発行者は責任を負いかねます。
""", """身の危険を感じている方へ

いま、暴力や暴言、つきまといなどで
身の危険を感じている場合は、
準備よりも先に、安全の確保を
優先してください。

相談は無料です。
夜間や休日に対応している窓口もあります。


　DV相談ナビ
　　　　　　　　　　＃8008

　警察相談専用電話
　　　　　　　　　　＃9110

　配偶者暴力相談支援センター
　　お住まいの地域の窓口へ


ひとりで抱えこまないでください。
"""]

COLOPHON = """{title}

{subtitle}


著者　　　{author}

発行　　　{publisher}

初版発行　{pubdate}


本書の内容の無断転載・複製を禁じます。
"""

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
]


# ─────────────────────────────────────────────
# 画像の読み込みと検査
# ─────────────────────────────────────────────

def natural_key(path):
    """ファイル名の中の最後の数字でページ順を決める。"""
    name = os.path.splitext(os.path.basename(path))[0]
    nums = re.findall(r"\d+", name)
    return (int(nums[-1]) if nums else 10 ** 9, name)


def collect_pages(src):
    exts = (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp")
    files = [os.path.join(src, f) for f in os.listdir(src)
             if f.lower().endswith(exts) and not f.startswith(".")]
    if not files:
        sys.exit("画像が1枚も見つかりません: {}".format(src))
    return sorted(files, key=natural_key)


def inspect(files, expect=None):
    """サイズ・連番・欠番を検査して、問題のリストを返す。"""
    problems, warnings, rows = [], [], []
    seen = {}
    for f in files:
        try:
            with Image.open(f) as im:
                w, h = im.size
                mode = im.mode
        except Exception as ex:
            problems.append("開けません: {} ({})".format(os.path.basename(f), ex))
            continue
        n = natural_key(f)[0]
        if n in seen:
            problems.append("ページ番号 {} が重複: {} と {}".format(
                n, os.path.basename(seen[n]), os.path.basename(f)))
        seen[n] = f
        rows.append((n, os.path.basename(f), w, h, mode))

    if not rows:
        return problems, warnings, rows

    sizes = {}
    for n, name, w, h, mode in rows:
        sizes.setdefault((w, h), []).append(n)
    if len(sizes) > 1:
        problems.append("画像サイズがそろっていません:")
        for (w, h), ns in sorted(sizes.items(), key=lambda x: -len(x[1])):
            head = ", ".join(str(x) for x in sorted(ns)[:12])
            more = " ほか" if len(ns) > 12 else ""
            problems.append("    {}×{}px … {}枚（P{}{}）".format(w, h, len(ns), head, more))
    else:
        (w, h) = list(sizes)[0]
        if (w, h) != (PAGE_W, PAGE_H):
            warnings.append("全{}枚とも {}×{}px です（想定は {}×{}px）。"
                            "縦横比が同じなら問題ありません".format(len(rows), w, h, PAGE_W, PAGE_H))
        ar = round(w / h, 4)
        if abs(ar - PAGE_W / PAGE_H) > 0.02:
            problems.append("縦横比が想定（2:3）と違います: {}×{}px".format(w, h))

    nums = sorted(seen)
    if expect and len(rows) != expect:
        problems.append("枚数が {} 枚です（想定は {} 枚）".format(len(rows), expect))
    gaps = [i for i in range(nums[0], nums[-1] + 1) if i not in seen]
    if gaps:
        problems.append("番号が飛んでいます: {}".format(
            ", ".join(str(g) for g in gaps[:20]) + (" ほか" if len(gaps) > 20 else "")))
    if nums[0] != 1:
        warnings.append("最初のページ番号が {} です（通常は1）".format(nums[0]))

    return problems, warnings, rows


# ─────────────────────────────────────────────
# テキストページを画像として描く
# ─────────────────────────────────────────────

def find_font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def render_text_page(text, out_path, size=(PAGE_W, PAGE_H)):
    """1行目を見出しとして描く。はみ出さないよう文字サイズを自動で詰める。"""
    from PIL import ImageDraw, ImageFont
    font_path = find_font()
    if not font_path:
        sys.exit("日本語フォントが見つかりません。FONT_CANDIDATES にパスを足してください。")

    W, H = size
    margin = int(W * 0.10)
    avail_h = H - margin * 2
    avail_w = W - margin * 2
    lines = text.rstrip("\n").split("\n")

    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)

    def measure(scale):
        body = max(14, int(W * 0.036 * scale))
        head = max(18, int(W * 0.052 * scale))
        f_body = ImageFont.truetype(font_path, body)
        f_head = ImageFont.truetype(font_path, head)
        h = head * 1.9 + sum(body * 1.75 if l.strip() else body * 0.9 for l in lines[1:])
        w = max([d.textlength(lines[0], font=f_head)]
                + [d.textlength(l, font=f_body) for l in lines[1:]] or [0])
        return body, head, f_body, f_head, h, w

    scale = 1.0
    while scale > 0.40:
        body, head, f_body, f_head, h, w = measure(scale)
        if h <= avail_h and w <= avail_w:
            break
        scale -= 0.03
    body, head, f_body, f_head, h, w = measure(scale)

    y = max(margin, (H - h) / 2)
    d.text((margin, y), lines[0], font=f_head, fill="black")
    y += head * 1.9
    for line in lines[1:]:
        if line.strip():
            d.text((margin, y), line, font=f_body, fill="black")
            y += body * 1.75
        else:
            y += body * 0.9
    img.save(out_path, "JPEG", quality=92, optimize=True)


# ─────────────────────────────────────────────
# EPUB の各ファイル
# ─────────────────────────────────────────────

CONTAINER = """<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>
"""

CSS = """@page { margin: 0; }
html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
body { text-align: center; background-color: #ffffff; }
div.page { margin: 0; padding: 0; width: 100%; height: 100%; }
img.full { width: 100%; height: 100%; display: block; }
"""

PAGE_XHTML = """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{lang}" lang="{lang}">
<head>
<meta charset="utf-8"/>
<title>{title}</title>
<meta name="viewport" content="width={w}, height={h}"/>
<link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
<div class="page"><img class="full" src="images/{img}" alt=""/></div>
</body>
</html>
"""


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
             .replace('"', "&quot;"))


def chapter_marks():
    """scenario.py があれば、各章の扉ページ番号から目次を作る。"""
    try:
        from scenario import PAGES, CHAPTERS
    except Exception:
        return []
    marks, seen = [], set()
    for pg in PAGES:
        if pg["ch"] in seen:
            continue
        seen.add(pg["ch"])
        info = CHAPTERS[pg["ch"]]
        if pg["ch"] == 0:
            label = "登場人物"
        elif pg["ch"] == 9:
            label = info["title"]
        else:
            label = "{} {}".format(info["label"], info["title"])
        marks.append((pg["p"], label))
    return marks


def build_opf(items, spine, cover_id, uid):
    mod = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest = "\n".join(
        '    <item id="{}" href="{}" media-type="{}"{}/>'.format(
            i["id"], i["href"], i["type"],
            ' properties="{}"'.format(i["props"]) if i.get("props") else "")
        for i in items)
    spine_items = "\n".join(
        '    <itemref idref="{}"{}/>'.format(
            s["idref"], ' properties="{}"'.format(s["props"]) if s.get("props") else "")
        for s in spine)
    return """<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="{lang}"
         unique-identifier="BookId"
         prefix="rendition: http://www.idpf.org/vocab/rendition/#">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:{uid}</dc:identifier>
    <dc:title id="t1">{title}</dc:title>
    <meta refines="#t1" property="title-type">main</meta>
    <dc:title id="t2">{subtitle}</dc:title>
    <meta refines="#t2" property="title-type">subtitle</meta>
    <dc:creator id="c1">{author}</dc:creator>
    <meta refines="#c1" property="role" scheme="marc:relators">aut</meta>
    <dc:publisher>{publisher}</dc:publisher>
    <dc:language>{lang}</dc:language>
    <meta property="dcterms:modified">{mod}</meta>

    <!-- 固定レイアウト -->
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:orientation">auto</meta>
    <meta property="rendition:spread">landscape</meta>

    <!-- Kindle 向けの指定 -->
    <meta name="cover" content="{cover_id}"/>
    <meta name="fixed-layout" content="true"/>
    <meta name="book-type" content="comic"/>
    <meta name="orientation-lock" content="none"/>
    <meta name="original-resolution" content="{w}x{h}"/>
    <meta name="primary-writing-mode" content="horizontal-rl"/>
    <meta name="region-mag" content="false"/>
  </metadata>
  <manifest>
{manifest}
  </manifest>
  <spine toc="ncx" page-progression-direction="rtl">
{spine_items}
  </spine>
</package>
""".format(lang=LANG, uid=uid, title=esc(TITLE), subtitle=esc(SUBTITLE),
           author=esc(AUTHOR), publisher=esc(PUBLISHER), mod=mod,
           cover_id=cover_id, w=PAGE_W, h=PAGE_H,
           manifest=manifest, spine_items=spine_items)


def build_nav(toc):
    lis = "\n".join('        <li><a href="{}">{}</a></li>'.format(h, esc(t)) for h, t in toc)
    return """<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="{lang}" lang="{lang}">
<head><meta charset="utf-8"/><title>目次</title></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目次</h1>
    <ol>
{lis}
    </ol>
  </nav>
</body>
</html>
""".format(lang=LANG, lis=lis)


def build_ncx(toc, uid):
    points = "\n".join(
        """    <navPoint id="np{i}" playOrder="{i}">
      <navLabel><text>{t}</text></navLabel>
      <content src="{h}"/>
    </navPoint>""".format(i=i + 1, t=esc(t), h=h) for i, (h, t) in enumerate(toc))
    return """<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="{lang}">
  <head>
    <meta name="dtb:uid" content="urn:uuid:{uid}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>{title}</text></docTitle>
  <navMap>
{points}
  </navMap>
</ncx>
""".format(lang=LANG, uid=uid, title=esc(TITLE), points=points)


# ─────────────────────────────────────────────
# 本体
# ─────────────────────────────────────────────

def to_jpeg(src, dst, quality=JPEG_QUALITY):
    with Image.open(src) as im:
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(dst, "JPEG", quality=quality, optimize=True, progressive=False)
    return os.path.getsize(dst)


def build(src, cover, out, work, expect, quality, no_frontmatter):
    files = collect_pages(src)
    problems, warnings, rows = inspect(files, expect)
    report(problems, warnings, rows)
    if problems:
        sys.exit("\n✗ 上のエラーを直してからもう一度実行してください。")

    os.makedirs(work, exist_ok=True)
    img_dir = os.path.join(work, "images")
    os.makedirs(img_dir, exist_ok=True)

    items, spine, toc = [], [], []
    total_bytes = 0

    def add_page(pid, img_name, title, props=None, in_toc=None):
        xhtml = pid + ".xhtml"
        with open(os.path.join(work, xhtml), "w", encoding="utf-8") as f:
            f.write(PAGE_XHTML.format(lang=LANG, title=esc(title), w=PAGE_W, h=PAGE_H, img=img_name))
        items.append({"id": pid, "href": xhtml, "type": "application/xhtml+xml",
                      "props": "rendition:layout-pre-paginated"})
        spine.append({"idref": pid, "props": props})
        if in_toc:
            toc.append((xhtml, in_toc))

    # 表紙
    cover_id = "cover-image"
    if cover:
        cname = "cover.jpg"
        total_bytes += to_jpeg(cover, os.path.join(img_dir, cname), 92)
        items.append({"id": cover_id, "href": "images/" + cname, "type": "image/jpeg",
                      "props": "cover-image"})
        add_page("cover", cname, "表紙", props="rendition:page-spread-center", in_toc="表紙")

    # 免責ページ（複数枚）
    if not no_frontmatter:
        for idx, body_text in enumerate(FRONT_PAGES, 1):
            iname = "front{}.jpg".format(idx)
            render_text_page(body_text, os.path.join(img_dir, iname))
            total_bytes += os.path.getsize(os.path.join(img_dir, iname))
            items.append({"id": "img-front{}".format(idx),
                          "href": "images/" + iname, "type": "image/jpeg"})
            head = body_text.lstrip().split("\n")[0]
            add_page("front{}".format(idx), iname, head,
                     in_toc=head if idx == 1 else None)

    # 本文
    marks = dict(chapter_marks())
    for f in files:
        n = natural_key(f)[0]
        pid = "p{:03d}".format(n)
        iname = pid + ".jpg"
        total_bytes += to_jpeg(f, os.path.join(img_dir, iname), quality)
        items.append({"id": "img-" + pid, "href": "images/" + iname, "type": "image/jpeg"})
        add_page(pid, iname, "{}ページ".format(n), in_toc=marks.get(n))

    # 奥付
    if not no_frontmatter:
        text = COLOPHON.format(title=TITLE, subtitle=SUBTITLE_LINES, author=AUTHOR,
                               publisher=PUBLISHER, pubdate=PUBDATE)
        render_text_page(text, os.path.join(img_dir, "colophon.jpg"))
        total_bytes += os.path.getsize(os.path.join(img_dir, "colophon.jpg"))
        items.append({"id": "img-colophon", "href": "images/colophon.jpg", "type": "image/jpeg"})
        add_page("colophon", "colophon.jpg", "奥付", in_toc="奥付")

    if not cover:
        cover_id = items[0]["id"]

    # 補助ファイル
    with open(os.path.join(work, "style.css"), "w", encoding="utf-8") as f:
        f.write(CSS)
    items.append({"id": "css", "href": "style.css", "type": "text/css"})

    uid = str(uuid.uuid4())
    with open(os.path.join(work, "nav.xhtml"), "w", encoding="utf-8") as f:
        f.write(build_nav(toc))
    items.append({"id": "nav", "href": "nav.xhtml", "type": "application/xhtml+xml", "props": "nav"})

    with open(os.path.join(work, "toc.ncx"), "w", encoding="utf-8") as f:
        f.write(build_ncx(toc, uid))
    items.append({"id": "ncx", "href": "toc.ncx", "type": "application/x-dtbncx+xml"})

    with open(os.path.join(work, "content.opf"), "w", encoding="utf-8") as f:
        f.write(build_opf(items, spine, cover_id, uid))

    # zip
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        z.writestr("META-INF/container.xml", CONTAINER, compress_type=zipfile.ZIP_DEFLATED)
        for root, _, fs in os.walk(work):
            for fn in sorted(fs):
                full = os.path.join(root, fn)
                arc = "OEBPS/" + os.path.relpath(full, work).replace(os.sep, "/")
                z.write(full, arc, compress_type=zipfile.ZIP_DEFLATED)

    size = os.path.getsize(out)
    print("\n✓ EPUBを作成しました: {}".format(out))
    print("   本文ページ  : {}枚".format(len(files)))
    print("   総ページ数  : {}（表紙・免責・奥付を含む）".format(len(spine)))
    print("   画像の合計  : {:.1f} MB".format(total_bytes / 1024 / 1024))
    print("   EPUBサイズ  : {:.1f} MB".format(size / 1024 / 1024))
    print("   綴じ方向    : 右綴じ（page-progression-direction=rtl）")
    print("   レイアウト  : 固定レイアウト（pre-paginated）")
    print("\n次にやること:")
    print("   1. Kindle Previewer で開き、ページが右→左にめくれるか確認する")
    print("   2. KDPの「原稿」にこの .epub をアップロードする")
    print("   3. 表紙は別途、1600×2560px の画像をアップロードする")


def report(problems, warnings, rows):
    print("画像: {}枚".format(len(rows)))
    if rows:
        sizes = {}
        for n, name, w, h, mode in rows:
            sizes.setdefault((w, h), 0)
            sizes[(w, h)] += 1
        for (w, h), c in sorted(sizes.items(), key=lambda x: -x[1]):
            print("   {}×{}px … {}枚".format(w, h, c))
        ns = sorted(r[0] for r in rows)
        print("   ページ番号: {} 〜 {}".format(ns[0], ns[-1]))
    for w in warnings:
        print("WARN  " + w)
    for p in problems:
        print("ERROR " + p)
    if not problems:
        print("✓ 画像の検査は問題なしです")


def main():
    ap = argparse.ArgumentParser(description="ページ画像からKDP入稿用の固定レイアウトEPUBを作る")
    ap.add_argument("src", help="ページ画像が入ったフォルダ")
    ap.add_argument("--cover", help="表紙画像（1600×2560px 推奨）")
    ap.add_argument("--out", default="out/divorce_bible.epub", help="出力するEPUBのパス")
    ap.add_argument("--work", default=None, help="作業フォルダ（省略時は一時フォルダ）")
    ap.add_argument("--expect", type=int, default=100, help="想定するページ数（既定100）")
    ap.add_argument("--quality", type=int, default=JPEG_QUALITY, help="JPEG画質（既定85）")
    ap.add_argument("--check", action="store_true", help="画像の検査だけして終わる")
    ap.add_argument("--no-frontmatter", action="store_true", help="免責ページと奥付を入れない")
    ap.add_argument("--pubdate", help="奥付に入れる初版発行日（例: 2026年10月1日）")
    ap.add_argument("--title-suffix", default="", help="仮組み版のタイトル末尾に付ける文字（例: 【第1〜5章 仮組み】）")
    a = ap.parse_args()

    global PUBDATE, TITLE
    if a.pubdate:
        PUBDATE = a.pubdate
    if a.title_suffix:
        TITLE = TITLE + a.title_suffix

    if a.check:
        files = collect_pages(a.src)
        problems, warnings, rows = inspect(files, a.expect)
        report(problems, warnings, rows)
        sys.exit(1 if problems else 0)

    work = a.work or os.path.join(HERE, ".epub_work")
    if os.path.exists(work):
        import shutil
        shutil.rmtree(work)
    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    build(a.src, a.cover, out, work, a.expect, a.quality, a.no_frontmatter)


if __name__ == "__main__":
    main()
