# 「行きたい旅が凶方位だったら？」湯西川リール(本人の旅の写真 + 昼の空テーマの文字)
# 使い方: python3 reel.py <素材フォルダ> <character/v2> <backgrounds> <出力フォルダ> <ffmpeg>
import os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps, ImageEnhance
W,H=1080,1920; FPS=30
F8='/root/.cache/night-reel-fonts/ShipporiMinchoB1-800.ttf'; F5='/root/.cache/night-reel-fonts/ShipporiMinchoB1-500.ttf'
NAVY=(27,42,90); ORG=(232,108,52); WHT=(255,255,255); SOFT=(70,90,125)
SRC,C,BG,OUT,FF=sys.argv[1:6]
f=lambda s,b=True: ImageFont.truetype(F8 if b else F5,s)
os.makedirs(OUT,exist_ok=True)
def run(a): subprocess.run([FF,'-y','-loglevel','error']+a,check=True)
def cover_crop(im,cx=0.5,cy=0.5,scale=1.12):
    # 9:16 に切り抜き、ゆっくり寄るための余白(scale)を残す
    w,h=round(W*scale),round(H*scale); r=max(w/im.width,h/im.height)
    im=im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS)
    x=min(max(round(im.width*cx-w/2),0),im.width-w); y=min(max(round(im.height*cy-h/2),0),im.height-h)
    return im.crop((x,y,x+w,y+h))
def blur_boxes(im,boxes):
    for b in boxes:
        reg=im.crop(b).filter(ImageFilter.GaussianBlur(28)); im.paste(reg,b)
    return im
def panel_text(lines,y,align='c',pad=46,alpha=225):
    # lines: [(文字, 大きさ, 色, 太字)] を白い半透明パネルにのせる
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    hs=[int(s*1.45) for _,s,_,_ in lines]; ph=sum(hs)+pad*2-int(lines[-1][1]*0.45)
    d.rounded_rectangle([60,y,W-60,y+ph],radius=36,fill=(255,255,255,alpha))
    yy=y+pad
    for (t,s,col,b),hh in zip(lines,hs):
        ft=f(s,b); d.text(((W-d.textlength(t,font=ft))/2,yy),t,font=ft,fill=col,stroke_width=(4 if alpha<200 else 0),stroke_fill=(255,255,255)); yy+=hh
    return ov
def pill(ov,y,t,size=40):
    d=ImageDraw.Draw(ov); ft=f(size,False); w=d.textlength(t,font=ft)
    d.rounded_rectangle([W/2-w/2-36,y-10,W/2+w/2+36,y+size+22],radius=34,fill=ORG+(255,)); d.text(((W-w)/2,y),t,font=ft,fill=WHT)
def handle(ov):
    d=ImageDraw.Draw(ov); d.text((60,H-90),'@secondlife_50s',font=f(32,False),fill=WHT,stroke_width=3,stroke_fill=NAVY)
def chara(ov,pose,wd=300):
    c=Image.open(os.path.join(C,pose+'.png')).convert('RGBA'); c=c.resize((wd,round(c.height*wd/c.width)))
    ov.alpha_composite(c,(W-wd-10,H-c.height))
def sky():
    s=Image.open(os.path.join(BG,'day-sky-src.png')).convert('RGB'); s=s.resize((W,round(s.height*W/s.width)),Image.LANCZOS)
    im=s.crop((0,s.height-H,W,s.height)); top=s.crop((0,0,W,700)); m=Image.new('L',(W,700),255); md=ImageDraw.Draw(m)
    for y in range(400,700): md.line([(0,y),(W,y)],fill=int(255*(700-y)/300))
    im.paste(top,(0,0),m); return im
segs=[]
def photo_seg(img,ov,sec,zoom_in=True):
    n=len(segs)+1; base=f'{OUT}/b{n:02d}.png'; ovp=f'{OUT}/o{n:02d}.png'; img.convert('RGB').save(base); ov.save(ovp)
    fr=int(sec*FPS); bw,bh=img.size
    # 余白の範囲でゆっくり寄る(または引く)
    z=f"'1+0.10*on/{fr}'" if zoom_in else f"'1.10-0.10*on/{fr}'"
    run(['-loop','1','-i',base,'-i',ovp,'-filter_complex',
         f"[0:v]scale={bw*2}:{bh*2},zoompan=z={z}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={fr}:s={W}x{H}:fps={FPS}[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]",
         '-map','[v]','-frames:v',str(fr),'-c:v','libx264','-preset','veryfast','-crf','20',f'{OUT}/seg{n:02d}.mp4'])
    segs.append((f'{OUT}/seg{n:02d}.mp4',sec))
def video_seg(path,ss,ov,sec):
    n=len(segs)+1; ovp=f'{OUT}/o{n:02d}.png'; ov.save(ovp)
    tm="zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,eq=saturation=1.45:contrast=1.08:brightness=0.03"
    run(['-ss',str(ss),'-t',str(sec),'-i',path,'-i',ovp,'-filter_complex',
         f"[0:v]{tm},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS}[bg];[bg][1:v]overlay=0:0,format=yuv420p[v]",
         '-map','[v]','-an','-c:v','libx264','-preset','veryfast','-crf','20',f'{OUT}/seg{n:02d}.mp4'])
    segs.append((f'{OUT}/seg{n:02d}.mp4',sec))
def pop(im):
    # 紅葉が映えるよう、くすみを取って少し鮮やかに
    im=ImageOps.autocontrast(im,cutoff=1)
    im=ImageEnhance.Color(im).enhance(1.25); im=ImageEnhance.Brightness(im).enhance(1.06); im=ImageEnhance.Contrast(im).enhance(1.06)
    r,g,b=im.split(); r=r.point(lambda v:min(255,int(v*1.03))); return Image.merge('RGB',(r,g,b))
P=lambda k: pop(Image.open(os.path.join(SRC,k)).convert('RGB'))
E=lambda: Image.new('RGBA',(W,H),(0,0,0,0))
def big(ov,y,t,size,col=WHT,sc=NAVY,sw=6):
    d=ImageDraw.Draw(ov)
    for i,line in enumerate(t.split('\n')):
        ft=f(size); d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.3),line,font=ft,fill=col,stroke_width=sw,stroke_fill=sc)
# 1 つかみ: ダムの上から見た紅葉の谷
ov=E(); pill(ov,820,'2026年10月'); big(ov,910,'行きたい旅が\n凶方位だったら？',86); big(ov,1170,'行ってきました',72,ORG,WHT,8); handle(ov)
cover=cover_crop(P('IMG_3696.jpg'),0.5,0.5,1.0).convert('RGBA'); cover.alpha_composite(ov); cover.convert('RGB').save(f'{OUT}/yunishigawa-reel-cover.jpg',quality=92)
photo_seg(cover_crop(P('IMG_3696.jpg'),0.5,0.5),ov,2.8)
# 2 出発の朝
ov=panel_text([('紅葉の日光・湯西川へ',58,NAVY,True),('2026年10月23日〜24日',40,SOFT,False)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3560.jpg'),0.5,0.5),ov,2.6)
# 3 方角
ov=panel_text([('自宅から見ると',44,SOFT,False),('北西',110,ORG,True),('今年の私の「本命殺」',48,NAVY,True)],740,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3643.jpg'),0.5,0.5),ov,2.8,False)
# 4 東照宮でお参り
ov=panel_text([('その1',40,ORG,True),('旅先でお参り',64,NAVY,True),('日光東照宮へごあいさつ',42,SOFT,False)],800,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3584.jpg'),0.5,0.45),ov,2.6)
# 5 眠り猫
ov=panel_text([('眠り猫にも',46,SOFT,False),('会えました',64,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3600.jpg'),0.5,0.3),ov,2.2)
# 6 平家の隠れ里の宿
ov=panel_text([('その2',40,ORG,True),('長居はせず1泊で',62,NAVY,True),('平家の隠れ里の宿へ',42,SOFT,False)],800,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3659.jpg'),0.5,0.5),ov,2.6)
# 7 露天風呂
ov=panel_text([('その3',40,ORG,True),('観光より、休む旅に',60,NAVY,True),('紅葉を見ながら露天風呂',42,SOFT,False)],300,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3671.jpg'),0.5,0.45),ov,2.8,False)
# 8 ダム見学
ov=panel_text([('翌日は',46,SOFT,False),('湯西川ダムの見学',62,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3697.jpg'),0.5,0.5),ov,2.3)
# 9 ダックツアー(本人の顔はぼかす)
ov=panel_text([('その4',40,ORG,True),('行くと決めたら楽しむ',58,NAVY,True),('ダックツアーで湖へ',42,SOFT,False)],760,alpha=110); handle(ov)
photo_seg(cover_crop(blur_boxes(P('IMG_3714.jpg'),[(1030,1760,1410,2240)]),0.5,0.5),ov,2.6)
# 10 天使の鐘
ov=panel_text([('最後は',46,SOFT,False),('天使の鐘を鳴らして',60,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('IMG_3750.jpg'),0.5,0.45),ov,2.3,False)
# 11 凶方位の旅で大切なこと(昼の空)
im=sky().convert('RGBA'); ov=panel_text([('凶方位の旅で',52,NAVY,True),('大切なこと',72,ORG,True),('',16,NAVY,False),('予定を詰めこみすぎない',42,NAVY,False),('温泉などでゆっくり休む',42,NAVY,False),('長居はしない',42,NAVY,False),('帰ったら早めに休む',42,NAVY,False),('',12,NAVY,False),('と言われています',38,SOFT,False)],330)
chara(ov,'pose-idea',270); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),4.4)
# 12 方違えの注意
im=sky().convert('RGBA'); ov=panel_text([('ちなみに',44,SOFT,False),('「方違え」は',64,NAVY,True),('',12,NAVY,False),('寄り道した場所から見ても',42,NAVY,False),('目的地が吉方位になることが',42,NAVY,False),('大切と言われています',42,NAVY,True),('',12,NAVY,False),('今回は使えなかったので',40,SOFT,False),('休む旅にしました',40,SOFT,False)],360)
chara(ov,'pose-point-up',260); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),4.4)
# 13 まとめ
im=sky().convert('RGBA'); ov=panel_text([('あなたの次の旅は',54,NAVY,True),('吉方位？',80,ORG,True),('',16,NAVY,False),('方角はご自宅から見て決まります',40,NAVY,False),('プロフィールのリンクの無料診断で',40,NAVY,False),('「行きたい場所」を入れると',40,NAVY,False),('いつ行くといいかがわかります',40,NAVY,False)],380)
chara(ov,'pose-wave',300); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),3.8)
# つなぐ(フェード 0.35 秒)+ 無音の音声
T=0.35; args=[]
for p,s in segs: args+=['-i',p]
total=sum(s for _,s in segs)-T*(len(segs)-1)
args+=['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=44100:cl=stereo']
fc=[]; prev='[0:v]'; off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]-T; fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={T}:offset={off:.2f}[v{i}]'); prev=f'[v{i}]'
fc.append(f'{prev}format=yuv420p[vout]')
run(args+['-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{len(segs)}:a','-c:v','libx264','-r',str(FPS),'-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',f'{OUT}/yunishigawa-raw.mp4'])
print(f'{total:.1f}s',len(segs))
