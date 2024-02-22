const { Config } = require('ottstream.services.config');
Config.readEnv('./.env');
const config = require('./config');
config.initConfig();

console.log(config.getConfig().pg.db)


module.exports = {
  client: "pg",
  connection: {
    port: 5432,
    host: config.getConfig().pg.host,
    user: config.getConfig().pg.user,
    password: config.getConfig().pg.password,
    database: config.getConfig().pg.db,
  },
  acquireConnectionTimeout: 10000,
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};
