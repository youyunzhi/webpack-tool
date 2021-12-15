
  (() => {
    var __webpack_modules__ = {
      
          './example/src/module.js': (module) => {
            const name = 'xiaochaozhishi';
module.exports = {
  name
};
const loader2 = 'cheeze';
const loader1 = 'loader1';
      }
        
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
      /**
 * webpack-tool/example/entry1.js
 */
const devModule = __webpack_require__("./example/src/module.js");

console.log(devModule, 'dep');
console.log('This is entry 1!');
const loader2 = 'cheeze';
const loader1 = 'loader1';
    })()
  })()
  