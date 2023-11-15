'use strict';
const database = require('../lib/database');
const validator = require('validator');


exports.get = async function(id){
    return database.querySingle('select * from display_text where id = $1', [id]);
};

exports.getByName = async function(name){
    console.log('getting ' + name);
    return database.querySingle('select * from display_text where name = $1', [name]);
};

exports.list = async function(){
    return database.queryRows('select * from display_text');
};

exports.create = async function(data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'insert into display_text (name, description, content) values ($1, $2, $3) returning id';
    const dataArr = [data.name, data.description, data.content];
    return database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update display_text set name = $2, description = $3, content = $4 where id = $1';
    const dataArr = [id, data.name, data.description, data.content];
    await database.query(query, dataArr);
};

exports.delete = async function(id){
    const query = 'delete from display_text where id = $1';
    await database.query(query, [id]);
};

function validate(data){
    if (! validator.isLength(data.name, 2, 255)){
        return false;
    }
    return true;
}
