'use strict';
const database = require('../lib/database');
const validator = require('validator');
const _ = require('underscore');

exports.get = async function(id) {
    return await database.querySingle('select * from requests where id = $1', [id]);
};

exports.getMultiple = async function(ids) {
    return await database.findMultipleById('select * from requests where id = ANY($1::int[])', ids);
};

exports.getMultipleByRunId = async function(runIds) {
    const rows = await database.queryRows('select * from requests where run_id = ANY($1::int[])', [runIds]);
    const rowsByRunId = _.groupBy(rows, (row) => row.run_id);
    return runIds.map((runId) => rowsByRunId[runId] ?? []);
};

exports.find = async function(runId, roomId, furnitureId) {
    return await database.querySingle(
        'select * from requests where run_id = $1 and room_id = $2 and furniture_id = $3',
        [runId, roomId, furnitureId],
    );
};

exports.listByRun = async function(runId) {
    return await database.queryRows('select * from requests where run_id = $1', [runId]);
};

exports.listByRoom = async function(roomId) {
    return await database.queryRows('select * from requests where room_id = $1', [roomId]);
};

exports.listByItem = async function(itemId) {
    return await database.queryRows('select * from requests where furniture_id = $1', [itemId]);
};

exports.list = async function() {
    return await database.queryRows('select * from requests order by id');
};

exports.create = async function(data) {
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'insert into requests (run_id, room_id, furniture_id, amount, created_by) values ($1, $2, $3, $4, $5) returning id';
    const dataArr = [data.run_id, data.room_id, data.furniture_id, data.amount, data.created_by];
    return await database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data) {
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update requests set run_id = $2, room_id = $3, furniture_id = $4, amount = $5, created_by = $6 where id = $1';
    const dataArr = [id, data.run_id, data.room_id, data.furniture_id, data.amount, data.created_by];
    await database.query(query, dataArr);
};

exports.delete = async function(id) {
    await database.query('delete from requests where id = $1', [id]);
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
