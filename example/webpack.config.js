const path = require('path');
const PluginA = require('../plugins/plugin-a.js');
const PluginB = require('../plugins/plugin-b.js');

module.exports = {
  // 环境
  mode: 'development',
  // 入口文件
  entry: {
    main: path.resolve(__dirname, './src/entry1.js'),
    second: path.resolve(__dirname, './src/entry2.js'),
  },
  devtool: false,
  context: process.cwd(), // 基本目录，用于解析入口文件的绝对路径
  // 输出文件
  output: {
    path: path.resolve(__dirname, './build'),
    filename: '[name].js', // 输出文件名称
  },
  plugins: [new PluginA(), new PluginB()], // 插件
  resolve: {
    extensions: ['.js', '.jsx', '.ts'],
  },
  module: {
    rules: [
      {
        test: /\.js/,
        use: [
          path.resolve(__dirname, '../loaders/loader-1.js'),
          path.resolve(__dirname, '../loaders/loader-2.js'),
        ],
      },
    ],
  },
};
