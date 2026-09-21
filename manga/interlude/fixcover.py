# -*- coding: utf-8 -*-
"""表紙の帯から句読点「、」「。」を消し、KDP用の cover.jpg を作る。

    python fixcover.py

同じフォルダの cover.png（992×1586）を読み、消した結果を
ユーザーフォルダの cover.jpg（1600×2560）として書き出す。
元の cover.png は変更しない。
"""
import os
from PIL import Image

SRC = "cover.png"
DST = os.path.join(os.path.expanduser("~"), "cover.jpg")
EXPECT = (992, 1586)
MARKS = [(776, 1294, 810, 1328),    # 読点「、」
         (878, 1416, 918, 1457)]    # 句点「。」


def pink(c):
    r, g, b = c[:3]
    return r > 150 and g < 120 and 55 < b < 180


def main():
    if not os.path.exists(SRC):
        raise SystemExit(f"{SRC} が見つかりません。作業フォルダで実行してください。")
    im = Image.open(SRC).convert("RGB")
    if im.size != EXPECT:
        raise SystemExit(
            f"cover.png の大きさが {im.size} です。{EXPECT} を想定しています。\n"
            "別の表紙ファイルの可能性があります。")
    px = im.load()
    W, _ = im.size

    def find(x, y, step, limit=40):
        for i in range(1, limit):
            nx = x + step * i
            if 0 <= nx < W and pink(px[nx, y]):
                return nx
        return None

    for x0, y0, x1, y1 in MARKS:
        pad = 3
        x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
        for y in range(y0, y1 + 1):
            lx = find(x0, y, -1)
            rx = find(x1, y, +1)
            if lx is None and rx is None:
                continue
            if lx is None:
                lx = rx
            if rx is None:
                rx = lx
            lc, rc = px[lx, y], px[rx, y]
            span = max(rx - lx, 1)
            for x in range(x0, x1 + 1):
                t = min(max((x - lx) / span, 0.0), 1.0)
                px[x, y] = tuple(round(lc[i] + (rc[i] - lc[i]) * t) for i in range(3))

    im.resize((1600, 2560), Image.LANCZOS).save(DST, "JPEG", quality=95,
                                                subsampling=0)
    print("書き出しました →", DST)
    print("  大きさ 1600×2560  サイズ", f"{os.path.getsize(DST):,}", "バイト")


if __name__ == "__main__":
    main()
