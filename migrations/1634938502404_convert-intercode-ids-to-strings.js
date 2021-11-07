/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.alterColumn('users', 'intercode_id', { type: 'text' });
    pgm.createIndex('users', 'intercode_id');

    pgm.alterColumn('runs', 'id', { type: 'text' });
    pgm.alterColumn('runs', 'event_id', { type: 'text' });

    pgm.alterColumn('requests', 'run_id', { type: 'text' });
    pgm.alterColumn('requests', 'room_id', { type: 'text' });
};

exports.down = pgm => {
    pgm.alterColumn('requests', 'run_id', { type: 'integer' });
    pgm.alterColumn('requests', 'room_id', { type: 'integer' });

    pgm.alterColumn('runs', 'id', { type: 'integer' });
    pgm.alterColumn('runs', 'event_id', { type: 'integer' });

    pgm.dropIndex('users', 'intercode_id');
    pgm.alterColumn('users', 'intercode_id', { type: 'integer', using: 'intercode_id::integer' });
};
