const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");
const logger = require('../../utils/logger/logger');

const table = db.table(dbConstants.tables.users);
const result = (data, error) => ({ error, data });

const create = async (body, providerSqlId, mongo_id) => {
  console.log(body, "body users");
  if (!body.email) return result(null, "missing email");
  if (!body._id) return result(null, "missing mongo_id");

  // Check if user with the specified mongo_id already exists
  const existingUser = await db.table(dbConstants.tables.users)
    .where('mongo_id', body._id.toString())
    .first();

  if (existingUser) {
    // User with the specified mongo_id already exists
    logger.info("User already exists with mongo_id:", body._id.toString());
    return existingUser;
  }

  // User with the specified mongo_id does not exist, insert new user
  return await db.table(dbConstants.tables.users).insert({
    mongo_id: body._id.toString(),
    firstname: body.firstname,
    lastname: body.lastname,
    email: body.email,
    phone: body.phone,
    provider: providerSqlId,
    mongo_provider_id: mongo_id
  }).returning("*");
};
const getAllUsersTeamSql = async (providerSqlId, page, limit) => {
  const user = await db.table(dbConstants.tables.users)
    .select("*")
    .where({ deleted: '0', provider: providerSqlId })
    .offset((page - 1) * limit)
    .limit(limit); 
     return result(user);
};
const getUser = async (ids) => {
  const user = await db.table(dbConstants.tables.users)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(user);
};

const getUsersList = async (ids, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.users)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.users)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteUser = async (id) => {
  const deletedList = await db.table(dbConstants.tables.users)
    .where({ id })
    .update({ deleted: true,});
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.users).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getUser,
  getUsersList,
  getAllUsersTeamSql,
  getList,
  deleteUser,
  update,
};
