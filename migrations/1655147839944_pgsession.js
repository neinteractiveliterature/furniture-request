/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createTable(
        'session',
        {
            'sid': {type: 'varchar', notNull: true},
            'sess': {type: 'json', notNull: true},
            'expire': {type: 'timestamp(6)', notNull:true}
        },
        { ifNotExists: true }
    );

    pgm.addConstraint('session', 'session_pkey', {
        primaryKey: 'sid',
        deferrable: false,
        deferred:false
    });
};

exports.down = pgm => {
    pgm.dropTable('session');

};
