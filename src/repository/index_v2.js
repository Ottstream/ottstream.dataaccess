// // repository/index.js
const userRepository = require("./user/index");
const providerRepository = require("./provider/index");
const clientRepository = require("./client/index");
const clientEmailRepository = require("./client/client_email.repositoryv2");
const clientPhoneRepository = require("./client/client_phone.repositoryv2");
const clientLocationRepository = require("./client/client_location.repositoryv2");

module.exports = {
  userRepository,
  providerRepository,
  clientRepository,
  clientEmailRepository,
  clientPhoneRepository,
  clientLocationRepository
};
