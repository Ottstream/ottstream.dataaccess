/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('files', (table) => {
        table.increments('id').primary();
        table.string('name').unsigned()
        table.string('path').unsigned();
        table.string('destination').unsigned();
        table.string('filename').unsigned();
        table.string('mimetype').unsigned();
        table.string('encoding').unsigned();
        table.float('size').unsigned();
        table.integer('deleted').defaultTo(0);
        table.integer('user').unsigned();
        table.foreign('user').references('users.id');
        table.timestamps(true, true);
      })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
