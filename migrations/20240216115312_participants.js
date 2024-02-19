/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('participants', (table) => {
        table.increments('id').primary();
        table.json('phones').defaultTo([]);
        table.string('provider').defaultTo(null);
        table.string('participant_type').defaultTo(null);
        table.string('client').defaultTo(null);
        table.timestamps(true, true);
    })
  };
  
  /**
  * @param { import("knex").Knex } knex
  * @returns { Promise<void> }
  */
  exports.down = function(knex) {
  return knex.schema.dropTableIfExists('participants')
  };