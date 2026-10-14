# 9つの星あるある(カルーセル 1080x1350)
import random, sys, os
from PIL import Image, ImageDraw, ImageFont
W,H=1080,1350
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
GOLD,WHITE,SOFT=(232,200,114),(245,240,230),(200,204,222)
C=sys.argv[1]; OUT=sys.argv[2]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
STARS=[
 ('一白水星','水','人の相談にのりすぎて、\n自分のことは後回し','「大丈夫」が口ぐせ。\n本当はちょっと疲れてる','温泉やお風呂の時間が\nいちばんの幸せ'),
 ('二黒土星','土','頼まれると\n断れない','コツコツ続けるのは\n誰にも負けない','家族のごはんを\nつい多めに作っちゃう'),
 ('三碧木星','木','思い立ったら\nその日に予約完了','新しいお店は\nだいたい一番乗り','話しはじめると\n止まらない'),
 ('四緑木星','木','気づけば\n友だちの輪の真ん中','旅行の段取り係は\nいつもわたし','優柔不断で\nメニューが決まらない'),
 ('五黄土星','土','なぜか人から\n頼りにされる','「親分みたい」と\n言われたことがある','ここぞという時の\n運の強さはピカイチ'),
 ('六白金星','金','手を抜くのが\nいちばん苦手','ちょっと良いホテルに\n泊まりたくなる','人に弱みを\nなかなか見せない'),
 ('七赤金星','金','おいしいものの話で\n1時間しゃべれる','お茶に誘われたら\nだいたい断らない','場を明るくする\nムードメーカー'),
 ('八白土星','土','へそくりは\nしっかりある','いざという時、\n人生を大きく変える','山や高いところが\nなぜか好き'),
 ('九紫火星','火','おしゃれと美容への\nこだわりは強め','直感で決めたことは\nだいたい当たる','美術館や\nきれいな景色に癒される'),
]
POSES=['pose-idea','pose-cheer','pose-point-up','pose-wave','pose-cheer','pose-compass','pose-mug','pose-idea','pose-point-up']
def bg(seed):
    im=Image.new('RGB',(W,H)); d=ImageDraw.Draw(im)
    for y in range(H):
        t=y/H; d.line([(0,y),(W,y)],fill=tuple(int(a+(b-a)*t) for a,b in zip((22,34,92),(9,14,44))))
    r=random.Random(seed)
    for _ in range(200):
        x,y,s,a=r.randrange(W),r.randrange(H),r.choice([1,1,2,2,3]),r.randint(110,255); d.ellipse([x-s/2,y-s/2,x+s/2,y+s/2],fill=(a,a,int(a*.9)))
    for x,y,s in [(110,180,18),(980,140,14),(1000,700,16)]:
        d.polygon([(x,y-s),(x+s*.25,y),(x,y+s),(x-s*.25,y)],fill=GOLD); d.polygon([(x-s,y),(x,y-s*.25),(x+s,y),(x,y+s*.25)],fill=GOLD)
    return im,d
def ctr(d,y,t,size,col=WHITE,b=True,x0=0,w=W):
    ft=f(size,b)
    for i,line in enumerate(t.split('\n')):
        d.text((x0+(w-d.textlength(line,font=ft))/2,y+i*size*1.35),line,font=ft,fill=col)
def kicker(d,y,t):
    ft=f(38,False); w=d.textlength(t,font=ft)
    d.line([(W/2-w/2-30,y-10),(W/2+w/2+30,y-10)],fill=GOLD,width=2); d.text(((W-w)/2,y),t,font=ft,fill=GOLD); d.line([(W/2-w/2-30,y+58),(W/2+w/2+30,y+58)],fill=GOLD,width=2)
def chara(im,pose,wd=300):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    a=c.getchannel('A'); fade=Image.new('L',c.size,255); fd=ImageDraw.Draw(fade)
    for y in range(int(c.height*.8),c.height): fd.line([(0,y),(c.width,y)],fill=int(255*(c.height-y)/(c.height*.2)))
    c.putalpha(Image.composite(a,Image.new('L',c.size,0),fade)); im.paste(c,(W-wd-10,H-c.height),c)
def handle(d): d.text((60,H-80),'@secondlife_50s',font=f(32,False),fill=SOFT)
# 表紙
im,d=bg(1); kicker(d,150,'九星気学')
ctr(d,300,'9つの星',120,GOLD); ctr(d,460,'あるある',150)
ctr(d,700,'あなたの星は、\nいくつ当てはまる？',56,WHITE,False)
ctr(d,930,'→ 横にめくってね',40,SOFT,False)
chara(im,'pose-point-you',340); handle(d); im.save(f'{OUT}/1_表紙.jpg',quality=92)
for i,(nm,el,a1,a2,a3) in enumerate(STARS):
    im,d=bg(10+i); kicker(d,90,f'{i+1} / 9　{el}の星')
    ctr(d,190,nm+'さん',96,GOLD); ctr(d,320,'あるある',56,WHITE,False)
    y=410
    for k,t in enumerate((a1,a2,a3)):
        d.rounded_rectangle([70,y,W-70,y+190],radius=26,outline=(232,200,114),width=2,fill=(28,40,100))
        cy=y+95; d.line([(108,cy),(128,cy+22),(166,cy-24)],fill=GOLD,width=9,joint='curve')
        ft=f(48); lines=t.split('\n')
        for j,line in enumerate(lines):
            d.text((200,y+(190-len(lines)*64)/2+j*64),line,font=ft,fill=WHITE)
        y+=212
    chara(im,POSES[i],230); handle(d); im.save(f'{OUT}/{i+2}_{nm}.jpg',quality=92)
# まとめ
im,d=bg(99); kicker(d,150,'いくつ当てはまった？')
ctr(d,300,'コメントで\n教えてね',96,GOLD)
ctr(d,600,'例）「七赤金星 3つ全部！」',48,WHITE,False)
ctr(d,760,'あなたの本命星がわからない方は\nプロフィールのリンクの\n無料診断でチェックしてね',44,SOFT,False)
chara(im,'pose-cheer',320); handle(d); im.save(f'{OUT}/11_まとめ.jpg',quality=92)
