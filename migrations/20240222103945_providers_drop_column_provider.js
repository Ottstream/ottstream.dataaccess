/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('providers', (table) => {
        table.dropColumn('provider');
        // table.dropForeign(['provider'])
        table.string('parent_mongo_id').required();
        table.integer('phoneNumberId');
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
