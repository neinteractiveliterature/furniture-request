'use strict';
const pg = require('pg');
const config = require('config');
const parseDbUrl = require('parse-database-url');
const c = require('ansi-colors');

if (config.has('db.poolSize')){
    pg.defaults.poolSize = config.get('db.poolSize');
}

let dbURL = config.get('app.dbURL');
if(config.get('app.dbSSL')){
    dbURL +=  '?ssl=true';
}

const poolConfig = parseDbUrl(dbURL);
if(config.get('app.dbSSL')){
    poolConfig.ssl = {
        rejectUnauthorized: false
    };
}

if (config.get('app.dbPoolSize')){
    poolConfig.max = config.get('app.dbPoolSize');
}

const pool = new pg.Pool(poolConfig);

pool.on('error', function (err) {
    console.error('idle client error', err.message, err.stack);
});

exports.query = async function(query, values = []){
    const client = await pool.connect();
    try {
        const start = new Date();
        const result = await client.query(query, values);
        if (config.get('app.debug')){
            console.log(`${c.green(`[SQL ${new Date().getTime() - start.getTime()}ms]`)} ${query} ${values.length > 0 ? c.yellow(JSON.stringify(values)) : ''}`);
        }
        return result;
    } catch (error) {
        console.error(`${c.red('[SQL error]')} ${error} while running:\n  ${query} ${values.length > 0 ? c.yellow(JSON.stringify(values)) : ''}`);
        throw error;
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

exports.pool = pool;
