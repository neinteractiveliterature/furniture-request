'use strict';
const database = require('../lib/database');
const validator = require('validator');

exports.get = async function(id){
    return database.querySingle('select * from furniture where id = $1', [id]);
};

exports.list = async function(){
    return database.queryRows('select * from furniture order by display_order');
};

exports.listByParent = async function(parentId){
    if (!parentId){
        return database.queryRows('select * from furniture where parent is null order by display_order');
    }
    return database.queryRows('select * from furniture where parent = $1 order by display_order', [parentId]);
}

exports.create = async function(data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const displayOrder = await getNextDisplayOrder();
    const query = 'insert into furniture (name, description, max_amount, internal, display_order, parent) values ($1, $2, $3, $4, $5, $6) returning id';
    const dataArr = [data.name, data.description, data.max_amount, data.internal, displayOrder, data.parent];
    return database.insertReturningId(query, dataArr);
};

exports.update = async function(id, data){
    if (!validate(data)){
        throw new Error('Invalid Data');
    }
    const query = 'update furniture set name = $2, description = $3, max_amount = $4, internal = $5, display_order = $6, parent = $7 where id = $1';
    const dataArr = [id, data.name, data.description, data.max_amount, data.internal, data.display_order, data.parent];

    return database.query(query, dataArr);
};

exports.delete = async function(id){
    const query = 'delete from furniture where id = $1';
    return database.query(query, [id]);
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
