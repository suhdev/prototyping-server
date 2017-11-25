const gulp = require('gulp'), 
    gzip = require('gulp-gzip'),
    tar = require('gulp-tar'); 


gulp.task('default',()=>{
    gulp.src(['./prototype/**'])
    .pipe(tar('archive.tar'))
    .pipe(gzip())
    .pipe(gulp.dest('./zip'));
});