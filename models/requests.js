'use strict';
const async = require('async');
const _ = require('underscore');
const database = require('../lib/database');
const validator = require('validator');

exports.get = function(id, cb){
    const query = 'select * from requests where id = $1';
    database.query(query, [id], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.find = function(runId, roomId, furnitureId, cb){
    const query = 'select * from requests where run_id = $1 and room_id = $2 and furniture_id = $3';
    database.query(query, [runId, roomId, furnitureId], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.listByRun = function(runId, cb){
    const query = 'select * from requests where run_id = $1';
    database.query(query, [runId], function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.rows);
    });
};

exports.listByRoom = function(roomId, cb){
    const query = 'select * from requests where room_id = $1';
    database.query(query, [roomId], function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.rows);
    });
};

exports.listByItem = function(itemId, cb){
    const query = 'select * from requests where furniture_id = $1';
    database.query(query, [itemId], function(err, result){
        if (err) { return cb(err); }
        return cb(null, result.rows);
    });  
};

exports.list = function(cb){
    const query = 'select * from requests order by id';
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
    const query = 'insert into requests (run_id, room_id, furniture_id, amount, created_by) values ($1, $2, $3, $4, $5) returning id';
    const dataArr = [data.run_id, data.room_id, data.furniture_id, data.amount, data.created_by];
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
    const query = 'update requests set run_id = $2, room_id = $3, furniture_id = $4, amount = $5, created_by = $6 where id = $1';
    const dataArr = [id, data.run_id, data.room_id, data.furniture_id, data.amount, data.created_by];
    database.query(query, dataArr, cb);
};

exports.delete =  function(id, cb){
    const query = 'delete from requests where id = $1';
    database.query(query, [id], cb);
};

function validate(data){
    if (! validator.isNumeric('' + data.run_id)){
        return false;
    }
    if (! validator.isNumeric('' + data.room_id)){
        return false;
    }
    if (! validator.isNumeric('' + data.furniture_id)){
        return false;
    }
    if (! validator.isNumeric('' + data.amount)){
        return false;
    }
    return true;

}
