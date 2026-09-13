# -*- coding: utf-8 -*-
"""シナリオ記述用のヘルパー。章ファイルはこれだけを使って書く。"""


def page(p, ch, t, cast, head, panels, band=None, prev=None, spread=None):
    """1ページ分。t はテンプレ記号 T1〜T7。cast は登場キャラのラベル。"""
    return {
        "p": p, "ch": ch, "t": t, "cast": list(cast), "head": head,
        "panels": panels, "band": band, "prev": prev, "spread": spread,
    }


def pn(scene, lines=None, sfx=None, bg="", note=None):
    """1コマ分。scene に動作・表情・カメラをすべて統合して書く（ト書き行は作らない）。"""
    return {"s": scene, "l": lines or [], "sfx": sfx, "bg": bg, "note": note}


def say(who, text, side=""):
    """通常の吹き出し。side は 右／左／中央。同じコマに2つ以上あるときは必須。"""
    return {"k": "say", "w": who, "t": text, "s": side}


def mind(who, text, side=""):
    """心の声の吹き出し。"""
    return {"k": "mind", "w": who, "t": text, "s": side}


def shout(who, text, side=""):
    """叫び。大きめの吹き出し。"""
    return {"k": "shout", "w": who, "t": text, "s": side}


def small(who, text, side=""):
    """小さい吹き出し（つぶやき・相づち）。"""
    return {"k": "small", "w": who, "t": text, "s": side}


def narr(text):
    """四角いナレーション囲み。地の文なので句読点を使ってよい。"""
    return {"k": "narr", "t": text}


def box(title, text):
    """解説ボックス。地の文なので句読点を使ってよい。"""
    return {"k": "box", "title": title, "t": text}


def screen_on():
    return ("※画面はこちらを向け、画面の内容をはっきり見せること。"
            "裏面を見せながら画面内容を描くことは禁止。")


def screen_off():
    return ("※画面はこちらを向けない。天板だけが見え、画面の内容・UI・文字は一切描かないこと。"
            "裏面を見せながら画面内容を描くことは禁止。")
