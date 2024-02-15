const mongoose = require('mongoose');
const autoIncrement = require('./src/utils/mongoose-auto-increment');
const logger = require('./src/utils/logger/logger');
const config = require('./config');

class DbSetup {

    static initDb() {
        const self = this;
        const connectDB = () => {
            mongoose
              .connect(config.getConfig().mongoose.url, config.getConfig().mongoose.options)
              .then(async () => {
                logger.info('Connected to MongoDB');
          
                // delete all collections
                // await Promise.all(
                //   Object.values(mongoose.connection.collections).map(async (collection) => {
                //     collection.deleteMany();
                //   })
                // );
                autoIncrement.initialize(mongoose.connection);
              })
              .catch((error) => {
                logger.error(error);
                connectDB();
              });
          };
          
          connectDB();
    }
}

module.exports = DbSetup