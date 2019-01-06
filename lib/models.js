'use strict';
var fs = require('fs');
var _ = require('underscore');
var path = require('path');

var models = {};

var modelDir = '../models';

loadModels(__dirname + '/' + modelDir);

module.exports = models;

function loadModels(dir){
    _.each(fs.readdirSync(dir), function(filename){
        if (filename.match(/\.js$/)){
            var modelName = path.basename(filename, '.js');
            models[modelName] = require(dir + '/' + filename);
        }
    });
}
