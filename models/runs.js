'use strict';
const database = require('../lib/database');

exports.get = async function(id) {
    return await database.querySingle('select * from runs where id = $1', [id]);
};

exports.getMultiple = async function(ids) {
    return await database.findMultipleById('select * from runs where id = ANY($1::text[])', ids);
};

exports.list = async function() {
    return await database.queryRows('select * from runs order by id');
};

exports.create = async function(data) {
    if (!validate(data)) {
        throw new Error('Invalid Data');
    }
    const query = 'insert into runs (id, event_id, notes, food, no_furniture, created_by) values ($1, $2, $3, $4, $5, $6) returning id';
    const dataArr = [data.id, data.event_id, data.notes, data.food, data.no_furniture, data.created_by];
    return await database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data) {
    if (!validate(data)) {
        throw new Error('Invalid Data');
    }
    const query = 'update runs set notes = $2, food = $3, no_furniture = $4, created_by = $5 where id = $1';
    const dataArr = [id, data.notes, data.food, data.no_furniture, data.created_by];
    await database.query(query, dataArr);
};

exports.delete = async function(id){
    await database.query('delete from runs where id = $1', [id]);
};

function validate(){
    return true;
}
