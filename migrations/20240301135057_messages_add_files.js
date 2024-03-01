/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('messages', (table) => {
        table.dropColumn('provider')
        table.jsonb('files').defaultTo([]);
        table.string('social_provider').defaultTo(null);
        table.string('provider_message_id').defaultTo(null);
      })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
