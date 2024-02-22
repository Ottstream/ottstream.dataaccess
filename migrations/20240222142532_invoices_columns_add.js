/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('invoices', (table) => {
        table.string('number').unsigned();
        table.string('mongo_id').unsigned();
        table.integer('state').defaultTo(0);
        table.integer('client').unsigned();
        table.foreign('client').references('clients.id');
        table.integer('user').unsigned();
        table.foreign('user').references('users.id');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
