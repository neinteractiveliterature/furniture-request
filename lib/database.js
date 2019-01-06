'use strict';
var pg = require('pg');
var config = require('config');
var parseDbUrl = require("parse-database-url");


if ( config.has('db.poolSize')){
    pg.defaults.poolSize = config.get('db.poolSize');
}

var dbURL = config.get('app.dbURL');

var pool = new pg.Pool(parseDbUrl(dbURL));

pool.on('error', function (err, client) {
  console.error('idle client error', err.message, err.stack)
});

// Helper Functions

// Handle errors with postgres driver
function handleError(err, client, done){
    // no error occurred, continue with the request
    if(!err) return false;
    // else close connection and hand back failure
    done(client);
    return true;
};

// Rollback helper for postgres transactions
function rollback(client, done){
    client.query('ROLLBACK', function(err) {
        return done(err);
    });
}

exports.query = function(){
    var query = arguments[0];
    var cb = function(){};
    var data = [];
    if (typeof arguments[arguments.length-1] === 'function'){
        cb = arguments[arguments.length-1];
    }
    if (Array.isArray(arguments[1])){
        data = arguments[1];
    }
    pool.connect(function(err, client, done){
        if(handleError(err, client, done)) return cb(err);
        client.query(query, data, function(err, result){

            if(handleError(err, client, done)) return cb(err);
            done();
            cb(null, result);
        });
    });
}

exports.end = function(){
    pool.end();
}

