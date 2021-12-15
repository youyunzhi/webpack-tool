/**
 * plugin-a
 * a插件
 */

class PluginA {
  apply(compiler) {
    // 注册同步钩子
    // 这里的compiler就是我们new Compiler()创建的实例
    compiler.hooks.run.tap('Plugin A', () => {
      // 调用
      console.log('print PluginA');
    });
  }
}

module.exports = PluginA;
