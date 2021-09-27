'use strict';
const async = require('async');
const _ = require('underscore');
const database = require('../lib/database');
const validator = require('validator');

const models = {
};

exports.get = function(id, cb){
    const query = 'select * from users where id = $1';
    database.query(query, [id], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.getByEmail = function(text, cb){
    const query = 'select * from users where email = $1';
    database.query(query, [text], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};
exports.getByIntercodeId = function(text, cb){
    const query = 'select * from users where intercode_id = $1';
    database.query(query, [text], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.list = function(cb){
    const query = 'select * from users order by name';
    database.query(query, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.rows);
    });
};

exports.create = function(data, cb){
    if (! validate(data)){
        return process.nextTick(function(){
            cb('Invalid Data');
        });
    }
    const query = 'insert into users (name, email, intercode_id) values ($1, $2, $3) returning id';
    const dataArr = [data.name, data.email, data.intercode_id];
    database.query(query, dataArr, function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.rows[0].id);
    });
};

exports.update =  function(id, data, cb){
    if (! validate(data)){
        return process.nextTick(function(){
            cb('Invalid Data');
        });
    }
    const query = 'update users set name = $2, email = $3, intercode_id = $4 where id = $1';
    const dataArr = [id, data.name, data.email, data.intercode_id];
    database.query(query, dataArr, cb);
};

exports.delete =  function(id, cb){
    const query = 'delete from users where id = $1';
    database.query(query, [id], cb);
};

exports.findOrCreate = function(data, cb){
    exports.getByIntercodeId(data.intercode_id, function(err, user){
        if (err) { return cb(err); }
        if (user) {
            exports.update(user.id, data, function(err){
                if (err) { return cb(err); }
                exports.get(user.id, cb);
            });
        } else {
            exports.create(data, function(err, id){
                if (err) { return cb(err); }
                exports.get(id, cb);
            });
        }
    });
};


function validate(data){
    if (! validator.isLength(data.name, 2, 255)){
        return false;
    }
    if (! validator.isLength(data.email, 3, 100)){
        return false;
    }
    return true;
}
