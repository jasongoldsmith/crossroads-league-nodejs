// npm install gulp gulp-mocha gulp-util

var gulp = require('gulp');
var mocha = require('gulp-mocha');
var gutil = require('gulp-util');
var db = require('../../app/startup/db')

gulp.task('mochaRun', function() {
 var tests =  gulp.src(['app/tests/integration/mocha/default/*.js'], { read: false })
    .pipe(mocha({ reporter: 'list' }))
    .on('error', gutil.log);

 return tests;
});



gulp.task('watch-mocha', function() {
  gulp.watch(['app/tests/integration/mocha/**'], ['mochaRun']);
});