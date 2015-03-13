module.exports = function (grunt) {
    
    grunt.initConfig ({
        pkg: grunt.file.readJSON ('package.json'),
        
        concat: {
            options: { separator:";" },
            dist: {
                src: [
                    'src/util.js',
                    'src/windchart.js'
                ],
                dest: 'dist/skyward.js'
            }
        },
        
        uglify: {
            build: {
                src:  'dist/skyward.js',
                dest: 'dist/skyward.min.js',
            }
        }
    });
    
    grunt.loadNpmTasks ('grunt-contrib-concat');
    grunt.loadNpmTasks ('grunt-contrib-uglify');
    
    grunt.registerTask ('default', [
        'concat',
        'uglify'
    ]);
    
};