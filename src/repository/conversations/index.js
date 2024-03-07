const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const table = db.table(dbConstants.tables.conversations);
const result = (data, error) => ({ error, data });
const queryBuilder = require('../../helpers/pg.query')
const create = async (body) => {
  if (!body.name) return result(null, "missing name");
  if (!body.type) return result(null, "missing type");
  if (!body.provider) return result(null, "missing provider");
  return await db
    .table(dbConstants.tables.conversations)
    .insert(body)
    .returning("*");
};
const getConversation = async (member, target) => {
  console.log(member,"adsfdf");
  let conversation = await db
    .table(dbConstants.tables.conversations)
    .select()
    .whereRaw(`members @> '${JSON.stringify([member.id, target.id])}'::jsonb`)
    .where({ deleted: 0 })
    .returning("id");


  if (!conversation.length) {
    conversation = await db
      .table(dbConstants.tables.conversations)
      .insert({
        name: target.name,
        type: "single",
        provider: member.provider,
        members: JSON.stringify([member.id, target.id]),
      })
      .returning("id");
  }
  const conversationId = conversation[0].id

  conversation = await db.raw(queryBuilder.selectConversationsByMembersByIdQuery(conversationId)).then(res => res.rows[0])
  console.log(conversation,7898456);
  return result(conversation);
};

const getByMongoProvider = async (mongoProvider) => {
  console.log(mongoProvider,"mongoProvider");
  let provider = await db
    .table(dbConstants.tables.providers)
    .where({ mongo_id: mongoProvider._id.toString() })
console.log(provider,456);
  if (provider.length === 0) {
    provider = await db
      .table(dbConstants.tables.providers)
      .insert({
        mongo_id: mongoProvider._id.toString(),
        name: mongoProvider.name[0].name
      })
      .returning('*')
  }
console.log(provider,789);
  return  result(provider[0])
}

const registerClientConversation = async (id, body) => {
  let conversation = await db
    .table(dbConstants.tables.conversations)
    .whereRaw(`members @> '${JSON.stringify([id])}'::jsonb`)
    .select("*");

  if (!conversation.length) {
    conversation = await db
      .table(dbConstants.tables.conversations)
      .insert(body)
      .returning("*");
  }
  return conversation[0];
};
const getUsersList = async (ids, limit = 10, page = 1) => {
  const conversationsIdList = await db
  .table(dbConstants.tables.conversations)
  .select('id')
  .whereRaw(`members @> '${ids}'::jsonb`)
  .where({ deleted: 0 })
  .limit(limit)
  .offset((page - 1) * limit);

  const list = await db.raw(queryBuilder.selectConversationsByMembersByIdsQuery(conversationsIdList.map(item => item.id))).then(res => res.rows)
  return result(list);
};
// const getUsersList = async (ids, limit = 10, page = 1) => {
//   const list = await db
//     .table(dbConstants.tables.conversations)
//     .select()
//     .whereRaw(`members @> '${ids}'::jsonb`)
//     .where({ deleted: 0 })
//     // .innerJoin(db.raw("jsonb_array_elements_text(conversations.members)::integer as member_id"), 'member_id', 'chat_members.id')
//     .limit(limit)
//     .offset((page - 1) * limit);
//   return result(list);
// };

// const getList = async (filter, limit = 10, page = 1) => {
//   let list = await db
//     .table(dbConstants.tables.conversations)
//     .select('id')
//     .where({ ...filter, deleted: 0 })
//     .limit(limit)
//     .offset((page - 1) * limit);

//   // Extract member IDs from the list
//   const memberIds = list.map(item => item.id) // Assuming members is an array of member IDs
//   console.log(memberIds,455623);
//   list = await db.raw(queryBuilder.selectConversationsByMembersByIdsQuery(memberIds)).then(res => res.rows)

//   return result(list);
// };
const getList = async (filter, limit = 10, page = 1) => {
  let list;
  // let list = await db
  //   .table(dbConstants.tables.conversations)
  //   .select('id')
  //   .where({ ...filter, deleted: 0 })
  //   .limit(limit)
  //   .offset((page - 1) * limit);

  // Extract member IDs from the list
//  if (list.length === 0) {
  // console.log(filter,"filter");
const data = await getClientByProviderId(filter, limit = 10, page = 1);
console.log(data);
return data
// };
// return result(list);
}
const getByMongoId = async (mongo_id) => {
  const provider = await db
    .table(dbConstants.tables.providers)
    .where({ mongo_id })
    .select('*')
  return result(provider[0])
}
const deleteConversation = async (id) => {
  const deletedList = await db
    .table(dbConstants.tables.conversations)
    .where({ id })
    .update({ deleted: 1, deleted_at: new Date() });
  return result(deletedList);
};
// const pinConversations = async (id, pinnedBy) => {
//   const pinnedConversation = await db
//     .table(dbConstants.tables.conversations)
//     .where({ id })
//     .update({ pinned: true, pinnedBy });
//   console.log(pinnedConversation, ":pinned");
//   return pinnedConversation;
// };
const pinConversations = async(id, pinnedBy) => {
  try {
      // Fetch the conversation from the database
      const conversation = await db
          .table(dbConstants.tables.conversations)
          .where({ id })
          .first();

      // If the conversation exists
      if (conversation) {
          // Update the pinned status based on its current value
          const updatedPinnedStatus = !conversation.pinned;

          // Update the conversation in the database
          const updatedConversation = await db
              .table(dbConstants.tables.conversations)
              .where({ id })
              .update({ pinned: updatedPinnedStatus, pinnedBy });

          console.log(updatedConversation, "pinned:", updatedPinnedStatus);
          return updatedConversation;
      } else {
          console.log("Conversation not found");
          return null; // Or throw an error, depending on your use case
      }
  } catch (error) {
      console.error("Error toggling pinned status:", error);
      throw error; // Rethrow the error or handle it as appropriate
  }
}
const getById = async (id) => {
  const conversation = await db
    .table(dbConstants.tables.conversations)
    .where({ id })
    .select("*")
    .leftJoin("chat_members", function () {
      this.on(
        "chat_members.id",
        "in",
        knex.raw("jsonb_array_elements_text(conversations.members)::integer")
      );
    });
  return conversation[0];
};

const update = async (id, body) => {
  const updatedList = await db
    .table(dbConstants.tables.conversations)
    .where({ id })
    .update(body);
  return result(updatedList);
};

module.exports = {
  create,
  getConversation,
  getUsersList,
  getList,
  deleteConversation,
  registerClientConversation,
  getByMongoProvider,
  update,
  getById,
  getByMongoId,
  pinConversations
};