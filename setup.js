const mongoose = require("mongoose");
const autoIncrement = require("./src/utils/mongoose-auto-increment");
const logger = require("./src/utils/logger/logger");
const config = require("./config");
class DbSetup {
  static async initDb() {
    const connectDB = async () => {
      try {
        await mongoose.connect(
          config.getConfig().mongoose.url,
          config.getConfig().mongoose.options
        );
        logger.info("Connected to MongoDB");

        // Initialize auto-increment plugin
        autoIncrement.initialize(mongoose.connection);

        // Execute migrations
        // await this.runMigrations();

        // After migrations are finished, call seed initialization function
      } catch (error) {
        logger.error(error);
        // Retry connection if failed
        await connectDB();
      }
    };

    await connectDB();
  }

  static async runMigrations() {
    try {
      const knex = require('./db.pg');
      await knex.migrate.latest();
      console.log('Migrations are finished');
    } catch (error) {
      console.error('Error running migrate latest:', error);
      throw error; // Rethrow error to be caught by the caller
    }
  }

}

module.exports = DbSetup;