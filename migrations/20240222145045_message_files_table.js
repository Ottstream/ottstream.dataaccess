/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('message_files', (table) => {
    table.increments("id").primary();   
    table.integer('message').unsigned();
    table.foreign('message').references('messages.id');
    table.integer('file').unsigned();
    table.foreign('file').references('files.id');
    table.timestamps(true, true);
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
