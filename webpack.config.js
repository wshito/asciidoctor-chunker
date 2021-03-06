const path = require('path');
const webpack = require('webpack');
const ShebangPlugin = require('webpack-shebang-plugin');

// inject version into src/CommandOption.mjs with DefinePlugin
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
    }),
    new ShebangPlugin()
  ],
  module: {
    rules: [{
      test: /\.css$/i,
      type: 'asset/source',
    }],
  },
};
