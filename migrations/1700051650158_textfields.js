/* eslint-disable camelcase */
'use strict';

exports.up = pgm => {
    pgm.createTable(
        'display_text',
        {
            'id': {type: 'serial'},
            'name': {type: 'varchar', notNull: true},
            'description': {type: 'text', notNull: true},
            'content': {type: 'text', notNull: true}
        },
        { ifNotExists: true }
    );

    pgm.addConstraint('display_text', 'texts_pkey', {
        primaryKey: 'id',
        deferrable: false,
        deferred:false
    });
    pgm.addConstraint('display_text', 'texts_name_uk', {
        unique: 'name',
        deferrable: false,
        deferred:false
    });
};

exports.down = pgm => {
    pgm.dropTable('display_text');
};
