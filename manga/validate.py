#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""manga-scenario / manga-page-prompts の MANDATORY ルールを機械的に検査する。"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import spec                                      # noqa: E402
from characters import CHARACTERS, MOBS, DIFF_KEYS   # noqa: E402
from scenario import PAGES, CHAPTERS             # noqa: E402

BUBBLES = ("say", "mind", "shout", "small")
ERR = []
WARN = []


def e(msg):
    ERR.append(msg)


def w(msg):
    WARN.append(msg)


def check_characters():
    for key in DIFF_KEYS:
        seen = {}
        for label, c in CHARACTERS.items():
            seen.setdefault(c[key], []).append(label)
        for val, who in seen.items():
            if len(who) > 1:
                e("[キャラ差別化] {} が重複: {} → {}".format(key, val, "・".join(who)))


def check_pages():
    nums = [p["p"] for p in PAGES]
    if nums != list(range(1, spec.BOOK["total_pages"] + 1)):
        e("[ページ番号] 1〜{}の連番になっていない（実際 {}ページ）".format(
            spec.BOOK["total_pages"], len(nums)))

    run_t, run_n = None, 0
    for pg in PAGES:
        tag = "P{}".format(pg["p"])

        if pg["t"] not in spec.TEMPLATES:
            e("{} 未知のテンプレ {}".format(tag, pg["t"]))
            continue
        tpl = spec.TEMPLATES[pg["t"]]

        # コマ数とテンプレの整合
        if len(pg["panels"]) != len(tpl["pos"]):
            e("{} コマ数不一致: {} は{}コマだが{}コマ書かれている".format(
                tag, pg["t"], len(tpl["pos"]), len(pg["panels"])))

        # 2:3 の上限（本文は最大5コマ）
        if len(pg["panels"]) > 5:
            e("{} 2:3判型の上限5コマを超えている".format(tag))

        # テンプレ3連続
        if pg["t"] == run_t:
            run_n += 1
            if run_n >= 3:
                e("{} 同じテンプレ {} が3ページ以上連続".format(tag, pg["t"]))
        else:
            run_t, run_n = pg["t"], 1

        # 見開きは偶数ページ始まり（右綴じ）
        if pg.get("spread") == "start" and pg["p"] % 2 != 0:
            e("{} 見開きの開始が奇数ページになっている（右綴じでは偶数ページ始まり）".format(tag))

        # キャスト
        for c in pg["cast"]:
            if c not in CHARACTERS:
                e("{} 未知のキャララベル {}".format(tag, c))

        if not pg["head"]:
            e("{} head（ページ見出し）が空".format(tag))

        for i, pn in enumerate(pg["panels"], 1):
            ptag = "{}/コマ{}".format(tag, i)

            if not pn["bg"]:
                e("{} 背景の指定がない".format(ptag))
            if not pn["s"]:
                e("{} 場面が空".format(ptag))
            if "ト書き" in pn["s"]:
                e("{} 場面に「ト書き」が混入している".format(ptag))

            # モブ記号の解決
            for m in re.findall(r"\{(\w+)\}", pn["s"]):
                if m not in MOBS:
                    e("{} 未定義のモブ記号 {{{}}}".format(ptag, m))

            bubbles = [l for l in pn["l"] if l["k"] in BUBBLES]

            # 句読点
            for b in bubbles:
                if "、" in b["t"] or "。" in b["t"]:
                    e("{} 吹き出しに句読点: 「{}」".format(ptag, b["t"]))
                if len(b["t"]) > 25:
                    e("{} 吹き出しが25文字超（{}字）: 「{}」".format(ptag, len(b["t"]), b["t"]))
                if b["w"] not in CHARACTERS:
                    e("{} 吹き出しの話者 {} がキャラ定義にない".format(ptag, b["w"]))
                if b["w"] not in pg["cast"]:
                    e("{} 話者 {} がこのページのcastに入っていない".format(ptag, b["w"]))

            total = sum(len(b["t"]) for b in bubbles)
            if total > 60:
                e("{} セリフ合計が60文字超（{}字）".format(ptag, total))

            # 左右の明記
            if len(bubbles) >= 2:
                missing = [b["t"] for b in bubbles if not b["s"]]
                if missing:
                    e("{} 吹き出しが{}個あるのに左右未指定: {}".format(
                        ptag, len(bubbles), " / ".join("「{}」".format(x) for x in missing)))
                sides = [b["s"] for b in bubbles if b["s"]]
                if len(set(sides)) != len(sides):
                    e("{} 吹き出しの位置が重複: {}".format(ptag, sides))

        # 1ページあたりの吹き出し数 2〜6
        nb = sum(len([l for l in pn["l"] if l["k"] in BUBBLES]) for pn in pg["panels"])
        if nb < 2 and pg["t"] != "T1":
            w("{} 吹き出しが{}個しかない（目安2〜6）".format(tag, nb))
        if nb > 6:
            w("{} 吹き出しが{}個ある（目安2〜6）".format(tag, nb))


def check_balance():
    """導入15% / 解説70% / まとめ15% のバランス。"""
    total = len(PAGES)
    by_ch = {}
    for pg in PAGES:
        by_ch[pg["ch"]] = by_ch.get(pg["ch"], 0) + 1
    intro = by_ch.get(0, 0) + by_ch.get(1, 0)
    outro = by_ch.get(8, 0) + by_ch.get(9, 0)
    body = total - intro - outro
    print("  構成バランス: 導入{}p ({:.0f}%) / 解説{}p ({:.0f}%) / まとめ{}p ({:.0f}%)".format(
        intro, intro / total * 100, body, body / total * 100, outro, outro / total * 100))


def check_templates_distribution():
    counts = {}
    for pg in PAGES:
        counts[pg["t"]] = counts.get(pg["t"], 0) + 1
    print("  テンプレ配分: " + " / ".join(
        "{}={}".format(k, counts.get(k, 0)) for k in sorted(spec.TEMPLATES)))


def main():
    check_characters()
    check_pages()
    print("検査対象: {}ページ / {}章".format(len(PAGES), len(CHAPTERS) - 2))
    check_balance()
    check_templates_distribution()
    print()
    for m in WARN:
        print("WARN  " + m)
    if ERR:
        print()
        for m in ERR:
            print("ERROR " + m)
        print("\n✗ エラー {} 件 / 警告 {} 件".format(len(ERR), len(WARN)))
        return 1
    print("\n✓ エラーなし（警告 {} 件）".format(len(WARN)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
