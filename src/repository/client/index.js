const logger = require("ottstream.dataaccess/src/utils/logger/logger");
const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");
const {getAllClients} = require('./client.repository');

const table = db.table(dbConstants.tables.clients);
const result = (data, error) => ({ error, data });

const create = async (member, providerID) => {
  if (!member._id) {
    return logger.error("No missing Mongo_id clients");
  }

  // Check if the member already exists
  const existingMember = await db.table(dbConstants.tables.clients)
    .where('mongo_id', member._id)
    .first();

  // If the member already exists, return it
  if (existingMember) {
    logger.info("Member already exists:", existingMember);
    return existingMember;
  }

  // If the member does not exist, insert it into the database
  const insertedMember = await db.table(dbConstants.tables.clients).insert({
    mongo_id: member._id,
    firstname: member.personalInfo.firstname,
    lastname: member.personalInfo.lastname,
    sex: member.personalInfo.sex,
    provider: providerID
  }).returning("*");

  return insertedMember[0];
};
const getClientByProviderId = async(providerID,search) => {
  // console.log(filter,"filter");
  const data = await getAllClients(providerID,search);
  // console.log(data,"dada");

  return result(data)
}
const getClientByProviderSqlId = async (providerSqlId ,page , limit) => {
  try {
    const clients = await db.table(dbConstants.tables.clients)
        .select('*')
        .where({ deleted: '0', provider: providerSqlId })
        .limit(limit)
        .offset((page - 1) * limit);
    return result(clients);
} catch (error) {
    throw error;
}
};
const getClient = async (ids) => {
  const client = await db.table(dbConstants.tables.clients)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(client);
};

const getClientsList = async (ids, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.clients)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.clients)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteClient = async (id) => {
  const deletedList = await db.table(dbConstants.tables.clients)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.clients).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getClient,
  getClientsList,
  getList,
  deleteClient,
  update,
  getClientByProviderId,
  getClientByProviderSqlId
};
