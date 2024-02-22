/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('transactions', (table) => {
        table.increments('id').primary();
        table.string('number');
        table.integer('client').unsigned();
        table.foreign('client').references('clients.id');
        table.integer('provider').unsigned();
        table.foreign('provider').references('providers.id');
        table.integer('invoice').unsigned();
        table.foreign('invoice').references('invoices.id');
        table.timestamps(true, true);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
