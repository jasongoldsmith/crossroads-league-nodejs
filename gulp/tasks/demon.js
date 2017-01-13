var gulp = require('gulp');
var nodemon = require('gulp-nodemon');

  gulp.task('demon', function () {
  nodemon({
    script: 'start.js',
    ext: 'js',
    verbose: true,
    env: {
      'NODE_ENV': 'development'
    }
  })
});