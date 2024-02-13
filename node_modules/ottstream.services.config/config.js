const Joi = require('joi');
const dotenv = require('dotenv').config()
const configSchema = require('./configSchema');

class Config {
  static readEnv() {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
  }
}

module.exports = { Config };
