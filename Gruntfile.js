var deb = require('debian-packaging'),
    path = require('path'),
    fs = require('fs');

module.exports = function (grunt) {

    grunt.initConfig({
        default: {
            options: {
                maintainer: "Paul Varache <perso@paulvarache.ninja>",
                version: "1.0.0",
                name: "my-package",
                short_description: "short",
                long_description: "long",
                target_architecture: "all",
                category: "devel",
                build_number: "1"
            },
            build: {
                files: [{
                    cwd: 'source',
                    src: '**/*',
                    dest: '/opt/my-package'
                }],
                links: {
                    '/usr/bin/mp': '/opt/my-package/bin/mp'
                },
                scripts: {
                    preinst: {
                        src: 'preinst.sh'
                    },
                    postinst: {
                        content: 'echo "patate"'
                    }
                }
            }
        }
    });

    grunt.registerMultiTask('default', function(){

        var done = this.async();

        var options = this.options({
            data_dir: './.tmp/data',
            control_dir: './.tmp/control'
        });

        var pkg = grunt.file.readJSON('package.json');

        var control = {
            'Package': this.options().name,
            'Version': this.options().version,
            'Architecture': this.options().target_architecture,
            // 'Installed-Size': ,
            'Maintainer': this.options().maintainer,
            'Description': this.options().short_description // ?
        };


        // Generate data file
        var file_list = this.files
            .forEach(function (file) {
                // Remove inexisting et folders
                var src = file.src.filter(function (src) {
                    if (file.cwd) {
                        src = path.join(file.cwd, src);
                    }
                    return grunt.file.exists(src) &&
                        grunt.file.isFile(src);
                }).forEach(function (src) {
                    var long_src = src;
                    if (file.cwd) {
                        long_src = path.join(file.cwd, src);
                    }
                    grunt.file.copy(long_src, path.join(options.data_dir, file.dest, src));
                });
                
            });

        // Generate symlinks
        for(var i in this.data.links){
            new Promise(function(fulfill, reject){
                grunt.file.write(path.join(options.data_dir, i));
                fulfill();
            }).then(function(){
                fs.symlinkSync(path.join(options.data_dir, i), this.data.links[i]);
            });
        }

        
        // Generate control file
        var str = "";
        for(var i in control){
            str += i+": "+control[i]+"\n";
        }
        grunt.file.write(path.join(options.control_dir, '/control'), str);

        // copy package lifecycle scripts
        var scripts = ['preinst', 'postinst', 'prerm', 'postrm'];

        for (var j in scripts) {
            if (this.data.scripts[scripts[j]]) {
                var destination = path.join(options.control_dir, scripts[j]);
                if (this.data.scripts[scripts[j]].src) {
                    grunt.verbose.writeln(scripts[j] + ' script found');
                    grunt.file.copy(this.data.scripts[scripts[j]].src, destination);
                } else if (this.data.scripts[scripts[j]].content) {
                    grunt.verbose.writeln('Creating ' + scripts[j]);
                    grunt.file.write(destination, this.data.scripts[scripts[j]].content);
                }
            }
        }



        deb.createPackage({
            control: options.control_dir,
            data: options.data_dir,
            dest: 'output/' + options.name + '.deb'
        })
        .then(function () {
            grunt.verbose.writeln('ok');
            done();
        })
        .catch(function (err) {
            console.log(err);
            grunt.verbose.writeln(JSON.stringify(err));
            done(err);
        });
    });
};
