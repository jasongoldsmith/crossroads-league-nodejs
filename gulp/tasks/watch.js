var gulp = require('gulp');
var livereload = require('gulp-livereload');
var debug = require('gulp-debug');

var watchPathsDict = {
  scripts: 'app/public/js/**/*.js',
  views: 'app/views/**',
  starttime: 'app/tmp/starttime.txt'
};

var watchPaths = Object.keys(watchPathsDict).map(function(key){
  return watchPathsDict[key];
});

gulp.task('livereloadPathsChange', function() {
  gulp.src(watchPaths)
    .pipe(debug({title: 'unicorn:'}))
    .pipe(livereload());
});

// Watch
gulp.task('watch', ['setWatch'], function() {
  console.log('in watch');

  // Create LiveReload server
  livereload.listen();

  gulp.watch(watchPaths, ["livereloadPathsChange", "mochaRun"]);
});