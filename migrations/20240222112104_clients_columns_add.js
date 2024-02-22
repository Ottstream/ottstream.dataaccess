/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('clients', (table) => {
        table.string('firstname');
        table.string('lastname');
        table.string('sex');
        table.string('mongo_id');
        table.boolean('deleted').defaultTo(0);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
