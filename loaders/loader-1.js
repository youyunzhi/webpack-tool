/**
 * loader本质上是一个函数，接受原始内容，返回转换后的内容
 */

function loader1(sourceCode) {
  console.log('join loader1');
  return sourceCode + `\n const loader1 = 'loader1' `;
}

module.exports = loader1;
