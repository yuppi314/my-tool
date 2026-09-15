#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ページ画像のフォルダを、送れるサイズのZIPに自動で分割する。

使い方:
    python3 prep_upload.py pages                 # 20MBごとにZIPへ分割
    python3 prep_upload.py pages --jpeg          # JPEGに変換してから分割（推奨・1本に収まる）
    python3 prep_upload.py pages --max-mb 15     # 1本あたりの上限を変える

出力は pages/_upload/ の中に pack1.zip, pack2.zip … として並ぶ。
ファイル名に含まれる数字でページ順に並べてから詰めるので、
pack1 が若いページ、pack2 が後ろのページになる。
"""
import argparse
import os
import re
import shutil
import sys
import zipfile

EXTS = (".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp")


def page_no(path):
    nums = re.findall(r"\d+", os.path.splitext(os.path.basename(path))[0])
    return int(nums[-1]) if nums else 10 ** 9


def to_jpeg(src, dst, quality):
    from PIL import Image
    with Image.open(src) as im:
        if im.mode not in ("RGB", "L"):
            im = im.convert("RGB")
        im.save(dst, "JPEG", quality=quality, optimize=True)


def main():
    ap = argparse.ArgumentParser(description="ページ画像を送れるサイズのZIPに分割する")
    ap.add_argument("src", help="ページ画像が入ったフォルダ")
    ap.add_argument("--max-mb", type=float, default=20.0, help="ZIP1本あたりの上限MB（既定20）")
    ap.add_argument("--jpeg", action="store_true", help="JPEGに変換してから詰める（容量が1/6ほどになる）")
    ap.add_argument("--quality", type=int, default=90, help="JPEGの画質（既定90）")
    a = ap.parse_args()

    files = sorted([os.path.join(a.src, f) for f in os.listdir(a.src)
                    if f.lower().endswith(EXTS) and not f.startswith(".")], key=page_no)
    if not files:
        sys.exit("画像が見つかりません: {}".format(a.src))

    out = os.path.join(a.src, "_upload")
    if os.path.exists(out):
        shutil.rmtree(out)
    os.makedirs(out)

    # JPEG変換（必要なら）
    work = files
    if a.jpeg:
        tmp = os.path.join(out, "_jpg")
        os.makedirs(tmp)
        work = []
        for f in files:
            dst = os.path.join(tmp, "p{:03d}.jpg".format(page_no(f)))
            to_jpeg(f, dst, a.quality)
            work.append(dst)
        before = sum(os.path.getsize(f) for f in files)
        after = sum(os.path.getsize(f) for f in work)
        print("JPEG変換: {:.1f}MB → {:.1f}MB（{:.0f}%に圧縮）".format(
            before / 1048576, after / 1048576, after / before * 100))

    cap = a.max_mb * 1048576
    packs, cur, cur_size = [], [], 0
    for f in work:
        sz = os.path.getsize(f)
        if cur and cur_size + sz > cap:
            packs.append(cur)
            cur, cur_size = [], 0
        cur.append(f)
        cur_size += sz
    if cur:
        packs.append(cur)

    print()
    for i, pack in enumerate(packs, 1):
        path = os.path.join(out, "pack{}.zip".format(i))
        with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
            for f in pack:
                z.write(f, os.path.basename(f))
        pages = [page_no(f) for f in pack]
        print("pack{}.zip  {:>5.1f}MB  {:>2}枚  P{}〜P{}".format(
            i, os.path.getsize(path) / 1048576, len(pack), min(pages), max(pages)))

    if a.jpeg:
        shutil.rmtree(os.path.join(out, "_jpg"))
    print("\n出力先: {}".format(out))
    print("この中の pack*.zip を、順番にチャットへ添付してください。")


if __name__ == "__main__":
    main()
