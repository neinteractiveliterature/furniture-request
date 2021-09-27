'use strict';
const database = require('../lib/database');

exports.get = function(id, cb){
    const query = 'select * from runs where id = $1';
    database.query(query, [id], function(err, result){
        if (err) { return cb(err); }
        if (result.rows.length){
            return cb(null, result.rows[0]);
        }
        return cb();
    });
};

exports.list = function(cb){
    const query = 'select * from runs order by id';
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
    const query = 'insert into runs (id, event_id, notes, food, no_furniture, created_by) values ($1, $2, $3, $4, $5, $6) returning id';
    const dataArr = [data.id, data.event_id, data.notes, data.food, data.no_furniture, data.created_by];
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
    const query = 'update runs set notes = $2, food = $3, no_furniture = $4, created_by = $5 where id = $1';
    const dataArr = [id, data.notes, data.food, data.no_furniture, data.created_by];
    database.query(query, dataArr, cb);
};

exports.delete =  function(id, cb){
    const query = 'delete from runs where id = $1';
    database.query(query, [id], cb);
};

function validate(){
    return true;

}
