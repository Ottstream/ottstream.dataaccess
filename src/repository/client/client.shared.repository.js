const { Client, ClientLocation } = require('../../models');

const addToClient = async (clientId, key, value) => {
  const client = await Client.findOne({ _id: clientId });
  if (client) {
    client[key].push(value);
    await client.save();
  }
};

const removeFromClient = async (clientId, key, value) => {
  const client = await Client.findOne({ _id: clientId });
  if (client) {
    if (!client[key]) client[key] = [];
    client[key] = client[key].filter((r) => r !== value);
    await client.save();
  }
};

const addToLocation = async (Id, key, value) => {
  const location = await ClientLocation.findOne({ _id: Id });
  if (location) {
    if (!location[key]) location[key] = [];
    location[key].push(value);
    await location.save();
  }
};

const removeFromLocation = async (Id, key, value) => {
  const location = await ClientLocation.findOne({ _id: Id });
  if (location) {
    if (!location[key]) location[key] = [];
    location[key] = location[key].filter((r) => r !== value);
    await location.save();
  }
};

const extractLocationData = async (locationObject, packageSubscriptions = []) => {
  return {
    login: locationObject.login,
    subscriptionExpireDate: locationObject.subscriptionExpireDate,
    server: locationObject.server,
    subscriptionState: locationObject.subscriptionState,
    updatedAt: locationObject.updatedAt,
    packageSubscriptions,
  };
};

// eslint-disable-next-line no-unused-vars
const updateClientLocationInfo = async (locationObject, remove = false, packageSubscriptoins = []) => {
  if (locationObject.clientId) {
    const clientId = locationObject.clientId._id
      ? locationObject.clientId._id.toString()
      : locationObject.clientId.toString();
    const client = await Client.findOne({ _id: clientId });
    const key = 'info';
    const subKey = 'locations';
    if (client) {
      let infoObject = {};
      if (client[key]) {
        infoObject = client[key];
      }
      if (!infoObject[subKey]) {
        infoObject[subKey] = [];
      }
      // infoObject[subKey] = infoObject[subKey].toJSON();
      const found = client[key][subKey].filter((r) => r.login === locationObject.login);
      if (!remove) {
        if (found.length) {
          // eslint-disable-next-line no-restricted-syntax
          for (const i in infoObject[subKey]) {
            if (infoObject[subKey][i].login === locationObject.login) {
              // eslint-disable-next-line no-await-in-loop
              infoObject[subKey][i] = await extractLocationData(locationObject, packageSubscriptoins);
            }
          }
        } else infoObject[subKey].push(await extractLocationData(locationObject, packageSubscriptoins));
      } else {
        infoObject[subKey] = infoObject[subKey].filter((r) => r.login !== locationObject.login);
      }
      infoObject.activePackages = 0;
      const names = [];
      // eslint-disable-next-line no-restricted-syntax
      for (const location of infoObject[subKey]) {
        if (location.subscriptionState === 3) {
          // eslint-disable-next-line no-restricted-syntax
          for (const packageSubscription of location.packageSubscriptions) {
            const { name } = packageSubscription.name[0];
            // eslint-disable-next-line no-unused-expressions
            !names.includes(name) ? names.push(name) : null;
          }
        }
      }
      infoObject.activePackages = names.length;
      await Client.updateOne({ _id: clientId }, { info: infoObject });
    }
  }
};

module.exports = {
  addToClient,
  removeFromClient,
  addToLocation,
  removeFromLocation,
  updateClientLocationInfo,
};
