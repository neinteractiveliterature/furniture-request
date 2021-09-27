'use strict';
const async = require('async');
const _ = require('underscore');
const database = require('../lib/database');
const validator = require('validator');

exports.get = function(id, cb){
    const query = 'select * from furniture where id = $1';
    database.query(query, [id], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.list = function(cb){
    const query = 'select * from furniture order by display_order';
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
    getNextDisplayOrder(function(err, displayOrder){
        if (err) { return cb(err); }
        const query = 'insert into furniture (name, description, max_amount, internal, display_order) values ($1, $2, $3, $4, $5) returning id';
        const dataArr = [data.name, data.description, data.max_amount, data.internal, displayOrder];
        database.query(query, dataArr, function(err, result){
            if (err) { return cb(err); }
            return cb(null, result.rows[0].id);
        });
    });
};

exports.update =  function(id, data, cb){
    if (! validate(data)){
        return process.nextTick(function(){
            cb('Invalid Data');
        });
    }
    const query = 'update furniture set name = $2, description = $3, max_amount = $4, internal = $5, display_order = $6 where id = $1';
    const dataArr = [id, data.name, data.description, data.max_amount, data.internal, data.display_order];

    database.query(query, dataArr, cb);
};

exports.delete =  function(id, cb){
    const query = 'delete from furniture where id = $1';
    database.query(query, [id], cb);
};

function getNextDisplayOrder(cb){
    const query = 'select max(display_order) as max_order from furniture';
    database.query(query, function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            cb(null, result.rows[0].max_order+1);
        } else {
            cb(null, 0);
        }
    });
}

function validate(data){
    if (! validator.isLength(data.name, 2, 255)){
        return false;
    }
    if (! validator.isNumeric('' + data.max_amount)){
        return false;
    }
    return true;

}
