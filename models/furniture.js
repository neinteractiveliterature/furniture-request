'use strict';
const database = require('../lib/database');
const validator = require('validator');

exports.get = async function(id){
    return await database.querySingle('select * from furniture where id = $1', [id]);
};

exports.list = async function(){
    return await database.queryRows('select * from furniture order by display_order');
};

exports.create = async function(data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const displayOrder = await getNextDisplayOrder();
    const query = 'insert into furniture (name, description, max_amount, internal, display_order) values ($1, $2, $3, $4, $5) returning id';
    const dataArr = [data.name, data.description, data.max_amount, data.internal, displayOrder];
    return await database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update furniture set name = $2, description = $3, max_amount = $4, internal = $5, display_order = $6 where id = $1';
    const dataArr = [id, data.name, data.description, data.max_amount, data.internal, data.display_order];

    await database.query(query, dataArr);
};

exports.delete = async function(id){
    const query = 'delete from furniture where id = $1';
    await database.query(query, [id]);
};

async function getNextDisplayOrder(){
    const result = await database.query('select max(display_order) as max_order from furniture');
    if (result.rows.length){
        return result.rows[0].max_order+1;
    } else {
        return 0;
    }
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
