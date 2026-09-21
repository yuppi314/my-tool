# -*- coding: utf-8 -*-
"""図解の左上の黒帯の中の文字「第◯章」を「解説」に差し替える。

帯の形（リボンの切り欠きを含む）はそのまま残し、中を塗りつぶしてから
文字を描き直す。

    python3 rebanner.py <入力> <出力>
"""
import sys
from collections import deque
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf"
AREA = (0, 0, 208, 196)          # 帯だけを含む作業範囲（右のタイトルに掛からないこと）
SEEDS = ((3, 3), (204, 3), (3, 192), (104, 192), (204, 192))
LIGHT = 150                      # これ以上明るければ「外の余白」とみなす


def main():
    src, dst = sys.argv[1], sys.argv[2]
    img = Image.open(src).convert("RGB")
    g = img.convert("L").load()
    x0, y0, x1, y1 = AREA

    # 帯の外側（ページの余白）を塗り広げて特定する
    outside = set()
    q = deque()
    for s in SEEDS:
        if g[s] >= LIGHT:
            outside.add(s)
            q.append(s)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if x0 <= nx < x1 and y0 <= ny < y1 and (nx, ny) not in outside \
                    and g[nx, ny] >= LIGHT:
                outside.add((nx, ny))
                q.append((nx, ny))

    # 外側でない画素＝帯の内部。黒で塗りつぶす
    px = img.load()
    ys = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            if (x, y) not in outside:
                px[x, y] = (26, 26, 26)
                ys.append((x, y))
    if not ys:
        raise SystemExit("帯が見つかりませんでした: " + src)
    bx0 = min(p[0] for p in ys); bx1 = max(p[0] for p in ys)
    by0 = min(p[1] for p in ys); by1 = max(p[1] for p in ys)

    # 切り欠きを避け、帯の上寄りに文字を置く
    d = ImageDraw.Draw(img)
    text = "解説"
    size = 74
    f = ImageFont.truetype(FONT, size)
    while d.textlength(text, font=f) > (bx1 - bx0) * 0.74:
        size -= 2
        f = ImageFont.truetype(FONT, size)
    tw = d.textlength(text, font=f)
    cx = (bx0 + bx1) / 2
    cy = by0 + (by1 - by0) * 0.40
    d.text((cx - tw / 2, cy - size * 0.62), text, font=f,
           fill=(255, 255, 255), stroke_width=2, stroke_fill=(255, 255, 255))

    img.save(dst)
    print("書き出しました →", dst, " 帯:", (bx0, by0, bx1, by1))


if __name__ == "__main__":
    main()
