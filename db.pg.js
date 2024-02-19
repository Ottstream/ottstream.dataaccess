const knex = require("knex");
const Knexfile = require("./Knexfile");

module.exports = knex(Knexfile);