'use strict';
// 依存パッケージなしのZIPライター。
// EPUBは「mimetypeを非圧縮(store)で先頭に置く」という決まりがあるため、
// 既製ライブラリを入れずに自前で最小限のZIPを組み立てる。
const zlib = require('zlib');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time =
    (date.getHours() << 11) | (date.getMinutes() << 5) | (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time: time & 0xffff, date: day & 0xffff };
}

class ZipWriter {
  constructor(mtime = new Date()) {
    this.chunks = [];
    this.entries = [];
    this.offset = 0;
    this.stamp = dosDateTime(mtime);
  }

  _push(buf) {
    this.chunks.push(buf);
    this.offset += buf.length;
  }

  /**
   * @param {string} name ZIP内のパス
   * @param {Buffer|string} data 中身
   * @param {{store?: boolean}} opts store=true で無圧縮(mimetype用)
   */
  add(name, data, opts = {}) {
    const body = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const store = opts.store === true;
    const compressed = store ? body : zlib.deflateRawSync(body, { level: 9 });
    const crc = crc32(body);
    const localOffset = this.offset;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(store ? 10 : 20, 4); // version needed
    header.writeUInt16LE(0, 6); // flags (UTF-8フラグは立てない: ASCIIパスのみ使う)
    header.writeUInt16LE(store ? 0 : 8, 8); // method
    header.writeUInt16LE(this.stamp.time, 10);
    header.writeUInt16LE(this.stamp.date, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(body.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    this._push(header);
    this._push(nameBuf);
    this._push(compressed);

    this.entries.push({
      nameBuf,
      crc,
      compressedSize: compressed.length,
      size: body.length,
      store,
      localOffset,
    });
  }

  toBuffer() {
    const centralStart = this.offset;
    for (const e of this.entries) {
      const c = Buffer.alloc(46);
      c.writeUInt32LE(0x02014b50, 0);
      c.writeUInt16LE(20, 4); // version made by
      c.writeUInt16LE(e.store ? 10 : 20, 6);
      c.writeUInt16LE(0, 8);
      c.writeUInt16LE(e.store ? 0 : 8, 10);
      c.writeUInt16LE(this.stamp.time, 12);
      c.writeUInt16LE(this.stamp.date, 14);
      c.writeUInt32LE(e.crc, 16);
      c.writeUInt32LE(e.compressedSize, 20);
      c.writeUInt32LE(e.size, 24);
      c.writeUInt16LE(e.nameBuf.length, 28);
      c.writeUInt16LE(0, 30); // extra
      c.writeUInt16LE(0, 32); // comment
      c.writeUInt16LE(0, 34); // disk
      c.writeUInt16LE(0, 36); // internal attrs
      c.writeUInt32LE(0, 38); // external attrs
      c.writeUInt32LE(e.localOffset, 42);
      this._push(c);
      this._push(e.nameBuf);
    }
    const centralSize = this.offset - centralStart;

    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(this.entries.length, 8);
    eocd.writeUInt16LE(this.entries.length, 10);
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(centralStart, 16);
    eocd.writeUInt16LE(0, 20);
    this._push(eocd);

    return Buffer.concat(this.chunks);
  }
}

module.exports = { ZipWriter, crc32 };
