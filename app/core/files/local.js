'use strict';

let fs = require('fs'),
    path = require('path');

class LocalFiles {
    constructor(options) {
        this.options = options;
        this.getUrl = this.getUrl.bind(this);
        this.save = this.save.bind(this);
    }


    getUrl(file) {
        return path.resolve(this.options.dir + '/' + file._id);
    };

    save(options, callback) {
        let file = options.file,
            doc = options.doc,
            fileFolder = doc._id,
            filePath = fileFolder + '/' + encodeURIComponent(doc.name),
            newPath = this.options.dir + '/' + fileFolder;

        this.copyFile(file.path, newPath, function (err) {

            if (err) {
                return callback(err);
            }

            // Let the clients know about the new file
            let url = '/files/' + filePath;
            callback(null, url, doc);
        });
    };

    copyFile(path, newPath, callback) {
        fs.readFile(path, function (err, data) {
            if (err) {
                return callback(err);
            }

            fs.writeFile(newPath, data, function (err) {
                callback(err);
            });
        });
    };
}

//
// function LocalFiles(options) {
//     this.options = options;
//
//     this.getUrl = this.getUrl.bind(this);
//     this.save = this.save.bind(this);
// }
//
// LocalFiles.prototype.getUrl = function(file) {
//     return path.resolve(this.options.dir + '/' + file._id);
// };
//
// LocalFiles.prototype.save = function(options, callback) {
//     let file = options.file,
//         doc = options.doc,
//         fileFolder = doc._id,
//         filePath = fileFolder + '/' + encodeURIComponent(doc.name),
//         newPath = this.options.dir + '/' + fileFolder;
//
//     this.copyFile(file.path, newPath, function(err) {
//
//         if (err) {
//             return callback(err);
//         }
//
//         // Let the clients know about the new file
//         let url = '/files/' + filePath;
//         callback(null, url, doc);
//     });
// };
//
// LocalFiles.prototype.copyFile = function(path, newPath, callback) {
//     fs.readFile(path, function(err, data) {
//         if (err) {
//             return callback(err);
//         }
//
//         fs.writeFile(newPath, data, function(err) {
//             callback(err);
//         });
//     });
// };

module.exports = LocalFiles;
