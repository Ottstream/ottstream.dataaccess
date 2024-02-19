module.exports = {
  client: "pg",
  connection: {
    port: 5432,
    host: "127.0.0.1",
    user: "postgres",
    password: "1111",
    database: "ottstream_chat",
  },
  acquireConnectionTimeout: 10000,
  migrations: {
    directory: "./migrations",
  },
  seeds: {
    directory: "./seeds",
  },
};
