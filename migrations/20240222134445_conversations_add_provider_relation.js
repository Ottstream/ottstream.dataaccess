/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('conversations', (table) => {
    table.integer('provider').unsigned();
    table.boolean('pinned').defaultTo(false)
    table.jsonb('pinnedBy').defaultTo([]);
    table.boolean('blocked').defaultTo(false)
    table.foreign('provider').references('providers.id');
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
