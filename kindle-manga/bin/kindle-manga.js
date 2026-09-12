#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const project = require('../src/project');
const pagesLib = require('../src/pages');
const epub = require('../src/epub');
const validate = require('../src/validate');
const metadata = require('../src/metadata');
const { normalize, PRESETS } = require('../src/normalize');
const generate = require('../src/generate');

const C = process.stdout.isTTY
  ? { red: '\x1b[31m', yellow: '\x1b[33m', green: '\x1b[32m', dim: '\x1b[2m', bold: '\x1b[1m', off: '\x1b[0m' }
  : { red: '', yellow: '', green: '', dim: '', bold: '', off: '' };

function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [key, inline] = a.slice(2).split('=');
      if (inline !== undefined) args.flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args.flags[key] = argv[++i];
      else args.flags[key] = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}

const USAGE = `${C.bold}kindle-manga${C.off} — 漫画画像をKindle出版可能な状態まで自動で仕上げるツール

使い方:
  kindle-manga init [作品フォルダ]        作品フォルダの雛形を作る
  kindle-manga generate [作品フォルダ]    paste/のプロンプトからページ画像を一括生成
  kindle-manga check [作品フォルダ]       KDP入稿前のプリフライト検査
  kindle-manga normalize [作品フォルダ]   画像をKindle仕様に一括整形(要 sharp)
  kindle-manga build [作品フォルダ]       固定レイアウトEPUB(右開き)を生成
  kindle-manga metadata [作品フォルダ]    KDP登録シートを生成
  kindle-manga publish [作品フォルダ]     check + build + metadata をまとめて実行

主なオプション:
  --out <file>        EPUBの出力先を指定
  --force             エラーがあってもEPUBを生成する
  --preset <名前>     normalize時のサイズ (${Object.keys(PRESETS).join(' / ')})
  --width / --height  normalize時のサイズを直接指定
  --grayscale         normalize時にグレースケール化(ファイルサイズが約1/3)
  --split-spreads     横長の見開き画像を2ページに分割
  --quality <1-100>   normalize時のJPEG品質 (既定88)
  --in / --dir <path> normalizeの入力/出力フォルダ
  --yes               generate時に実際に生成する(既定は枚数と見積りの表示だけ)
  --only <指定>       generateするページ (例: 19  /  3-7  /  19,24)
  --orientation <向き> generateの向き (portrait / square / landscape)

generate には環境変数 OPENAI_API_KEY が必要です。画像生成は課金されます。

注意: Amazon KDPには公開の出版APIがありません。最後のアップロード操作だけは
      KDPの管理画面で行う必要があります(ブラウザ自動操作は規約違反のリスクがあります)。
`;

function loadAll(dir) {
  const book = project.load(dir);
  const pages = pagesLib.collect(book.pagesPath);
  return { book, pages };
}

function printIssues(result) {
  const icon = { error: `${C.red}✖${C.off}`, warn: `${C.yellow}▲${C.off}`, info: `${C.dim}·${C.off}` };
  for (const it of result.issues) {
    console.log(`  ${icon[it.level]} ${it.message}`);
    if (it.hint) console.log(`     ${C.dim}${it.hint}${C.off}`);
  }
  if (!result.issues.length) console.log(`  ${C.green}✔${C.off} 指摘なし`);
  console.log('');
  console.log(
    `  ${result.errors ? C.red : C.green}エラー ${result.errors}件${C.off} / ${C.yellow}警告 ${result.warnings}件${C.off}`
  );
}

function cmdInit(dir) {
  const target = path.resolve(dir);
  fs.mkdirSync(path.join(target, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(target, 'dist'), { recursive: true });

  const configFile = project.configPath(target);
  if (fs.existsSync(configFile)) {
    console.log(`${C.yellow}既に ${configFile} があります。上書きしません。${C.off}`);
  } else {
    const sample = Object.assign({}, project.DEFAULTS, {
      title: '漫画でわかる〇〇',
      titleReading: 'マンガデワカルマルマル',
      author: 'ペンネーム',
      authorReading: 'ペンネーム',
      description:
        'ここに商品ページの紹介文を書きます。\n\n1行目で「誰の、どんな悩みが、どう変わるか」を言い切ると転換率が上がります。',
      keywords: ['漫画でわかる', '入門', 'ビジネス書', '図解', '初心者', 'まんが', '解説'],
      categories: ['コミック > 教養・実用', 'ビジネス・経済 > 入門'],
      series: { name: '漫画でわかるシリーズ', index: 1 },
      publishedDate: new Date().toISOString().slice(0, 10),
    });
    delete sample.uuid;
    fs.writeFileSync(configFile, JSON.stringify(sample, null, 2) + '\n', 'utf8');
    console.log(`${C.green}作成:${C.off} ${configFile}`);
  }

  const readme = path.join(target, 'README.txt');
  if (!fs.existsSync(readme)) {
    fs.writeFileSync(
      readme,
      [
        'この作品フォルダの使い方',
        '',
        '1. pages/ に本文ページ画像を連番で入れる (001.jpg, 002.jpg, ...)',
        '   ファイル名は自然順で並びます。p2 は p10 より前に来ます。',
        '2. cover.jpg (1600x2560 推奨) をこのフォルダに置く',
        '3. book.json のタイトル・著者・紹介文・キーワードを埋める',
        '4. kindle-manga publish . を実行',
        '5. dist/ に出来たEPUBとkdp-metadata.mdを持ってKDPにアップロード',
        '',
      ].join('\n'),
      'utf8'
    );
  }

  console.log(`${C.green}作成:${C.off} ${path.join(target, 'pages')}/  ← ここに本文画像を入れてください`);
  console.log('');
  console.log('次の手順:');
  console.log(`  1. ${target}/pages/ に 001.jpg, 002.jpg ... を配置`);
  console.log(`  2. ${target}/cover.jpg (1600x2560) を配置`);
  console.log(`  3. ${configFile} を編集`);
  console.log(`  4. kindle-manga publish ${dir}`);
}

function cmdCheck(dir) {
  const { book, pages } = loadAll(dir);
  console.log(`${C.bold}プリフライト検査:${C.off} ${book.title || '(タイトル未設定)'} — ${pages.length}ページ`);
  console.log('');
  const result = validate.run(book, pages);
  printIssues(result);
  return result;
}

function cmdBuild(dir, flags) {
  const { book, pages } = loadAll(dir);
  const result = validate.run(book, pages);
  if (!result.ok && !flags.force) {
    console.log(`${C.bold}プリフライト検査${C.off}`);
    console.log('');
    printIssues(result);
    console.log('');
    console.log(`${C.red}エラーがあるためビルドを中止しました。${C.off} 無視するには --force を付けてください。`);
    process.exitCode = 1;
    return null;
  }
  const built = epub.build(book, pages, { outFile: flags.out ? path.resolve(flags.out) : undefined });
  console.log(`${C.green}EPUB生成:${C.off} ${built.file}`);
  console.log(
    `  ${built.pageCount}ページ / ${(built.bytes / 1024 / 1024).toFixed(2)}MB / 原寸 ${built.resolution} / ${
      book.direction === 'ltr' ? '左開き' : '右開き'
    }`
  );
  return { book, pages, built, result };
}

function cmdMetadata(dir, built) {
  const { book, pages } = loadAll(dir);
  const result = validate.run(book, pages);
  const files = metadata.write(book, pages, built || null, result);
  console.log(`${C.green}KDP登録シート:${C.off} ${files.sheetFile}`);
  console.log(`${C.green}チェックリスト:${C.off} ${files.checkFile}`);
  console.log(`${C.dim}JSON:${C.off} ${files.jsonFile}`);
  return files;
}

async function cmdNormalize(dir, flags) {
  const book = project.load(dir);
  const inDir = flags.in ? path.resolve(flags.in) : book.pagesPath;
  const outDir = flags.dir ? path.resolve(flags.dir) : path.join(book.root, 'pages-normalized');
  const pages = pagesLib.collect(inDir);
  if (!pages.length) throw new Error(`${inDir} に画像がありません。`);

  console.log(`${C.bold}画像整形:${C.off} ${pages.length}枚 → ${outDir}`);
  const res = await normalize(pages, outDir, {
    preset: typeof flags.preset === 'string' ? flags.preset : undefined,
    width: flags.width ? Number(flags.width) : undefined,
    height: flags.height ? Number(flags.height) : undefined,
    grayscale: Boolean(flags.grayscale),
    quality: flags.quality ? Number(flags.quality) : undefined,
    splitSpreads: Boolean(flags['split-spreads']),
    direction: book.direction,
  });
  const split = res.results.filter((r) => r.split).length;
  console.log(`${C.green}完了:${C.off} ${res.count}枚 (${res.width}x${res.height}${split ? ` / 見開き分割 ${split}枚` : ''})`);
  console.log('');
  console.log(`book.json の "pagesDir" を "${path.relative(book.root, outDir) || outDir}" に変えてから build してください。`);
  return res;
}

async function cmdGenerate(dir, flags) {
  const book = project.load(dir);
  const pasteDir = path.join(book.root, 'paste');
  const mangaDir = path.join(book.root, 'manga');
  const prompts = generate.collectPrompts(pasteDir, { only: flags.only });
  const references = generate.collectReferences(pasteDir);

  const pending = prompts.filter(
    (p) => flags.force || !fs.existsSync(generate.outputPath(mangaDir, p.page))
  );

  console.log(`${C.bold}ページ画像の生成:${C.off} ${book.title}`);
  console.log('');
  console.log(`  プロンプト   ${prompts.length}件 (${path.relative(process.cwd(), pasteDir)})`);
  console.log(`  生成する     ${pending.length}件${pending.length ? ` — ${summarizePages(pending.map((p) => p.page))}` : ''}`);
  console.log(`  既にある     ${prompts.length - pending.length}件${flags.force ? ' (--force で上書き)' : ' (飛ばす)'}`);
  console.log(
    `  キャラシート ${references.length ? references.map((r) => r.name).join(' ') : `${C.yellow}なし — 顔がページごとに変わります${C.off}`}`
  );
  console.log('');

  if (!pending.length) {
    console.log(`${C.green}生成するページはありません。${C.off}`);
    return;
  }
  if (!process.env.OPENAI_API_KEY) {
    console.log(`${C.red}OPENAI_API_KEY が設定されていません。${C.off}`);
    console.log(`${C.dim}  export OPENAI_API_KEY=sk-...${C.off}`);
    process.exitCode = 1;
    return;
  }
  if (!flags.yes) {
    console.log(`${C.yellow}画像生成には料金がかかります。${C.off} 実行するには --yes を付けてください。`);
    console.log(`${C.dim}単価は https://openai.com/api/pricing/ を確認してください。${C.off}`);
    return;
  }

  const started = Date.now();
  const result = await generate.run(book, {
    apiKey: process.env.OPENAI_API_KEY,
    only: flags.only,
    force: Boolean(flags.force),
    orientation: typeof flags.orientation === 'string' ? flags.orientation : 'portrait',
    onProgress(ev) {
      if (ev.status === 'start') process.stdout.write(`  P${String(ev.page).padStart(2, '0')} ... `);
      if (ev.status === 'done') console.log(`${C.green}完了${C.off} ${Math.round(ev.bytes / 1024)}KB`);
      if (ev.status === 'failed') console.log(`${C.red}失敗${C.off} ${ev.message}`);
    },
  });

  console.log('');
  console.log(
    `${C.bold}結果:${C.off} 生成 ${result.generated.length}件 / 失敗 ${result.failed.length}件 ` +
      `(${Math.round((Date.now() - started) / 1000)}秒)`
  );
  if (result.failed.length) {
    console.log('');
    console.log(`失敗したページだけ作り直すには:`);
    console.log(`  kindle-manga generate ${dir} --only ${result.failed.map((f) => f.page).join(',')} --yes`);
    process.exitCode = 1;
  }
  return result;
}

// 1,2,3,7 を「1-3, 7」のように畳んで表示する。40ページ並べても読めるように。
function summarizePages(pages) {
  const out = [];
  let start = null;
  let prev = null;
  for (const p of [...pages].sort((a, b) => a - b)) {
    if (start === null) {
      start = prev = p;
      continue;
    }
    if (p === prev + 1) {
      prev = p;
      continue;
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = p;
  }
  if (start !== null) out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out.join(', ');
}

function cmdPublish(dir, flags) {
  console.log(`${C.bold}=== 1. プリフライト検査 ===${C.off}`);
  console.log('');
  const check = cmdCheck(dir);
  console.log('');
  if (!check.ok && !flags.force) {
    console.log(`${C.red}エラーを直してから再実行してください。${C.off} 強行するには --force。`);
    process.exitCode = 1;
    return;
  }
  console.log(`${C.bold}=== 2. EPUB生成 ===${C.off}`);
  console.log('');
  const build = cmdBuild(dir, flags);
  if (!build) return;
  console.log('');
  console.log(`${C.bold}=== 3. KDP登録シート ===${C.off}`);
  console.log('');
  cmdMetadata(dir, build.built);
  console.log('');
  console.log(`${C.bold}=== 4. 残りの手動作業 ===${C.off}`);
  console.log('');
  console.log('  1. Kindle Previewer 3 でEPUBを開き、右開き・ページ順・可読性を確認');
  console.log('  2. https://kdp.amazon.co.jp/ →「+ 電子書籍または有料マンガ」');
  console.log('  3. dist/kdp-metadata.md を上から順にコピペ');
  console.log(`  4. 原稿として ${path.basename(build.built.file)}、表紙として ${build.book.cover} をアップロード`);
  console.log('  5. 価格を設定して「Kindle本を出版」');
  console.log('');
  console.log(`${C.dim}KDPには公開APIが無いため、この4手順だけは自動化できません(ブラウザ自動操作は規約違反リスク)。${C.off}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0];
  const dir = args._[1] || '.';

  if (!cmd || cmd === 'help' || args.flags.help) {
    console.log(USAGE);
    return;
  }

  switch (cmd) {
    case 'init':
      cmdInit(args._[1] || '.');
      break;
    case 'check': {
      const r = cmdCheck(dir);
      if (!r.ok) process.exitCode = 1;
      break;
    }
    case 'build':
      cmdBuild(dir, args.flags);
      break;
    case 'metadata':
      cmdMetadata(dir, null);
      break;
    case 'normalize':
      await cmdNormalize(dir, args.flags);
      break;
    case 'generate':
      await cmdGenerate(dir, args.flags);
      break;
    case 'publish':
      cmdPublish(dir, args.flags);
      break;
    default:
      console.error(`不明なコマンド: ${cmd}`);
      console.log(USAGE);
      process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`${C.red}エラー:${C.off} ${err.message}`);
  process.exitCode = 1;
});
