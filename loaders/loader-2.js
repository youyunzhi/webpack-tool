function loader2(sourceCode) {
  console.log('join loader2');
  // TODO: 如果字符串多了一个 引号 ，parse会报错，如何避免这个问题呢？
  return sourceCode + `\n const loader2 = 'cheeze' `;
}
module.exports = loader2;
