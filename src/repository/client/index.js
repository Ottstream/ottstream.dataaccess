const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.clients);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.mongo_id) return result(null, "missing mongo_id");
  return await db.table(dbConstants.tables.clients).insert(body).returning("*");
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
};
