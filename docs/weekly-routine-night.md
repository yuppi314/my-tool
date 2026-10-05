# 毎週日曜の自動作成:夜空デザインへの変更点(2026-10-05)

対象: Routine「毎週日曜 吉方位SNS投稿(Instagram・Threads)」(trig_01LT2546Vmkk8ZTLhXqPBGrD)

## 変更点
1. **デザイン**: すべて「夜空 × 金 × 明朝体」(night-*.js)。和紙ベージュの sns-map / sns-reel / star-reel / reel-cover / sns-images は新しい素材に使わない。
2. **出発地なし**: 東京・大阪・福岡などを指定しない。素材とキャプションは「最大吉方」と「方位ごとの運気」だけ。旅先は「プロフィールのリンクの無料診断」へ誘導。
3. **準備**: claude/ai-company-startup-najy7m を checkout したあと、
   `git fetch origin claude/sns-funnel-plan && git checkout origin/claude/sns-funnel-plan -- scripts/night-reel.js scripts/night-month.js scripts/night-slides.js scripts/night-cover.js scripts/night-calendar.js`
4. **日曜のカルーセル**: その節月の9星まとめを未投稿なら `night-month.js <基準日> out/ @secondlife_50s`(cover + night-post-1〜9 の10枚)。投稿済みの月は `night-slides.js` で週替わりテーマ(吉方位旅のルール → 方位ごとの運気 → マイル術 → 八方塞がりの過ごし方 → 9つの星の性格)。
5. **星別リール**: 日曜・火曜・金曜の3本(log.json の続きから3つの星)を `night-reel.js <基準日> <星> star-reels/<日付>/ @secondlife_50s` で。表紙は night-reel-<星>-cover.jpg。
6. **漫画リール**: 中身はそのまま。表紙だけ `night-cover.js <出力> <小見出し> <タイトル> <絵> @secondlife_50s`。旅先の地名は「たとえば東京からなら」と例であることがわかる言い方に。
7. **コメント返信**: 最大吉方と方位ごとの運気(東京発の旅先例は出さない)。
8. **先週の結果**: 夜空デザインへの切り替え前後の比較も書く。リールには静かで神秘的な曲をすすめる。

## 方位ごとの運気(night-reel.js の DIRECTION_LUCK と同じ)
北=信頼・愛情・子宝 / 北東=変化・貯蓄・相続 / 東=発展・行動力・若さ / 南東=良縁・信用・人間関係 /
南=名誉・美・ひらめき / 南西=家庭運・安定・勤勉 / 西=金運・恋愛・楽しみ / 北西=仕事運・引き立て・出世
