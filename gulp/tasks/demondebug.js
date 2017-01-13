var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

gulp.task('demondebug', function () {
  nodemon({
    script: 'start.js',
    ext: 'js',
    nodeArgs: ['--debug'],
    env: {
      'NODE_ENV': 'development'
    }
  });
});