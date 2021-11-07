'use strict';
const fs = require('fs');
const _ = require('underscore');
const path = require('path');

const models = {};

const modelDir = '../models';

loadModels(__dirname + '/' + modelDir);

module.exports = models;

function loadModels(dir){
    _.each(fs.readdirSync(dir), function(filename){
        if (filename.match(/\.js$/)){
            const modelName = path.basename(filename, '.js');
            models[modelName] = require(dir + '/' + filename);
        }
    });
}
