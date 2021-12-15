/**
 * Compiler类进行核心编译实现
 */
const {SyncHook} = require('tapable');
const {toUnixPath, tryExtensions, getSourceCode} = require('./utils');
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

class Compiler {
  constructor(options) {
    this.options = options;
    // 相对路径根路径 Context参数
    this.rootPath = this.options.context || toUnixPath(process.cwd());

    // 创建plugin hooks
    this.hooks = {
      // 开始编译时的钩子
      run: new SyncHook(),
      // 输出asset 到 output 目录之前执行（写入文件之前）
      emit: new SyncHook(),
      // 在 compilation 完成时之行，全部完成编译执行
      done: new SyncHook(),
    };

    // 使用 set 对象，确保存储独一无二的值
    // 保存所有入口模块对象
    this.entires = new Set();
    // 保存所有依赖模块对象
    this.modules = new Set();
    // 所有的代码块对象
    this.chunks = new Set();
    // 存放本次产出的文件对象
    this.assets = new Map();
    // 存放本次编译所有产出的文件名
    this.files = new Set();
  }

  /**
   * run方法启动编译
   * 同时，run方法接受外部传递的callback
   */
  run(callback) {
    // 当调用run方法时，触发开始编译的plugin
    this.hooks.run.call();

    // 获取入口配置对象
    const entry = this.getEntry();

    // 编译入口文件
    this.buildEntryModule(entry);

    // 导出列表，之后将每一个chunk转化为单独的文件加入到输出列表assets中
    this.exportFile(callback);
  }

  /**
   * 编译入口文件
   */
  buildEntryModule(entry) {
    Object.keys(entry).forEach((entryName) => {
      const entryPath = entry[entryName];
      // 调用buildModule实现真正的模块编译逻辑
      const entryObj = this.buildModule(entryName, entryPath);
      this.entires.add(entryObj);
      // 根据当前入口文件和模块的相互依赖关系，组装成为一个个包含当前入口以来所有依赖模块的chunk
      this.buildUpChunk(entryName, entryObj);
    });
  }
  /**
   * 模块编译方法
   */
  buildModule(moduleName, modulePath) {
    // 1. 读取文件原始代码
    const originSourceCode = (this.originSourceCode = fs.readFileSync(
      modulePath,
      'utf-8'
    ));
    // moduleCode 为修改后的代码
    this.moduleCode = originSourceCode;

    // 2. 调用loader进行处理
    this.handleLoader(modulePath);

    // 3. 调用webpack进行模块编译，获得最终的module对象
    const module = this.handleWebpackCompiler(moduleName, modulePath);

    // 4. 返回对应的module
    return module;
  }

  /**
   * 获取入口文件路径
   */
  getEntry() {
    let entry = Object.create(null);
    const {entry: optionsEntry} = this.options;
    // entry 为 string 时，默认为主入口文件 main
    if (typeof optionsEntry === 'string') {
      entry['main'] = optionsEntry;
    } else {
      entry = optionsEntry;
    }
    // 将entry变成绝对路径
    Object.keys(entry).forEach((key) => {
      const value = entry[key];
      if (!path.isAbsolute(value)) {
        // 转化为绝对路径的同时，统一路径分隔符为 /
        entry[key] = toUnixPath(path.join(this.rootPath, value));
      }
    });

    return entry;
  }

  /**
   * 匹配loader处理
   */
  handleLoader(modulePath) {
    const matchLoaders = [];
    // 1. 获取所有传入的loader规则
    const rules = this.options.module.rules;
    rules.forEach((loader) => {
      const testRule = loader.test;
      if (testRule.test(modulePath)) {
        if (loader.loader) {
          matchLoaders.push(loader.loader);
        } else {
          matchLoaders.push(...loader.use);
        }
      }
    });

    // 2. 倒序执行loader传入源代码
    for (let i = matchLoaders.length - 1; i >= 0; i--) {
      // require引入对应的loader
      const loaderFn = require(matchLoaders[i]);
      // 通过loader同步处理我的每一次编译的moduleCode
      this.moduleCode = loaderFn(this.moduleCode);
    }
  }

  /**
   * 调用webpack进行模块编译
   * 主要创建了模块对象，并通过babel创建语法树，得到解析后的代码
   */
  handleWebpackCompiler(moduleName, modulePath) {
    // 将当前模块相对于项目启动根目录计算出相对路径，作为模块ID
    const moduleId = './' + path.posix.relative(this.rootPath, modulePath);
    // 创建模块对象
    const module = {
      id: moduleId, // 表示当前模块针对于this.rootPath的相对路径
      dependencies: new Set(), // 该模块所依赖模块的绝对路径
      name: [moduleName], // 该模块所属的入口文件
    };
    // 调用babel分析代码
    const ast = parser.parse(this.moduleCode, {
      sourceType: 'module', // TODO why
    });
    // 深度优先 遍历语法Tree
    traverse(ast, {
      // 当遇到require语句时
      CallExpression: (nodePath) => {
        const node = nodePath.node;
        if (node.callee.name === 'require') {
          // 获得源代码中引入模块相对路径
          const requirePath = node.arguments[0].value;
          // 寻找模块绝对路径 当前模块路径+require()对应相对路径
          const moduleDirName = path.posix.dirname(modulePath);
          const absolutePath = tryExtensions(
            path.posix.join(moduleDirName, requirePath),
            this.options.resolve.extensions,
            requirePath,
            moduleDirName
          );
          // 生成moduleId - 针对于跟路径的模块ID 添加进入新的依赖模块路径
          const moduleId =
            './' + path.posix.relative(this.rootPath, absolutePath);
          // 通过babel修改源代码中的require变成__webpack_require__语句
          node.callee = t.identifier('__webpack_require__');
          // 修改源代码中require语句引入的模块 全部修改变为相对于跟路径来处理
          node.arguments = [t.stringLiteral(moduleId)];
          // 转化成ids的数组
          const alreadyModules = Array.from(this.modules).map((i) => i.id);
          if (!alreadyModules.includes(moduleId)) {
            // 为当前模块添加require语句造成的依赖(内容为相对于根路径的模块ID)
            module.dependencies.add(moduleId);
          } else {
            // 已经存在的话，虽然不进行添加进入模块编译，但是仍然要更新这个模块的依赖入口
            this.modules.forEach((value) => {
              if (value.id === moduleId) {
                value.name.push(moduleName);
              }
            });
          }
        }
      },
    });

    // 遍历结束根据AST生成新的代码
    const {code} = generator(ast);
    // 为当前模块挂载新的生成的代码
    module._source = code;
    // 递归依赖深度遍历，存在依赖模块则加入
    module.dependencies.forEach((dependency) => {
      const devModule = this.buildModule(moduleName, dependency);
      // 将编译之后的任何依赖模块加入到modules对象中去
      this.modules.add(devModule);
    });
    // 返回当前模块对象
    return module;
  }

  /**
   * 根据入口文件和依赖模块组装chunks
   */
  buildUpChunk(entryName, entryObj) {
    const chunk = {
      name: entryName, // 每一个入口文件作为一个chunk
      entryModule: entryObj, // entry 编译后的对象
      modules: Array.from(this.modules).filter((i) =>
        i.name.includes(entryName)
      ), // 寻找和当前entry有关的所有module
    };
    this.chunks.add(chunk);
  }

  /**
   * 将chunk加入到输出列表中
   */
  exportFile(callback) {
    const output = this.options.output;
    // 根据chunks生成assets内容
    this.chunks.forEach((chunk) => {
      const parseFileName = output.filename.replace('[name]', chunk.name);
      // assets中 { 'main.js': '生成的字符串代码‘ }
      this.assets.set(parseFileName, getSourceCode(chunk));
    });

    // 调用Plugin, emit钩子
    this.hooks.emit.call();

    // 先判断目录是否存在 存在则直接fs.write，否则创建
    if (!fs.existsSync(output.path)) {
      fs.mkdirSync(output.path);
    }
    // files中保存所有的生成文件名
    this.files = new Set([...this.assets.keys()]);
    // 将assets中的内容生成到打包文件，写入文件系统中
    this.files.forEach((fileName) => {
      const filePath = path.join(output.path, fileName);
      fs.writeFileSync(filePath, this.assets.get(fileName));
    });

    // 结束之后触发钩子
    this.hooks.done.call();

    callback(null, {
      toJson: () => {
        return {
          entires: this.entires,
          modules: this.modules,
          files: this.files,
          chunks: this.chunks,
          assets: this.assets,
        };
      },
    });
  }
}

// TODO 为什么使用了module.exports 而不是 export default
module.exports = Compiler;
