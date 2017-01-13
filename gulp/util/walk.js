var fs = require('fs');

var walk = function(basePath) {
  var results = [];
  var stat = fs.statSync(basePath);
  if (stat && !stat.isDirectory()) {
    results.push(basePath);
    return results;
  }
  var list = fs.readdirSync(basePath);
  list.forEach(function(file) {
    file = basePath + '/' + file;
    results = results.concat(walk(file));
  });
  return results
};

module.exports = walk;