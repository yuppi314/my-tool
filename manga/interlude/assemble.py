# -*- coding: utf-8 -*-
"""漫画100枚と、章末ページ16枚を1本の並びにまとめる。

    python3 assemble.py <漫画100枚のフォルダ> <章末16枚のフォルダ> <出力フォルダ>

漫画側のファイル名は p001〜p100 でも 1〜100 でも、番号順に並べば何でもよい。
出力は final/0001.png 〜 0116.png。この順番のままEPUBにすれば正しく並ぶ。
"""
import os, re, shutil, sys
from content import CHAPTERS


def numbered(folder):
    """フォルダ内の画像を、ファイル名の数字の順に並べて返す。"""
    exts = (".png", ".jpg", ".jpeg")
    found = []
    for name in os.listdir(folder):
        if not name.lower().endswith(exts):
            continue
        m = re.search(r"(\d+)", name)
        if not m:
            raise SystemExit(f"番号が読み取れないファイルがあります: {name}")
        found.append((int(m.group(1)), name))
    found.sort()
    nums = [n for n, _ in found]
    if len(set(nums)) != len(nums):
        dup = sorted({n for n in nums if nums.count(n) > 1})
        raise SystemExit(f"同じ番号のファイルが複数あります: {dup}")
    return found


def main():
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    manga_dir, inter_dir, out_dir = sys.argv[1:4]

    manga = numbered(manga_dir)
    if len(manga) != 100:
        raise SystemExit(
            f"漫画は100枚のはずが {len(manga)} 枚あります。\n"
            "引き直し前の古い画像や、扉絵のモノクロ版が残っていないか確認してください。"
        )
    nums = [n for n, _ in manga]
    missing = [n for n in range(1, 101) if n not in nums]
    if missing:
        raise SystemExit(f"番号が抜けています: {missing}")

    inter = {}
    for ch in CHAPTERS:
        for suffix, kind in (("a", "要点"), ("b", "チェック")):
            name = f"c{ch['no']}{suffix}_{kind}.png"
            path = os.path.join(inter_dir, name)
            if not os.path.exists(path):
                raise SystemExit(f"章末ページが見つかりません: {name}")
            inter.setdefault(ch["after"], []).append(path)

    os.makedirs(out_dir, exist_ok=True)
    order = []
    for n, name in manga:
        order.append(os.path.join(manga_dir, name))
        order.extend(inter.get(n, []))

    for i, src in enumerate(order, 1):
        ext = os.path.splitext(src)[1].lower()
        shutil.copy2(src, os.path.join(out_dir, f"{i:04d}{ext}"))

    print(f"{len(order)} 枚を {out_dir}/ に並べました。")
    print("章末ページが入った位置:")
    pos = 0
    for n, _ in manga:
        pos += 1
        if n in inter:
            print(f"  漫画P{n} のあと → {pos + 1:04d}・{pos + 2:04d}")
            pos += 2


if __name__ == "__main__":
    main()
