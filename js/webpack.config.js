const path = require('path');

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/index.mjs',
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'asciidoctor-chunker.js',
  },
};
