/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('conversation_members', (table) => {
        table.increments("id").primary();   
        table.integer('conversation').unsigned();
        table.foreign('conversation').references('conversations.id');
        table.integer('chat_member').unsigned();
        table.foreign('chat_member').references('chat_members.id');
        table.timestamps(true, true);
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('conversation_members')
};
