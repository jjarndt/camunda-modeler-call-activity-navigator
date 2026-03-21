const CamundaModelerWebpackPlugin = require('camunda-modeler-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const pkg = require('./package.json');

module.exports = {
  mode: 'development',
  entry: './client/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'client.js'
  },
  plugins: [
    new CamundaModelerWebpackPlugin(),
    new webpack.DefinePlugin({
      __PLUGIN_VERSION__: JSON.stringify(pkg.version)
    })
  ]
};
