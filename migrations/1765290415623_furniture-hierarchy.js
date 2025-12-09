/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.addColumns('furniture', {
        parent: {type: 'integer', references: 'furniture(id)' }
    });
};

exports.down = pgm => {
    pgm.dropColumns('furniture', ['parent']);
};
