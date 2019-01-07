
CREATE OR REPLACE FUNCTION update_created_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.created = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

create table users (
    id          serial,
    name        varchar(80),
    email       varchar(100),
    intercode_id  integer not null,
    PRIMARY KEY (id)
);

create table furniture (
    id          serial,
    name        varchar(80),
    description text,
    max_amount int not null,
    display_order int not null,
    internal boolean default false,
    primary key(id)
);

create table runs (
    id int not null,
    event_id int not null,
    notes text,
    food text,
    no_furniture boolean default false,
    created_by int not null,
    created timestamp DEFAULT now(),
    primary key (id),
    foreign key (created_by)
        references users(id)
);

CREATE TRIGGER update_runs_created BEFORE UPDATE
    ON runs FOR EACH ROW EXECUTE PROCEDURE
    update_created_column();

create table requests (
    id serial,
    run_id int not null,
    room_id int not null,
    furniture_id int not null,
    amount int,
    created timestamp DEFAULT now(),
    created_by int,
    foreign key (furniture_id)
        references furniture(id)
        on delete cascade,
    foreign key (created_by)
        references users(id)
);

 CREATE TRIGGER update_requests_created BEFORE UPDATE
    ON requests FOR EACH ROW EXECUTE PROCEDURE
    update_created_column();
