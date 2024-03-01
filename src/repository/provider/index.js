const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.providers);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.mongo_id) return result(null, "missing mongo_id");
  return await db.table(dbConstants.tables.providers).insert(body).returning("*");
};

const get = async (ids) => {
  const provider = await db.table(dbConstants.tables.providers)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })[0];
  return result(provider);
};

const getByMongoId = async (mongo_id) => {
  const provider = await db
    .table(dbConstants.tables.providers)
    .where({ mongo_id })
    .select('*')
  return result(provider[0])
}

const getByMongoProvider = async (mongoProvider) => {
  let provider = await db
    .table(dbConstants.tables.providers)
    .where({ mongo_id: mongoProvider._id.toString() })

  if (!provider) {
    provider = await db
      .table(dbConstants.tables.providers)
      .insert({
        mongo_id: mongoProvider._id.toString(),
        name: mongoProvider.name[0].name
      })
      .returning('*')
  }

  return result(provider[0])
}

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.providers)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteProvider = async (id) => {
  const deletedList = await db.table(dbConstants.tables.providers)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.providers).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  get,
  getList,
  deleteProvider,
  getByMongoProvider,
  update,
  getByMongoId
};
