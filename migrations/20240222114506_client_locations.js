/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('client_locations', (table) => {
        table.increments('id').primary();
        table.string('login').unsigned();
        table.string('password').unsigned();
        table.integer('client').unsigned();
        table.foreign('client').references('clients.id');
        table.boolean('deleted').defaultTo(0),
        table.timestamps(true, true);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
