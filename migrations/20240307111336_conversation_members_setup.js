/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('conversation_members', (table) => {
    table.integer('pinned').defaultTo(0);
    table.integer('blocked').defaultTo(0);
    table.string('type').defaultTo('single');
    table.integer('is_client').defaultTo(0);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
