const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.users);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.email) return result(null, "missing email");
  if (!body.mongo_id) return result(null, "missing mongo_id");
  if (!body.password) return result(null, "missing password");
  return await db.table(dbConstants.tables.users).insert(body).returning("*");
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
    .update({ deleted: 1, deleted_at: new Date() });
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
  getList,
  deleteUser,
  update,
};
