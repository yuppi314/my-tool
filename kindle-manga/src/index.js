'use strict';
// ライブラリとして使う場合の入口。CLIは bin/kindle-manga.js。
module.exports = {
  project: require('./project'),
  pages: require('./pages'),
  epub: require('./epub'),
  validate: require('./validate'),
  metadata: require('./metadata'),
  normalize: require('./normalize'),
  imagesize: require('./imagesize'),
  zip: require('./zip'),
};
