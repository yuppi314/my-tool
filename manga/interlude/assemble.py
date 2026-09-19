# -*- coding: utf-8 -*-
"""漫画100枚のあいだに、解説8枚と図解8枚を章ごとに挟み、巻末3枚をつける。

    python3 assemble.py <漫画100枚> <説明文8枚> <図解8枚> <出力先> [巻末フォルダ]

並びは 漫画(第1章) → 解説 → 図解 → 漫画(第2章) → 解説 → 図解 → … → 巻末。
どの解説・図解をどこに挟むかは、下の PLACEMENT で決める。
出力は 0001〜。この順のままEPUBにすれば正しく並ぶ。

並べ方を変えたいときは MODE を書き換える。
  "theme" … 解説の中身に合う章のうしろに置く（既定）
  "even"  … 解説n・図解n を、漫画の第n章のうしろに1組ずつ置く
"""
import os, re, shutil, sys

MODE = "theme"

# 漫画の各章の最終ページ（ここまで読んだら解説に入る）
CHAPTER_END = {1: 14, 2: 24, 3: 36, 4: 50, 5: 64, 6: 76, 7: 88, 8: 98}

# 中身で対応させる並び：{漫画の最終ページ: [そこに挟む解説・図解の番号]}
PLACEMENT = {
    14: [1],        # 第1章 まだ決めなくていい      → 離婚の入口
    24: [6],        # 第2章 離婚の入口は3つ        → 離婚の手続き
    36: [],         # 第3章 離婚前にやることリスト  → 対応する解説なし
    50: [2, 3, 4],  # 第4章 お金のすべて           → お金の基礎知識・財産分与・年金分割
    64: [],         # 第5章 養育費                 → 第6章のうしろでまとめて
    76: [5],        # 第6章 親権と面会交流         → 子どものこと
    88: [7],        # 第7章 離婚後の生活設計       → 離婚後の生活設計
    98: [8],        # 第8章 離婚を「成功」に変える → 相談先とおわりに
}

# 章番号どおりに1組ずつ置く並び
EVEN_PLACEMENT = {end: [ch] for ch, end in CHAPTER_END.items()}


def numbered(folder, label):
    """フォルダの中の画像を、ファイル名の数字の順に並べて返す。

    章ごとのサブフォルダに分かれていても、まとめて拾う。
    """
    exts = (".png", ".jpg", ".jpeg")
    found = []
    for root, _dirs, names in os.walk(folder):
        for name in sorted(names):
            if not name.lower().endswith(exts):
                continue
            m = re.search(r"(\d+)", name)
            if not m:
                raise SystemExit(f"{label}: 番号が読み取れません → {name}")
            found.append((int(m.group(1)), os.path.join(root, name)))
    found.sort()
    nums = [n for n, _ in found]
    dup = sorted({n for n in nums if nums.count(n) > 1})
    if dup:
        raise SystemExit(
            f"{label}: 同じ番号が複数あります → {dup}\n"
            "章ごとに1から振り直している場合は、通し番号に直す必要があります。"
        )
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

    prose = dict(numbered(prose_dir, "説明文"))
    figs = dict(numbered(fig_dir, "図解"))
    for label, got in (("説明文", prose), ("図解", figs)):
        if sorted(got) != list(range(1, 9)):
            raise SystemExit(
                f"{label} は1〜8の8枚必要です（いまは {sorted(got)}）。")

    placement = PLACEMENT if MODE == "theme" else EVEN_PLACEMENT
    used = sorted(n for group in placement.values() for n in group)
    if used != list(range(1, 9)):
        raise SystemExit(f"PLACEMENT が1〜8を1回ずつ使っていません: {used}")

    order, plan = [], []
    for page_no, path in manga:
        order.append(path)
        plan.append(("漫画", f"P{page_no}"))
        for n in placement.get(page_no, []):
            order.append(prose[n])
            plan.append(("解説", f"解説{n}"))
            order.append(figs[n])
            plan.append(("図解", f"図解{n}"))

    BACK_FILES = (("b1_著者紹介.png", "著者紹介"),
                  ("b2_読者特典.png", "読者特典"),
                  ("b3_著者の他の本.png", "著者の他の本"))
    back = []
    for name, label in BACK_FILES:
        path = os.path.join(back_dir, name)
        if os.path.exists(path):
            back.append((path, label))
    if back and len(back) != len(BACK_FILES):
        raise SystemExit(
            f"巻末ページは{len(BACK_FILES)}枚そろえてください（いまは {len(back)} 枚）。")
    for path, label in back:
        order.append(path)
        plan.append(("巻末", label))

    os.makedirs(out_dir, exist_ok=True)
    for i, src in enumerate(order, 1):
        shutil.copy2(src, os.path.join(out_dir,
                                       f"{i:04d}{os.path.splitext(src)[1].lower()}"))

    print(f"{len(order)} 枚を {out_dir}/ に並べました。（並べ方: {MODE}）")
    for i, (kind, label) in enumerate(plan, 1):
        if kind != "漫画":
            print(f"  {i:04d}  {label}")


if __name__ == "__main__":
    main()
