'use strict';
const database = require('../lib/database');
const validator = require('validator');

exports.get = async function(id) {
    return await database.querySingle('select * from users where id = $1', [id]);
};

exports.getByEmail = async function(text) {
    return await database.querySingle('select * from users where email = $1', [text]);
};

exports.getByIntercodeId = async function(text) {
    return await database.querySingle('select * from users where intercode_id = $1', [text]);
};

exports.list = async function(){
    return await database.queryRows('select * from users order by name');
};

exports.create = async function(data){
    if (! validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'insert into users (name, email, intercode_id) values ($1, $2, $3) returning id';
    const dataArr = [data.name, data.email, data.intercode_id];
    return await database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data){
    if (! validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update users set name = $2, email = $3, intercode_id = $4 where id = $1';
    const dataArr = [id, data.name, data.email, data.intercode_id];
    await database.query(query, dataArr);
};

exports.delete = async function(id){
    await database.query('delete from users where id = $1', [id]);
};

exports.findOrCreate = async function(data) {
    const user = await exports.getByIntercodeId(data.intercode_id);
    if (user) {
        await exports.update(user.id, data);
        return await exports.get(user.id);
    } else {
        const id = await exports.create(data);
        return await exports.get(id);
    }
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
