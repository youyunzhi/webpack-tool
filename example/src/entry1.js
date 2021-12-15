/**
 * webpack-tool/example/entry1.js
 */

const devModule = require('./module.js');

console.log(devModule, 'dep');
console.log('This is entry 1!');
