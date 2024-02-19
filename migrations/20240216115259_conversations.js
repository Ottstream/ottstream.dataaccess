/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('conversations', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('type').notNullable();
      table.string('provider').notNullable();
      table.json('members').notNullable();
      table.integer('deleted').defaultTo(0);
      table.date('deleted_at').defaultTo(null);
      table.timestamps(true, true);
    })
  };
  
  /**
   * @param { import("knex").Knex } knex
   * @returns { Promise<void> }
   */
  exports.down = function(knex) {
      return knex.schema.dropTableIfExists('convers')
  };