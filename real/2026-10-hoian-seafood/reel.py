# ホイアン旅(夜の街・ごはん)リール(本人の旅の写真・動画 + 昼の空テーマの文字)。吉方位の話は入れない
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
    # 夜の提灯や街並みが映えるよう、くすみを取って少し鮮やかに
    im=ImageOps.autocontrast(im,cutoff=1)
    im=ImageEnhance.Color(im).enhance(1.25); im=ImageEnhance.Brightness(im).enhance(1.06); im=ImageEnhance.Contrast(im).enhance(1.06)
    r,g,b=im.split(); r=r.point(lambda v:min(255,int(v*1.03))); return Image.merge('RGB',(r,g,b))
P=lambda k: pop(Image.open(os.path.join(SRC,k)).convert('RGB'))
E=lambda: Image.new('RGBA',(W,H),(0,0,0,0))
def big(ov,y,t,size,col=WHT,sc=NAVY,sw=6):
    d=ImageDraw.Draw(ov)
    for i,line in enumerate(t.split('\n')):
        ft=f(size); d.text(((W-d.textlength(line,font=ft))/2,y+i*size*1.3),line,font=ft,fill=col,stroke_width=sw,stroke_fill=sc)
DAI=[(90,1570,250,1730),(420,1440,520,1540),(1170,1480,1270,1580)]
WEL=[(1330,1570,1450,1760),(0,1900,140,2100)]
MV=[(90,1110,230,1280),(250,1160,380,1310),(540,1190,680,1300),(820,1150,1000,1300)]
# 1 つかみ: 夜の川(動画・うしろ姿)
ov=E(); pill(ov,820,'ベトナム・ホイアン'); big(ov,910,'50代女子旅\nホイアンの夜',90); big(ov,1170,'ぜんぶ見せます',76,ORG,WHT,8); handle(ov)
video_seg(os.path.join(SRC,'IMG_3861.mov'),0.0,ov,1.2)
# 表紙: 提灯の街並み(顔はぼかす)
ov=E(); pill(ov,1150,'ベトナム・ホイアン'); big(ov,1240,'50代女子旅\nホイアンの夜',90); handle(ov)
cover=cover_crop(blur_boxes(P('lantern.jpg'),[(1260,1220,1390,1370)]),0.5,0.5,1.0).convert('RGBA'); cover.alpha_composite(ov); cover.convert('RGB').save(f'{OUT}/hoian-reel-cover.jpg',quality=92)
# 2 出発
ov=panel_text([('いざ',46,SOFT,False),('ベトナムへ',76,NAVY,True)],300,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_3797.mov'),2.0,ov,2.2)
# 3 到着
ov=panel_text([('ダナンに',46,SOFT,False),('到着！',80,NAVY,True)],1250,alpha=110); handle(ov)
photo_seg(cover_crop(blur_boxes(P('welcome.jpg'),WEL),0.5,0.45),ov,2.2)
# 4 提灯の街
ov=panel_text([('夜のホイアンは',46,SOFT,False),('提灯の街',76,NAVY,True)],300,alpha=110); handle(ov)
photo_seg(cover_crop(blur_boxes(P('lantern.jpg'),[(1260,1220,1390,1370)]),0.5,0.5),ov,2.4)
# 5 黄色い壁のお店
ov=panel_text([('提灯の灯る',46,SOFT,False),('レトロなお店がずらり',62,NAVY,True)],300,alpha=110); handle(ov)
photo_seg(cover_crop(blur_boxes(P('missvan.jpg'),MV),0.5,0.5),ov,2.2,False)
# 6 カオラウ
ov=panel_text([('ホイアン名物',46,SOFT,False),('カオラウ',80,NAVY,True)],300,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_3873.mov'),0.3,ov,2.2)
# 7 川辺のごはん
ov=panel_text([('川を見ながら',46,SOFT,False),('ベトナムごはん',70,NAVY,True)],300,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_3876.mov'),0.5,ov,2.2)
# 8 シーフードのお店
ov=panel_text([('別の日は',44,SOFT,False),('シーフードのお店',66,NAVY,True),('DAI AN(ダイアン)',44,SOFT,False)],300,alpha=110); handle(ov)
photo_seg(cover_crop(blur_boxes(P('daian.jpg'),DAI),0.5,0.4),ov,2.4,False)
# 9 焼きがき
ov=panel_text([('ネギ油とピーナッツの',44,SOFT,False),('焼きがき',80,NAVY,True)],1250,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_4093.mov'),3.0,ov,2.2)
# 10 えび
ov=panel_text([('金色の衣の',46,SOFT,False),('大きなえび',80,NAVY,True)],1300,alpha=110); handle(ov)
photo_seg(cover_crop(P('shrimp.jpg'),0.5,0.45),ov,2.2)
# 11 空芯菜
ov=panel_text([('野菜もしっかり',46,SOFT,False),('空芯菜の炒めもの',70,NAVY,True)],1300,alpha=110); handle(ov)
video_seg(os.path.join(SRC,'IMG_4096.mov'),2.8,ov,1.9)
# 12 まとめ
im=sky().convert('RGBA'); ov=panel_text([('あなたなら',54,NAVY,True),('どれを食べたい？',72,ORG,True),('',16,NAVY,False),('1 カオラウ',46,NAVY,False),('2 焼きがき',46,NAVY,False),('3 金色のえび',46,NAVY,False),('4 空芯菜の炒めもの',46,NAVY,False),('',16,NAVY,False),('番号でコメントしてね',44,ORG,True)],340)
chara(ov,'pose-point-you',290); handle(ov); im.alpha_composite(ov)
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
run(args+['-filter_complex',';'.join(fc),'-map','[vout]','-map',f'{len(segs)}:a','-c:v','libx264','-r',str(FPS),'-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',f'{OUT}/hoian-raw.mp4'])
print(f'{total:.1f}s',len(segs))
