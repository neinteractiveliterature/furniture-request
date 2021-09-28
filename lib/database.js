'use strict';
const pg = require('pg');
const config = require('config');
const parseDbUrl = require('parse-database-url');
const c = require('ansi-colors');

if (config.has('db.poolSize')){
    pg.defaults.poolSize = config.get('db.poolSize');
}

const dbURL = config.get('app.dbURL');

const pool = new pg.Pool(parseDbUrl(dbURL));

pool.on('error', function (err) {
    console.error('idle client error', err.message, err.stack);
});

exports.query = async function(query, values = []){
    const client = await pool.connect();
    try {
        const start = new Date();
        const result = await client.query(query, values);
        console.log(`${c.green(`[SQL ${new Date().getTime() - start.getTime()}ms]`)} ${query} ${values.length > 0 ? c.yellow(JSON.stringify(values)) : ''}`);
        return result;
    } finally {
        client.release();
    }
};

exports.querySingle = async function(query, values = []) {
    const result = await exports.query(query, values);
    if (result.rows.length){
        return result.rows[0];
    }
    return undefined;
};

exports.queryRows = async function(query, values = []) {
    const result = await exports.query(query, values);
    return result.rows;
};

exports.findMultipleById = async function(query, ids) {
    const rows = await exports.queryRows(query, [ids]);
    return ids.map((id) => rows.find((row) => row.id === id));
};

exports.insertReturningId = async function(query, values = []) {
    const result = await exports.query(query, values);
    return result.rows[0].id;
};

exports.end = function(){
    pool.end();
};
