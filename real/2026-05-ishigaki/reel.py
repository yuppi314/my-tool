# 「知らずに行った石垣島、実は…」リール(本人の旅の写真・動画 + 昼の空テーマの文字)
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
    # 南の島らしく、明るく鮮やかに(くすみを取って、少しあたたかく)
    im=ImageOps.autocontrast(im,cutoff=1)
    im=ImageEnhance.Color(im).enhance(1.35); im=ImageEnhance.Brightness(im).enhance(1.06); im=ImageEnhance.Contrast(im).enhance(1.06)
    r,g,b=im.split(); r=r.point(lambda v:min(255,int(v*1.03))); return Image.merge('RGB',(r,g,b))
P=lambda k: pop(Image.open(os.path.join(SRC,k)).convert('RGB'))
E=lambda: Image.new('RGBA',(W,H),(0,0,0,0))
def big(ov,y,t,size,col=WHT,sc=NAVY,sw=6):
    d=ImageDraw.Draw(ov)
    for i,line in enumerate(t.split('\n')):
        ft=f(size); d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.3),line,font=ft,fill=col,stroke_width=sw,stroke_fill=sc)
# 1 つかみ: 本人がエメラルドの海でばんざい(うしろ姿)
ov=E(); pill(ov,820,'2026年5月'); big(ov,910,'知らずに行った\n石垣島',90); big(ov,1150,'実は…',104,ORG,WHT,8); handle(ov)
cover=cover_crop(P('d1380.jpg'),0.5,0.5,1.0).convert('RGBA'); cover.alpha_composite(ov); cover.convert('RGB').save(f'{OUT}/ishigaki-reel-cover.jpg',quality=92)
photo_seg(cover_crop(P('d1380.jpg'),0.5,0.5),ov,2.8)
# 2 飛行機の窓から石垣の海
ov=panel_text([('大好きな石垣島へ',60,NAVY,True),('2026年5月20日〜23日',40,SOFT,False)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1067.jpg'),0.5,0.4),ov,2.6)
# 3 川平湾 + 方角
ov=panel_text([('自宅から見ると',44,SOFT,False),('南西',110,ORG,True),('約2,000km',44,NAVY,False)],740,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1293.jpg'),0.5,0.5),ov,2.8,False)
# 4 グラスボート
ov=panel_text([('川平湾の',46,SOFT,False),('グラスボートへ',64,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1294.jpg'),0.45,0.5),ov,2.3)
# 5 波照間の砂浜(動画)
ov=panel_text([('日本最南端の',46,SOFT,False),('波照間島まで',64,NAVY,True)],820,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_1142.mov'),0,ov,2.8)
# 6 木のトンネル
ov=panel_text([('木のトンネルを',46,SOFT,False),('ぬけると…',64,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1306.jpg'),0.5,0.5),ov,2.2)
# 7 マングローブ
ov=panel_text([('マングローブを',46,SOFT,False),('カヤックで探検',62,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1247.jpg'),0.5,0.5),ov,2.3)
# 8 島ねこ
ov=panel_text([('島ねこにも',46,SOFT,False),('会えました',64,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1110.jpg'),0.55,0.6),ov,2.0)
# 9 島ごはん
ov=panel_text([('もずく、ゴーヤー…',46,SOFT,False),('島ごはんも最高',62,NAVY,True)],820,alpha=110); handle(ov)
photo_seg(cover_crop(P('d1129.jpg'),0.5,0.5),ov,2.2)
# 10 本人の笑顔
ov=E(); big(ov,300,'最高の旅！',100); big(ov,490,'…と思ったら',64); handle(ov)
photo_seg(cover_crop(blur_boxes(P('d1386.jpg'),[(565,400,700,560)]),0.5,0.55),ov,2.8,False)
# 9 答え(昼の空)
im=sky().convert('RGBA'); ov=panel_text([('あとで九星気学で調べたら',44,SOFT,False),('まさかの',56,NAVY,True),('本命殺…！',120,ORG,True),('',20,NAVY,False),('5月の南西には、',42,NAVY,False),('私の星(二黒土星)が',42,NAVY,False),('回っていました',42,NAVY,False)],330)
pill(ov,250,'答え合わせ'); chara(ov,'pose-idea',280); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),4.0)
# 10 本命殺とは
im=sky().convert('RGBA'); ov=panel_text([('本命殺とは？',64,ORG,True),('',16,NAVY,False),('無理をすると',46,NAVY,False),('疲れが出やすい、とされる方角',46,NAVY,False),('',16,NAVY,False),('しかも5月は',46,NAVY,False),('どの方角にも最大吉方がない月',46,NAVY,True)],380)
chara(ov,'pose-point-up',260); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),4.2)
# 11 時期で変わる
im=sky().convert('RGBA'); ov=panel_text([('同じ南西でも',56,NAVY,False),('行く時期で',80,ORG,True),('変わる',80,ORG,True),('',16,NAVY,False),('私の南西の最大吉方は',44,NAVY,False),('7月・9月・10月',64,NAVY,True)],380)
chara(ov,'pose-compass',280); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),3.4)
# 12 リベンジ
im=sky().convert('RGBA'); ov=panel_text([('だから次は',50,SOFT,False),('時期を選んで',64,NAVY,True),('10月、同じ南西の',50,NAVY,False),('ダナンへ',110,ORG,True),('リベンジ旅に行ってきます',46,NAVY,False)],380)
chara(ov,'pose-cheer',280); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),3.6)
# 13 まとめ
im=sky().convert('RGBA'); ov=panel_text([('あなたの旅は',56,NAVY,True),('吉方位だった？',72,ORG,True),('',16,NAVY,False),('方角はご自宅から見て決まります',40,NAVY,False),('プロフィールのリンクの無料診断で',40,NAVY,False),('「行きたい場所」を入れると',40,NAVY,False),('いつ行くといいかがわかります',40,NAVY,False),('',16,NAVY,False),('フォローして、ダナン編を待っててね',40,ORG,False)],360)
chara(ov,'pose-wave',300); handle(ov); im.alpha_composite(ov)
photo_seg(im.resize((round(W*1.12),round(H*1.12))),E(),4.0)
# つなぐ(フェード 0.35 秒)+ 無音の音声
T=0.35; args=[]
for p,s in segs: args+=['-i',p]
total=sum(s for _,s in segs)-T*(len(segs)-1)
args+=['-f','lavfi','-t',f'{total:.2f}','-i','anullsrc=r=44100:cl=stereo']
fc=[]; prev='[0:v]'; off=0
for i in range(1,len(segs)):
    off+=segs[i-1][1]-T; fc.append(f'{prev}[{i}:v]xfade=transition=fade:duration={T}:offset={off:.2f}[v{i}]'); prev=f'[v{i}]'
fc.append(f'{prev}format=yuv420p[vout]')
run(args+['-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{len(segs)}:a','-c:v','libx264','-r',str(FPS),'-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',f'{OUT}/ishigaki-reel.mp4'])
print(f'{total:.1f}s',len(segs))
