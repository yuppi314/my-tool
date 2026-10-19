// 診断結果を、Instagram のストーリーズに出せる画像(1080x1920)にする
// 使い方: setupShareCard(data) を結果の取得後に呼ぶ
(function () {
  const W = 1080, H = 1920;
  const GOLD = '#E8C872', WHITE = '#F5F0E6', SOFT = '#C8CCDE', CARD = 'rgba(28,40,100,0.85)';
  const FONT = '"Shippori Mincho B1", "Hiragino Mincho ProN", "Yu Mincho", serif';

  function rand(seed) {
    let s = seed;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  }

  function sparkle(ctx, x, y, s) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s * 0.25, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s * 0.25, y); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x, y - s * 0.25); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s * 0.25); ctx.fill();
  }

  function center(ctx, text, y, size, color, weight) {
    ctx.font = `${weight || 800} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, W / 2, y);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function draw(data) {
    try { await document.fonts.load(`800 60px "Shippori Mincho B1"`); await document.fonts.load(`500 40px "Shippori Mincho B1"`); } catch (e) { /* 標準の明朝体で描く */ }
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 夜空
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#16225C'); g.addColorStop(1, '#090E2C');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const r = rand(data.star.id * 97 + 13);
    for (let i = 0; i < 240; i++) {
      const a = 0.4 + r() * 0.6;
      ctx.fillStyle = `rgba(255,255,240,${a})`;
      ctx.beginPath(); ctx.arc(r() * W, r() * H, 0.6 + r() * 1.6, 0, Math.PI * 2); ctx.fill();
    }
    [[130, 260, 22], [950, 220, 16], [110, 1180, 14], [980, 1060, 20]].forEach(([x, y, s]) => sparkle(ctx, x, y, s));

    // 見出し
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(300, 250); ctx.lineTo(780, 250); ctx.stroke();
    center(ctx, '九星気学で診断してみたら', 310, 44, GOLD, 500);
    ctx.beginPath(); ctx.moveTo(300, 345); ctx.lineTo(780, 345); ctx.stroke();

    center(ctx, '私の星は', 450, 60, WHITE, 500);
    center(ctx, data.star.name, 600, 140, GOLD);

    // キーワード
    const words = (data.star.keyword || '').split('・').filter(Boolean).slice(0, 3);
    ctx.font = `700 40px ${FONT}`;
    const pads = words.map((w) => ctx.measureText(w).width + 56);
    let x = (W - pads.reduce((a, b) => a + b, 0) - 20 * (words.length - 1)) / 2;
    words.forEach((w, i) => {
      roundRect(ctx, x, 650, pads[i], 70, 35); ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = WHITE; ctx.textAlign = 'left'; ctx.fillText(w, x + 28, 699);
      x += pads[i] + 20;
    });

    // 月命星・ラッキーカラー・今月の最大吉方
    const rows = [];
    if (data.getsumei) rows.push(['心の奥(月命星)', data.getsumei.name]);
    if (data.keisha) rows.push(['本当の自分', data.keisha.name]);
    if (data.star.color) rows.push(['ラッキーカラー', data.star.color]);
    const best = (data.month && data.month.bestDirections) || [];
    rows.push([`${data.month ? data.month.label.replace(/^\d+年/, '') : '今月'}の最大吉方`, best.length ? best.join('・') : 'お休みの月']);
    const boxY = 790, rowH = 110;
    roundRect(ctx, 100, boxY, W - 200, rowH * rows.length + 40, 30);
    ctx.fillStyle = CARD; ctx.fill(); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();
    rows.forEach(([label, value], i) => {
      const y = boxY + 90 + i * rowH;
      ctx.textAlign = 'left'; ctx.font = `500 38px ${FONT}`; ctx.fillStyle = SOFT; ctx.fillText(label, 150, y);
      ctx.textAlign = 'right'; ctx.font = `800 50px ${FONT}`; ctx.fillStyle = WHITE; ctx.fillText(value, W - 150, y);
    });

    // 案内役のキャラクター
    const akari = await loadImage('/img/akari.png');
    if (akari) ctx.drawImage(akari, W - 370, H - 440, 330, 330);

    // 誘導
    const cy = boxY + rowH * rows.length + 150;
    center(ctx, 'あなたの星は？', cy, 64, GOLD);
    center(ctx, '生年月日を入れるだけの無料診断', cy + 80, 42, WHITE, 500);
    ctx.textAlign = 'left';
    ctx.font = `800 46px ${FONT}`; ctx.fillStyle = WHITE; ctx.fillText('@secondlife_50s', 80, H - 330);
    ctx.font = `500 34px ${FONT}`; ctx.fillStyle = SOFT; ctx.fillText('プロフィールのリンクから', 80, H - 270);
    return canvas;
  }

  window.setupShareCard = function (data) {
    const btn = document.getElementById('share-make');
    const box = document.getElementById('share-preview');
    if (!btn || !box) return;
    btn.addEventListener('click', async () => {
      btn.disabled = true; btn.textContent = '画像を作っています…';
      const canvas = await draw(data);
      canvas.toBlob(async (blob) => {
        const url = URL.createObjectURL(blob);
        box.innerHTML = `<img src="${url}" alt="シェア用の画像" class="share-img" />
          <button type="button" class="primary" id="share-send">画像を保存・シェアする</button>
          <p class="board-legend">うまく保存できないときは、画像を長押しして「写真に追加」を選んでください。</p>`;
        btn.style.display = 'none';
        const file = new File([blob], 'my-star.png', { type: 'image/png' });
        document.getElementById('share-send').addEventListener('click', async () => {
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try { await navigator.share({ files: [file], text: '私の星を九星気学で診断してみたよ🌙 @secondlife_50s' }); } catch (e) { /* 閉じたときは何もしない */ }
          } else {
            const a = document.createElement('a'); a.href = url; a.download = 'my-star.png'; document.body.appendChild(a); a.click(); a.remove();
          }
        });
      }, 'image/png');
    });
  };
})();
