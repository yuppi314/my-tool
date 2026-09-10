'use strict';
// JPEG / PNG / GIF の寸法をヘッダから直接読む(依存パッケージなし)。
// Kindleの入稿検査には「実寸」が要るが、そのためだけに sharp を必須にしたくないため。

function readPng(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  if (buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { format: 'png', width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readGif(buf) {
  if (buf.length < 10) return null;
  const sig = buf.toString('ascii', 0, 6);
  if (sig !== 'GIF87a' && sig !== 'GIF89a') return null;
  return { format: 'gif', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}

function readWebp(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = buf.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { format: 'webp', width: w, height: h };
  }
  if (chunk === 'VP8 ') {
    return { format: 'webp', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    const bits = buf.readUInt32LE(21);
    return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { format: 'webp', width: 0, height: 0 };
}

// SOF0..SOF15 のうち DHT(c4) / JPG(c8) / DAC(cc) は寸法を持たない
const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function readJpeg(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let offset = 2;
  let progressive = false;
  while (offset < buf.length - 1) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
    if (offset + 2 > buf.length) break;
    const length = buf.readUInt16BE(offset);
    if (SOF_MARKERS.has(marker)) {
      if (offset + 7 > buf.length) break;
      if (marker === 0xc2 || marker === 0xc6 || marker === 0xca || marker === 0xce) progressive = true;
      return {
        format: 'jpeg',
        width: buf.readUInt16BE(offset + 5),
        height: buf.readUInt16BE(offset + 3),
        progressive,
      };
    }
    offset += length;
  }
  return null;
}

/** バッファから画像の形式と寸法を判定する。判定できなければ null。 */
function imageSize(buf) {
  return readPng(buf) || readJpeg(buf) || readGif(buf) || readWebp(buf);
}

const MEDIA_TYPES = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

module.exports = { imageSize, MEDIA_TYPES };
