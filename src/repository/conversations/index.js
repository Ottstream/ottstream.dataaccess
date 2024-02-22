const db = require('../../../db.pg');
const dbConstants = require('../../constants/db.config');

const table = db.table(dbConstants.tables.conversations);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  if (!body.name) return result(null, 'missing name');
  if (!body.type) return result(null, 'missing type');
  if (!body.provider) return result(null, 'missing provider');
  if (!Array.isArray(body.members) || !body.members.length)
    return result(null, 'members must be array and required has min 1 member');
  body.members = JSON.stringify(body.members);
  return await db.table(dbConstants.tables.conversations).insert(body).returning('*');
};

const getConversation = async (member, target) => {
  let conversation = await db
    .table(dbConstants.tables.conversations)
    .select()
    .whereRaw(`members @> '${JSON.stringify([member.id, target.id])}'::jsonb`)
    .where({ deleted: 0 });

  if (!conversation.length) {
    conversation = await db.table(dbConstants.tables.conversations)
      .insert({
        name: target.name,
        type: 'single',
        provider: member.provider,
        provider_id: 'new_provider_id',
        members: JSON.stringify([member.id, target.id])
      })
      .returning('*')
  }
  
  return result(conversation[0]);
};

const getUsersList = async (ids, limit = 10, page = 1) => {
  const list = await db
    .table(dbConstants.tables.conversations)
    .select()
    .whereRaw(`members @> '${ids}'::jsonb`)
    .where({ deleted: 0 })
    // .innerJoin(db.raw("jsonb_array_elements_text(conversations.members)::integer as member_id"), 'member_id', 'chat_members.id')
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const getList = async (filter, limit = 10, page = 1) => {
  const list = await db
    .table(dbConstants.tables.conversations)
    .select()
    .where({ ...filter, deleted: 0 })
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

const deleteConversation = async (id) => {
  const deletedList = await db
    .table(dbConstants.tables.conversations)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};

const update = async (id, body) => {
  const updatedList = await db.table(dbConstants.tables.conversations).where({ id }).update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getConversation,
  getUsersList,
  getList,
  deleteConversation,
  update,
};
