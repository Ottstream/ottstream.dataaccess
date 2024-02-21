  /**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
  exports.up = function(knex) {
    return knex.schema.createTable('messages', (table) => {
      table.increments('id').primary();
      table.integer('conversation').unsigned();
      table.foreign('conversation').references('conversations.id');
      table.integer('author').unsigned();
      table.foreign('author').references('chat_members.id');
      table.jsonb('files').defaultTo([]);
      table.string('provider').notNullable(); // messenger provider
      table.text('message').nullable().defaultTo(null)
      table.integer('reply_from').unsigned().nullable();
      table.foreign('reply_from').references('id').inTable('messages');
      table.integer('seen_by').unsigned();
      table.foreign('seen_by').references('chat_members.id');
      table.integer('deleted').defaultTo(0);
      table.date('deleted_at').defaultTo(null);
      table.integer('edited').defaultTo(0);
      table.integer('edited_at').defaultTo(null);
      table.timestamps(true, true);
  
      table.index(['provider', 'conversation', 'author'])
    })
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
    return knex.schema.dropTableIfExists('messages')
  };