const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");
const {getClientByProviderId} = require('../client/index');
const table = db.table(dbConstants.tables.conversations);
const result = (data, error) => ({ error, data });
const queryBuilder = require('../../helpers/pg.query')
const create = async (body) => {
  console.log(body.members);
  if (!body.name) return result(null, "missing name");
  if (!body.type) return result(null, "missing type");
  if (!body.provider) return result(null, "missing provider");
  return await db
    .table(dbConstants.tables.conversations)
    .insert(
      {
        name:body.name,
        type:body.type,
        members:JSON.stringify(body.members),
        provider:body.provider
      }
    )
    .returning("*");
};
const checkConversation = async (member, target) => {
  let conversation = await db
    .table(dbConstants.tables.conversations)
    .select()
    .whereRaw(`members @> '${JSON.stringify([member.id, target.id])}'::jsonb`)
    .where({ deleted: 0 })
    .returning("id");

  if (!conversation.length) {
  
    const members = JSON.stringify([member.id, target.id]);
    
    conversation = await db
      .table(dbConstants.tables.conversations)
      .insert({
        name: target.name,
        type: "single",
        provider: member.provider,
        members: members,
        isTeam: false
      })
      .returning("id");
  }

  const conversationId = conversation[0].id;

  conversation = await db.raw(queryBuilder.selectConversationsByMembersByIdQuery(conversationId)).then(res => res.rows[0])

  return conversation;
};
const getConversation = async (member, target, idsArray) => {
  console.log(target,member);
  let conversation = await db
    .table(dbConstants.tables.conversations)
    .select()
    .whereRaw(`members @> '${JSON.stringify([member.id, target.id])}'::jsonb`)
    .where({ deleted: 0 })
    .returning("id");

  if (!conversation.length || conversation.type === 'group') {
    const isMemberInArray = idsArray.includes(member.id);
    const isTargetInArray = idsArray.includes(target.id);
    const isTeam = isMemberInArray && isTargetInArray;
    const members = JSON.stringify([member.id, target.id]);
    
    conversation = await db
      .table(dbConstants.tables.conversations)
      .insert({
        name: target.name,
        type: "single",
        provider: member.provider,
        members: members,
        isTeam: isTeam
      })
      .returning("id");
  }

  const conversationId = conversation[0].id;

  conversation = await db.raw(queryBuilder.selectConversationsByMembersByIdQuery(conversationId)).then(res => res.rows[0])

  return conversation;
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


const getList = async (filter, limit, page) => {
  const conversationsIdList= await db
    .table(dbConstants.tables.conversations)
    .select()
    .where({ ...filter, deleted: 0 })
    .andWhere({ isTeam: false }) // Add the condition for isTeam here
    .limit(limit)
    .offset((page - 1) * limit);
    if (conversationsIdList.length > 0) {
      const list = await db.raw(queryBuilder.selectConversationsByMembersByIdsQuery(conversationsIdList.map(item => item.id))).then(res => res.rows)
      return result(list);
      
    }
      return []
};

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
      let updatedPinnedStatus = !conversation.pinned;
      let updatedPinnedBy = null;

      // Check if the conversation is being pinned or unpinned
      if (updatedPinnedStatus) {
        updatedPinnedBy = pinnedBy;
      }

      // Update the conversation in the database
      const updatedConversation = await db
        .table(dbConstants.tables.conversations)
        .where({ id })
        .update({ pinned: updatedPinnedStatus, pinnedBy: updatedPinnedBy });

      console.log(updatedConversation, "pinned:", updatedPinnedStatus);

      return { updatedConversation, updatedPinnedStatus };
    } else {
      console.log("Conversation not found");
      return null; // Or throw an error, depending on your use case
    }
  } catch (error) {
    console.error("Error toggling pinned status:", error);
    throw error; // Rethrow the error or handle it as appropriate
  }
}

const blockConversation = async (id) => {
  try {
    // Fetch the conversation from the database
    const conversation = await db
        .table(dbConstants.tables.conversations)
        .where({ id })
        .first();

    // If the conversation exists
    if (conversation) {
        // Update the pinned status based on its current value
        const updatedBlockedStatus = !conversation.blocked;

        // Update the conversation in the database
        const updatedConversation = await db
            .table(dbConstants.tables.conversations)
            .where({ id })
            .update({ blocked: updatedBlockedStatus,});

        console.log(updatedConversation, "Blocked:", updatedBlockedStatus);
        return updatedConversation;
    } else {
        console.log("Conversation not found");
        return null; // Or throw an error, depending on your use case
    }
} catch (error) {
    console.error("Error toggling pinned status:", error);
    throw error; // Rethrow the error or handle it as appropriate
}
};

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

const getTeamConversation = async() => {

    let data = await db
      .table(dbConstants.tables.conversations)
      .select("*")
      .where({ deleted: 0 })
      .andWhere({ isTeam: true }) // Add the condition for isTeam here
      .returning("id");
      const list = await db.raw(queryBuilder.selectConversationsByMembersByIdsQuery(data.map(item => item.id))).then(res => res.rows)

    return result(list)
}
module.exports = {
  create,
  getConversation,
  checkConversation,
  getTeamConversation,
  getUsersList,
  getList,
  deleteConversation,
  registerClientConversation,
  getByMongoProvider,
  update,
  getById,
  getByMongoId,
  pinConversations,
  blockConversation
};