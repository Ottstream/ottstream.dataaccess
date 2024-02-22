const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.files);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.path) return result(null, "missing path");
  return await db.table(dbConstants.tables.files).insert(body).returning("*");
};

const getFile = async (ids) => {
  const file = await db.table(dbConstants.tables.files)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(file);
};

const getFilesList = async (ids, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.files)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.files)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteFile = async (id) => {
  const deletedList = await db.table(dbConstants.tables.files)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.files).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getFile,
  getFilesList,
  getList,
  deleteFile,
  update,
};
