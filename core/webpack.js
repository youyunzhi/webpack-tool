const Compiler = require('./compiler.js');

/**
 * webpack()方法实现文件
 */
function webpack(options) {
  // 合并参数，得到合并后的参数
  const mergeOptions = _mergeOptions(options);

  // 创建compiler对象
  const compiler = new Compiler(mergeOptions);

  // 加载插件
  _loadPlugin(options.plugins, compiler);

  return compiler;
}

// 合并参数
function _mergeOptions(options) {
  // shell传入参数
  const shellOptions = process.argv.slice(2).reduce((option, argv) => {
    // argv -> --mode = production
    const [key, value] = argv.split('=');
    if (key && value) {
      const parseKey = key.slice(2);
      option[parseKey] = key;
    }
    return option;
  }, {});
  // 执行合并操作
  return {...options, shellOptions};
}

// 加载插件函数
function _loadPlugin(plugins, compiler) {
  if (plugins && Array.isArray(plugins)) {
    plugins.forEach((plugin) => {
      plugin.apply(compiler);
    });
  }
}

module.exports = webpack;
