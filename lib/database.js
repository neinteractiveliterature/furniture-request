'use strict';
const pg = require('pg');
const config = require('config');
const parseDbUrl = require('parse-database-url');


if ( config.has('db.poolSize')){
    pg.defaults.poolSize = config.get('db.poolSize');
}

const dbURL = config.get('app.dbURL');

const pool = new pg.Pool(parseDbUrl(dbURL));

pool.on('error', function (err) {
    console.error('idle client error', err.message, err.stack);
});

// Helper Functions

// Handle errors with postgres driver
function handleError(err, client, done){
    // no error occurred, continue with the request
    if(!err) return false;
    // else close connection and hand back failure
    done(client);
    return true;
}

// Rollback helper for postgres transactions
// TODO: possibly delete?  Unused function
// function rollback(client, done){
//     client.query('ROLLBACK', function(err) {
//         return done(err);
//     });
// }

exports.query = function(){
    const query = arguments[0];
    let cb = function(){};
    let data = [];
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
};

exports.end = function(){
    pool.end();
};

