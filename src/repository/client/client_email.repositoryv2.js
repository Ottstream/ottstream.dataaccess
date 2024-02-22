const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.client_emails);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.email) return result(null, "missing email");
  return await db.table(dbConstants.tables.client_emails).insert(body).returning("*");
};

const getClientEmail = async (ids) => {
  const client = await db.table(dbConstants.tables.client_emails)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(client);
};

const getClientEmailsList = async (ids, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.client_emails)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.client_emails)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteClientEmail = async (id) => {
  const deletedList = await db.table(dbConstants.tables.client_emails)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.client_emails).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getClientEmail,
  getClientEmailsList,
  getList,
  deleteClientEmail,
  update,
};
