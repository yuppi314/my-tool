# -*- coding: utf-8 -*-
"""漫画100枚のうしろに、解説16枚と巻末2枚をつなげる。

    python3 assemble.py <漫画100枚> <説明文8枚> <図解8枚> <出力先> [巻末フォルダ]

並びは 漫画1〜100 → 第1章の説明文 → 第1章の図解 → … → 著者紹介 → 読者特典。
巻末フォルダを省くと back/ を探し、無ければ116枚で作る。
出力は 0001〜。この順のままEPUBにすれば正しく並ぶ。
"""
import os, re, shutil, sys


def numbered(folder, label):
    exts = (".png", ".jpg", ".jpeg")
    found = []
    for name in sorted(os.listdir(folder)):
        if name.lower().endswith(exts):
            m = re.search(r"(\d+)", name)
            if not m:
                raise SystemExit(f"{label}: 番号が読み取れません → {name}")
            found.append((int(m.group(1)), os.path.join(folder, name)))
    found.sort()
    nums = [n for n, _ in found]
    dup = sorted({n for n in nums if nums.count(n) > 1})
    if dup:
        raise SystemExit(f"{label}: 同じ番号が複数あります → {dup}")
    return found


def main():
    if len(sys.argv) not in (5, 6):
        raise SystemExit(__doc__)
    manga_dir, prose_dir, fig_dir, out_dir = sys.argv[1:5]
    back_dir = sys.argv[5] if len(sys.argv) == 6 else "back"

    manga = numbered(manga_dir, "漫画")
    if len(manga) != 100:
        raise SystemExit(
            f"漫画は100枚のはずが {len(manga)} 枚あります。\n"
            "引き直し前の古い画像や、扉絵のモノクロ版が残っていないか確認してください。"
        )
    missing = [n for n in range(1, 101) if n not in [x for x, _ in manga]]
    if missing:
        raise SystemExit(f"漫画の番号が抜けています: {missing}")

    prose = numbered(prose_dir, "説明文")
    figs = numbered(fig_dir, "図解")
    for label, got in (("説明文", prose), ("図解", figs)):
        if len(got) != 8:
            raise SystemExit(f"{label} は8枚のはずが {len(got)} 枚あります。")
        nums = [n for n, _ in got]
        if sorted(nums) != list(range(1, 9)):
            raise SystemExit(f"{label} の章番号が1〜8になっていません: {sorted(nums)}")

    order = [p for _, p in manga]
    for (_, p), (_, f) in zip(prose, figs):
        order += [p, f]

    back = []
    for name in ("b1_著者紹介.png", "b2_読者特典.png"):
        path = os.path.join(back_dir, name)
        if os.path.exists(path):
            back.append(path)
    if back and len(back) != 2:
        raise SystemExit(f"巻末ページは2枚そろえてください（いまは {len(back)} 枚）。")
    order += back

    os.makedirs(out_dir, exist_ok=True)
    for i, src in enumerate(order, 1):
        shutil.copy2(src, os.path.join(out_dir,
                                       f"{i:04d}{os.path.splitext(src)[1].lower()}"))

    print(f"{len(order)} 枚を {out_dir}/ に並べました。")
    print("  0001〜0100  漫画")
    n = 100
    for ch in range(1, 9):
        print(f"  {n+1:04d}・{n+2:04d}  第{ch}章 説明文・図解")
        n += 2
    if back:
        print(f"  {n+1:04d}        著者紹介")
        print(f"  {n+2:04d}        読者特典")


if __name__ == "__main__":
    main()
