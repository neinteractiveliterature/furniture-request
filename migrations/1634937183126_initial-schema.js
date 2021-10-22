/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.createFunction(
        'update_created_column',
        [],
        { returns: 'trigger', replace: true, language: 'plpgsql' },
        `
        BEGIN
            NEW.created = now();
            RETURN NEW;
        END;
        `
    );

    pgm.createTable(
        'users',
        {
            id: 'id',
            name: 'varchar(80)',
            email: 'varchar(100)',
            intercode_id: { type: 'integer', notNull: true }
        },
        { ifNotExists: true }
    );

    pgm.createTable(
        'furniture',
        {
            id: 'id',
            name: 'varchar(80)',
            description: 'text',
            max_amount: { type: 'int', notNull: true },
            display_order: { type: 'int', notNull: true },
            internal: { type: 'boolean', default: false }
        },
        { ifNotExists: true }
    );

    pgm.createTable(
        'runs',
        {
            id: 'id',
            event_id: { type: 'int', notNull: true },
            notes: 'text',
            food: 'text',
            no_furniture: { type: 'boolean', default: false },
            created_by: { type: 'int', notNull: true, references: 'users(id)' },
            updated_by: { type: 'int' },
            created: { type: 'timestamp', default: 'now()' },
        },
        { ifNotExists: true }
    );

    pgm.dropTrigger('runs', 'update_runs_created', { ifExists: true });
    pgm.createTrigger(
        'runs',
        'update_runs_created',
        {
            when: 'BEFORE',
            operation: 'UPDATE',
            function: 'update_created_column',
            level: 'ROW',
        }
    );

    pgm.createTable(
        'requests',
        {
            id: 'id',
            run_id: { type: 'int', notNull: true },
            room_id: { type: 'int', notNull: true },
            furniture_id: {
                type: 'int',
                notNull: true,
                references: 'furniture(id)',
                onDelete: 'cascade'
            },
            amount: 'int',
            created: { type: 'timestamp', default: 'now()' },
            created_by: { type: 'int', references: 'users(id)' },
        },
        { ifNotExists: true }
    );

    pgm.dropTrigger('requests', 'update_requests_created', { ifExists: true });
    pgm.createTrigger(
        'requests',
        'update_requests_created',
        {
            when: 'BEFORE',
            operation: 'UPDATE',
            function: 'update_created_column',
            level: 'ROW',
        }
    );
};

exports.down = pgm => {
    pgm.dropTable('requests');
    pgm.dropTrigger('runs', 'update_runs_created');
    pgm.dropTable('runs');
    pgm.dropTable('furniture');
    pgm.dropTable('users');
    pgm.dropFunction('update_created_column');
};
