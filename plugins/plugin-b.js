/**
 * plugin-b
 * b插件
 */

class PluginB {
  apply(compiler) {
    // 注册同步钩子
    // 这里的compiler就是我们new Compiler()创建的实例
    compiler.hooks.run.tap('Plugin B', () => {
      // 调用
      console.log('print PluginB');
    });
  }
}

module.exports = PluginB;
