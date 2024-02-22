const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.client_phones);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.login) return result(null, "missing login");
  return await db.table(dbConstants.tables.client_phones).insert(body).returning("*");
};

const getClientPhone = async (ids) => {
  const client = await db.table(dbConstants.tables.client_phones)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(client);
};

const getClientPhonesList = async (ids, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.client_phones)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.client_phones)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteClientPhone = async (id) => {
  const deletedList = await db.table(dbConstants.tables.client_phones)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.client_phones).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getClientPhone,
  getClientPhonesList,
  getList,
  deleteClientPhone,
  update,
};
