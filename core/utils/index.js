const fs = require('fs');

/**
 * 统一路径分隔符号，主要是为了后续生成模块ID
 * @param {*} path
 * @returns
 */
function toUnixPath(path) {
  return path.replace(/\\/g, '/');
}

/**
 *
 * @param {*} modulePath 模块绝对路径
 * @param {*} extensions 扩展名数组
 * @param {*} originModulePath 原始引入模块路径
 * @param {*} moduleContext 模块上下文（当前模块所在目录）
 * @returns
 */
function tryExtensions(
  modulePath,
  extensions,
  originModulePath,
  moduleContext
) {
  // 优先尝试不需要扩展名选项
  extensions.unshift('');
  for (let extension of extensions) {
    if (fs.existsSync(modulePath + extension)) {
      return modulePath + extension;
    }
  }
  // 未匹配对应文件
  throw new Error(
    `No module, Error: Can't resolve ${originModulePath} in ${moduleContext}`
  );
}

function getSourceCode(chunk) {
  const {name, entryModule, modules} = chunk;

  return `
  (() => {
    var __webpack_modules__ = {
      ${modules
        .map((module) => {
          return `
          '${module.id}': (module) => {
            ${module._source}
      }
        `;
        })
        .join(',')}
    };
    // The module cache
    var __webpack_module_cache__ = {};

    // The require function
    function __webpack_require__(moduleId) {
      // Check if module is in cache
      var cacheModule = __webpack_module_cache__[moduleId]
      if (cacheModule !== undefined) {
        return cacheModule.exports
      }
      // Create a new module (and put it into the cache)
      var module = (__webpack_module_cache__[moduleId] = {
        // no module.id needed
        // no module.loaded needed
        exports: {},
      })

      // Execute the module function
      __webpack_modules__[moduleId](module, module.exports, __webpack_require__)

      // Return the exports of the module
      return module.exports
    }

    var __webpack_exports__ = {}
    // This entry need to be wrapped in an IIFE beacuse it need to be isolated against other modules in the chunk
    (() => {
      ${entryModule._source}
    })()
  })()
  `;
}

module.exports = {toUnixPath, tryExtensions, getSourceCode};
