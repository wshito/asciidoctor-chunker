const path = require('path');
const webpack = require('webpack');

const version = JSON.stringify(require('./package.json').version);

module.exports = {
  mode: 'production',
  target: 'node',
  entry: './src/index.mjs',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'asciidoctor-chunker.js',
  },
  plugins: [
    new webpack.DefinePlugin({
      __VERSION__: version,
    })
  ],
  module: {
    rules: [{
      test: /\.css$/i,
      type: 'asset/source',
    }],
  },
};
