/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("chat_members", (table) => {
    table.increments("id").primary();
    table.string("user_id").defaultTo(null);
    table.string('client_id').defaultTo(null);
    table.string("provider").defaultTo(null); // witch provider user is this
    table.string("avatar").defaultTo(null);
    table.string("name").defaultTo("<anonymus>");
    table.jsonb("phones").defaultTo([]);
    table.timestamps(true, true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("chat_members");
};
