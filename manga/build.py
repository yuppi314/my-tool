#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""シナリオデータ → ①シナリオ本文 ②貼るだけページプロンプト集 を生成する。

固定ブロックは spec.py から一字一句同じものを全ページへ流し込むので、
文言の揺れによる作画ドリフトが起きない。
"""
import os
import re
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import spec                      # noqa: E402
from characters import CHARACTERS, MOBS   # noqa: E402
from scenario import PAGES, CHAPTERS      # noqa: E402

OUT = os.path.join(HERE, "out")
B = spec.BOOK

BUBBLE_KIND = {
    "say": "の吹き出し",
    "mind": "の心の声の吹き出し",
    "shout": "の叫びの吹き出し（大きめ）",
    "small": "の吹き出し（小）",
}


def nm(label):
    return CHARACTERS[label]["name"] if label in CHARACTERS else label


def expand(text):
    """{HINA} のようなモブ記号を、全ページ共通の外見文言に展開する。"""
    if not text:
        return text
    return re.sub(r"\{(\w+)\}", lambda m: MOBS.get(m.group(1), m.group(0)), text)


def positions(t):
    return spec.TEMPLATES[t]["pos"]


# ─────────────────────────────────────────────
# ① シナリオ本文
# ─────────────────────────────────────────────

def build_scenario():
    o = []
    a = o.append
    a("# {}\n".format(B["title"]))
    a("## {}\n".format(B["subtitle"]))
    a("### 仕様\n")
    a("| 項目 | 内容 |")
    a("|---|---|")
    a("| 総ページ数 | {}ページ |".format(B["total_pages"]))
    a("| 章構成 | {}章＋表紙・巻末 |".format(B["chapters"]))
    a("| 1ページのコマ数 | {} |".format(B["panels_per_page"]))
    a("| カラー | **{}**（表紙のみフルカラー） |".format(B["color"]))
    a("| ページの縦横比 | **{}** |".format(B["aspect_label"]))
    a("| 製本 | {}（偶数ページが右・奇数ページが左） |".format(B["binding"]))
    a("| コマ割りテンプレ | {} |".format(B["template_set"]))
    a("")
    a("### 登場人物\n")
    a("| キャラ | 英語ラベル | 年齢 | 役どころ | 髪色 | 髪型 | 服色 |")
    a("|---|---|---|---|---|---|---|")
    for k, c in CHARACTERS.items():
        a("| {} | {} | {} | {} | {} | {} | {} |".format(
            c["name"], k, c["age"], c["role"], c["hair_color"], c["hair_style"], c["cloth_color"]))
    a("")
    a("モブ（キャラシートを作らず、全ページ同じ文言で本文に書く）\n")
    for k, v in MOBS.items():
        a("- `{}` … {}".format(k, v))
    a("")

    cur = None
    for pg in PAGES:
        if pg["ch"] != cur:
            cur = pg["ch"]
            info = CHAPTERS[cur]
            a("\n---\n")
            a("# {} {}\n".format(info["label"], info["title"]))
            a("> {}\n".format(info["summary"]))
        tpl = spec.TEMPLATES[pg["t"]]
        a("\n■ページ{}　コマ割り：テンプレ{}（{}）　― {}\n".format(
            pg["p"], pg["t"], tpl["name"], pg["head"]))
        for i, pn in enumerate(pg["panels"]):
            pos = positions(pg["t"])[i]
            a("【コマ{}】｜位置：{}".format(i + 1, pos))
            a("場面：{}".format(expand(pn["s"])))
            for ln in pn["l"]:
                a(fmt_scenario_line(ln))
            if pn["sfx"]:
                a("オノマトペ：{}".format(pn["sfx"]))
            if pn["note"]:
                a(pn["note"])
            a("")
        if pg["band"]:
            a("【帯】（枠線なしの文字帯）{}".format(pg["band"]))
            a("")
    return "\n".join(o) + "\n"


def fmt_scenario_line(ln):
    k = ln["k"]
    if k == "narr":
        return "ナレーション囲み：{}".format(ln["t"])
    if k == "box":
        return "【解説ボックス】{}：{}".format(ln["title"], ln["t"])
    side = "（{}）".format(ln["s"]) if ln["s"] else ""
    tail = {"mind": "〈心の声〉", "shout": "〈叫び〉", "small": "〈小声〉"}.get(k, "")
    return "{}{}：{}「{}」".format(nm(ln["w"]), side, tail, ln["t"])


# ─────────────────────────────────────────────
# ② 貼るだけページプロンプト集
# ─────────────────────────────────────────────

def fmt_prompt_line(ln):
    k = ln["k"]
    if k == "narr":
        return "  ナレーション: 四角いナレーション囲み（縦書き）—「{}」".format(ln["t"])
    if k == "box":
        return "  解説ボックス: 角丸の解説ボックス（縦書き・見出し「{}」）—「{}」".format(
            ln["title"], ln["t"])
    side = "・" + ln["s"] if ln["s"] else ""
    kind = BUBBLE_KIND[k]
    if k == "small":
        return "  セリフ: {}{}（縦書き{}）—「{}」".format(nm(ln["w"]), "の吹き出し", side + "・小" if side else "・小", ln["t"])
    return "  セリフ: {}{}（縦書き{}）—「{}」".format(nm(ln["w"]), kind, side, ln["t"])


def auto_prev(prev_page):
    """前ページ最終コマの状況とセリフを1行に圧縮する。"""
    if prev_page is None:
        return None
    last = prev_page["panels"][-1]
    scene = expand(last["s"])
    scene = re.split(r"[。]", scene)[0]
    quote = ""
    for ln in reversed(last["l"]):
        if ln["k"] in ("say", "shout", "small", "mind"):
            quote = "／{}「{}」".format(nm(ln["w"]), ln["t"])
            break
        if ln["k"] == "narr":
            quote = "／ナレーション「{}」".format(ln["t"])
            break
    return "{}{}".format(scene, quote)


def build_prompts():
    o = []
    a = o.append
    a("# {} ／ 貼るだけページプロンプト集（全{}ページ）\n".format(B["title"], B["total_pages"]))
    a(usage_chapter())
    a(charsheet_chapter())
    a("\n---\n\n# 3. ページプロンプト（1ページ1ブロック）\n")
    for idx, pg in enumerate(PAGES):
        a(page_block(pg, PAGES[idx - 1] if idx else None))
    a(qc_chapter())
    a(progress_chapter())
    return "\n".join(o) + "\n"


def page_block(pg, prev_page):
    tpl = spec.TEMPLATES[pg["t"]]
    cast = pg["cast"]
    sheets = ", ".join("`{}`".format(CHARACTERS[c]["sheet"]) for c in cast) if cast else "なし"
    labels = "・".join(cast) if cast else "（人物なし）"

    o = []
    a = o.append
    a("\n## ページ {}／{}　― {}\n".format(pg["p"], B["total_pages"], pg["head"]))
    a("**添付**: {} のみ（**コマ割りテンプレ画像は添付しない**）\n".format(sheets))
    a("````")
    if cast:
        a("【添付】キャラシート（{}）を参照してください。".format(labels))
    else:
        a("【添付】なし。")
    a("")
    a("◆【絶対最優先】キャラクター外見")
    if cast:
        a("添付のキャラシートと100%同一の外見で描画してください。")
        a("髪色・髪型・服装・顔立ち・体型は、私の文章よりも添付画像を優先してください。")
        for c in cast:
            a(CHARACTERS[c]["id_line"])
    else:
        a("人物は登場しません。物と背景のみを描いてください。")
    a("")
    a(spec.SIZE_BLOCK)
    a("")
    a(spec.ART_BLOCK)
    a("")
    a(spec.COLOR_BLOCK)
    a("")
    a(spec.RULE_BLOCK)
    a("")
    a("◆【コマ構成】{}".format(tpl["jp"]))
    for i, pos in enumerate(positions(pg["t"])[:len(pg["panels"])]):
        a("　コマ{}＝{}".format(i + 1, pos))
    if tpl.get("band"):
        a("　帯＝ページ下部15%。枠線なし。縦書きの日本語タイトル文字のみを置く。")
    a("")
    prev = pg["prev"] or auto_prev(prev_page)
    if prev:
        a("◆【直前ページからの接続】")
        a("前ページ最終コマ: {}".format(prev))
        a("")
    a("◆【ストーリー】")
    for i, pn in enumerate(pg["panels"]):
        pos = positions(pg["t"])[i]
        a("")
        a("コマ{}（{}）".format(i + 1, pos))
        a("  情景: {}".format(expand(pn["s"])))
        for ln in pn["l"]:
            a(fmt_prompt_line(ln))
        if pn["sfx"]:
            a("  オノマトペ: 「{}」を配置".format(pn["sfx"]))
        a("  背景: {}".format(pn["bg"]))
        if pn["note"]:
            a("  {}".format(pn["note"]))
    if pg["band"]:
        a("")
        a("帯（ページ下部15%・枠線なし）")
        a("  縦書きの日本語文字のみ: 「{}」".format(pg["band"]))
        a("  ※帯にコマ枠線を描かないこと。人物や背景も描かない。")
    a("````")
    return "\n".join(o)


def usage_chapter():
    o = []
    a = o.append
    a("\n---\n\n# 1. 使い方\n")
    a("## 3鉄則\n")
    a("| # | 鉄則 |")
    a("|---|---|")
    a("| 1 | **1ページ = 1新規チャット**（会話履歴に依存しない） |")
    a("| 2 | **毎回、指定のキャラシート画像を添付し直す**（同じファイルを使い回す） |")
    a("| 3 | **ブロックは丸ごとコピペ。書き換えない** |")
    a("")
    a("## 禁句（チェーンを作り誤差を累積させる）\n")
    a("- 「さっきのキャラで」")
    a("- 「前のページと同じタッチで」")
    a("- 「この画像の顔を直して」")
    a("")
    a("NGだったときは**修正を頼まない**。新規チャットを開き、同じキャラシート＋同じブロックで引き直す。")
    a("3回でダメならコマ数を減らすか、情景の記述を短くする。")
    a("")
    a("## 添付物の早見表\n")
    a("| ページ | 章 | テンプレ | 添付するキャラシート |")
    a("|---|---|---|---|")
    for pg in PAGES:
        sheets = " + ".join(CHARACTERS[c]["sheet"] for c in pg["cast"]) if pg["cast"] else "なし"
        a("| {} | {} | {} | {} |".format(pg["p"], CHAPTERS[pg["ch"]]["label"], pg["t"], sheets))
    a("")
    return "\n".join(o)


def charsheet_chapter():
    o = []
    a = o.append
    a("\n---\n\n# 2. STEP 0 ／ キャラシート作成プロンプト\n")
    a("**最初にこれだけを済ませる。** 出来た画像を `char_XXX.png` として保存し、")
    a("以降の全ページで同じファイルを添付し続ける。\n")
    a("## 差別化チェック表（3項目すべてに重複がないこと）\n")
    a("| キャラ | 英語ラベル | 髪色 | 髪型 | 服色 |")
    a("|---|---|---|---|---|")
    for k, c in CHARACTERS.items():
        a("| {} | {} | {} | {} | {} |".format(c["name"], k, c["hair_color"], c["hair_style"], c["cloth_color"]))
    a("")
    for k, c in CHARACTERS.items():
        a("\n### {}（{}）→ `{}`\n".format(c["name"], k, c["sheet"]))
        a("````")
        a("日本の漫画のキャラクター設定シートを1枚の画像として描いてください。")
        a("")
        a("◆【レイアウト】")
        a("左: 全身の立ち絵（正面・直立・頭から足先まで切れないこと）")
        a("右上: 顔のアップ（正面）")
        a("右下: 表情差分3種（真顔／笑顔／困り顔）を横並び")
        a("背景は白一色。文字・ラベル・枠線は一切入れない。")
        a("")
        a("◆【キャラクター】")
        a(c["look"] + "。")
        a("")
        a(spec.ART_BLOCK)
        a("")
        a(spec.COLOR_BLOCK)
        a("````")
    a("")
    a("> 2体目以降は、上のブロックをコピーして **◆【キャラクター】欄だけ** 差し替える。")
    a("")
    return "\n".join(o)


def qc_chapter():
    o = []
    a = o.append
    a("\n---\n\n# 4. 検品チェックリスト\n")
    a("## 50%ルール\n")
    a("**ほぼ別人・別物になっている時だけNG。迷ったらOK。** 厳しくしすぎると無限に描き直すことになる。\n")
    a("## 確認は10ページまとめてグリッドで\n")
    a("1枚ずつでは差に気づけない。特に次の3点はグリッドでないと検出できない。\n")
    a("- 線の太さ・影の付け方")
    a("- トーンの濃さ・階調の変化")
    a("- 頭身の揃い")
    a("")
    a("## ページ別チェック項目\n")
    a("| # | 見るところ | NGの例 |")
    a("|---|---|---|")
    a("| 1 | 読み順 | コマ1が右上から始まっていない |")
    a("| 2 | 吹き出しの縦書き | 横書きになっている |")
    a("| 3 | 吹き出しの左右 | 会話が左→右に流れている |")
    a("| 4 | 句読点 | 吹き出しの中に「、」「。」がある |")
    a("| 5 | コマ数 | 指定と違う数になっている |")
    a("| 6 | キャラの取り違え | 新藤と高橋の髪色・服色が入れ替わっている |")
    a("| 7 | 子どもの描写 | ひな・そうたの服の色・髪型が前ページと違う |")
    a("| 8 | 画面の物理 | ノートPCの天板を向けているのに画面が描かれている |")
    a("| 9 | 文字 | 看板・書類に英語のラベルが入っている |")
    a("| 10 | 背景 | 同じシーンなのに部屋が変わっている |")
    a("")
    a("## グリッド確認の追加項目\n")
    a("- [ ] 章をまたいでトーンの濃さが変わっていないか")
    a("- [ ] 新藤の眼鏡が消えたり現れたりしていないか")
    a("- [ ] 高橋の髪の明るさが後半で黒に寄っていないか")
    a("- [ ] 扉ページ（T1）の帯の位置・比率が全章で揃っているか")
    a("")
    return "\n".join(o)


def progress_chapter():
    o = []
    a = o.append
    a("\n---\n\n# 5. 進捗管理表\n")
    a("| ページ | 章 | テンプレ | 状態 | 引き直し回数 | 備考 |")
    a("|---|---|---|---|---|---|")
    for pg in PAGES:
        a("| {} | {} | {} | 未 |  |  |".format(pg["p"], CHAPTERS[pg["ch"]]["label"], pg["t"]))
    a("")
    return "\n".join(o)



# ─────────────────────────────────────────────
# ③ 構成案（データから自動生成）
# ─────────────────────────────────────────────

def build_outline():
    o = []
    a = o.append
    a("# {} ／ 構成案\n".format(B["title"]))
    a("## {}\n".format(B["subtitle"]))
    a("## 仕様（確定・変更禁止）\n")
    a("| 項目 | 内容 |")
    a("|---|---|")
    a("| 総ページ数 | {}ページ |".format(B["total_pages"]))
    a("| 章構成 | 全{}章＋巻頭・巻末 |".format(B["chapters"]))
    a("| 1ページのコマ数 | {} |".format(B["panels_per_page"]))
    a("| カラー | **{}**（本文）／表紙のみフルカラー |".format(B["color"]))
    a("| ページの縦横比 | **{}** |".format(B["aspect_label"]))
    a("| 製本 | {}（偶数ページが右・奇数ページが左） |".format(B["binding"]))
    a("| コマ割りテンプレ | {} |".format(B["template_set"]))
    a("")

    by_ch = {}
    for pg in PAGES:
        by_ch.setdefault(pg["ch"], []).append(pg)

    a("## 章構成\n")
    a("| 章 | タイトル | ページ | 枚数 | 概要 |")
    a("|---|---|---|---|---|")
    for ch in sorted(by_ch):
        pgs = by_ch[ch]
        a("| {} | {} | P{}〜P{} | {}p | {} |".format(
            CHAPTERS[ch]["label"], CHAPTERS[ch]["title"],
            pgs[0]["p"], pgs[-1]["p"], len(pgs), CHAPTERS[ch]["summary"]))
    a("")

    total = len(PAGES)
    intro = len(by_ch.get(0, [])) + len(by_ch.get(1, []))
    outro = len(by_ch.get(8, [])) + len(by_ch.get(9, []))
    body = total - intro - outro
    a("## 構成バランス\n")
    a("| 区分 | ページ | 比率 | 目安 |")
    a("|---|---|---|---|")
    a("| 導入（共感・疑問提示） | {}p | {:.0f}% | 15% |".format(intro, intro / total * 100))
    a("| 解説（メインコンテンツ） | {}p | {:.0f}% | 70% |".format(body, body / total * 100))
    a("| まとめ・アクション | {}p | {:.0f}% | 15% |".format(outro, outro / total * 100))
    a("")

    a("## テンプレ配分表（3ページ以上の連続がないことを検証済み）\n")
    counts = {}
    for pg in PAGES:
        counts[pg["t"]] = counts.get(pg["t"], 0) + 1
    a("| テンプレ | 構造 | コマ数 | 使用回数 |")
    a("|---|---|---|---|")
    for k in sorted(spec.TEMPLATES):
        t = spec.TEMPLATES[k]
        a("| {} | {} | {} | {}回 |".format(k, t["name"], len(t["pos"]), counts.get(k, 0)))
    a("")
    for ch in sorted(by_ch):
        seq = " → ".join(pg["t"] for pg in by_ch[ch])
        a("- **{}**: {}".format(CHAPTERS[ch]["label"], seq))
    a("")

    a("## ページ一覧\n")
    a("| P | 章 | テンプレ | コマ | 内容 | 登場人物 |")
    a("|---|---|---|---|---|---|")
    for pg in PAGES:
        cast = "・".join(CHARACTERS[c]["name"] for c in pg["cast"]) if pg["cast"] else "—"
        a("| {} | {} | {} | {} | {} | {} |".format(
            pg["p"], CHAPTERS[pg["ch"]]["label"], pg["t"], len(pg["panels"]), pg["head"], cast))
    a("")
    return "\n".join(o) + "\n"


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {
        "01_構成案.md": build_outline(),
        "02_シナリオ_全100ページ.md": build_scenario(),
        "03_ページプロンプト集.md": build_prompts(),
    }
    static = os.path.join(HERE, "static")
    for fn in sorted(os.listdir(static)):
        if fn.endswith(".md"):
            shutil.copy2(os.path.join(static, fn), os.path.join(OUT, fn))
            print("copied {:>36}".format(fn))
    for fn, body in files.items():
        path = os.path.join(OUT, fn)
        with open(path, "w", encoding="utf-8") as f:
            f.write(body)
        print("wrote {:>36}  {:>8,} bytes".format(fn, len(body.encode("utf-8"))))


if __name__ == "__main__":
    main()
