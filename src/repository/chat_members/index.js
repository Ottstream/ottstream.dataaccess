const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");
const {getClientByProviderId} = require('../client/index')
const table = db.table(dbConstants.tables.chatMembers);
const result = (data, error) => ({ error, data });

const create = async (body) => {
  const member = await db.table(dbConstants.tables.chatMembers).insert(body).returning("*");
  return result(member[0]);
};

const findByUserId = async (id) => {
  const member = await db.table(dbConstants.tables.chatMembers)
    .where(function () {
      this.where("client_id", id).orWhere("user_id", id);
    })
    .select("*");
  return result(member[0]);
};

const getMemberByClientId = async (id) => {
  const member = await db
    .table(dbConstants.tables.chatMembers)
    .where({ id })
    .select('*')
  return result(member[0]);
}

const getMemberByIdOrClientId = async (id) => {
  const member = await db.table(dbConstants.tables.chatMembers)
    .where(function () {
      this.where("id", id).orWhere("client_id", id);
    })
    .select("*");
  return result(member[0]);
};

const find = async (user,type, search) => {
  const providerId = user.provider._id;
  console.log(providerId,"providerID");
  if (type === 'client') {
    const users = await getClientByProviderId(providerId,search)
  
    return result(users);
  }
  // const members = await db.table(dbConstants.tables.chatMembers)
  // .where(function () {
  //   this.whereRaw(`exists (select 1 from jsonb_array_elements(phones) as elem where elem->>'phoneNumber' like ?)`, [`%${search}%`]).orWhere(
  //     "name",
  //     "ILIKE",
  //     `%${search}%`
  //   );
  // })
  // .select("*");
  // // console.log();
  // return result(members);
};

const registerUserMember = async (user, provider) => {
  let member = await db.table(dbConstants.tables.chatMembers).where({ user_id: user._id.toString() }).returning("*");
  if (!member.length) {
    member = await db.table(dbConstants.tables.chatMembers)
      .insert({
        user_id: user._id.toString(),
        provider: provider.id,
        avatar: user.avatar,
        name: user.firstname + " " + user.lastname,
        phones: JSON.stringify([user.phone]),
      })
      .returning("*");
  }

  return member;
};
const registerMember = async (chatMembers, type, providerSqlId) => {
  const registeredMembers = [];
  
  // Ensure chatMembers is always iterable
  const iterableChatMembers = Array.isArray(chatMembers) ? chatMembers : [chatMembers];

  for (const chatMember of iterableChatMembers) {
    try {
      let member;
      if (type === 'client') {
        member = await db.table(dbConstants.tables.chatMembers)
          .where('client_id', chatMember.client_id)
          .select('*')
          .first();
      } else {
        member = await db.table(dbConstants.tables.chatMembers)
          .where('user_id', '=', chatMember.user_id)
          .select('*')
          .first();
      }

      
      if (!member) {
        member = await db.table(dbConstants.tables.chatMembers)
          .insert({
            ...(type === 'client' ? { client_id: chatMember.client_id } : { user_id: chatMember.user_id }),
            name: chatMember.name,
            avatar: chatMember.avatar || '', // Assuming avatar might be undefined, set it to an empty string if not provided
            phones: JSON.stringify(chatMember.phones), // Convert to JSON string
            provider: providerSqlId
          })
          .returning('*')
          .then(ids => ids[0]);
      }

      registeredMembers.push(member);
    } catch (error) {
      console.error("Error registering member:", error);
      throw error;
    }
  }
  
  return registeredMembers;
};


const findById = async (id) => {
  const member = await db.table(dbConstants.tables.chatMembers).where({ id }).select("*");
  return result(member[0]);
};
const findBySqlProviderId = async (id) => {
  console.log(id);
  const member = await db
    .table(dbConstants.tables.chatMembers)
    .where({ provider:id })
    .whereNotNull('user_id') // Filter where user_id is not null
    .select("id")
    .returning("id")
    .orderBy("id")
  return result(member);
};
const getList = async (filter, limit = 10, page = 1) => {
  const list = await db.table(dbConstants.tables.chatMembers)
    .where(filter)
    .select("*")
    .limit(limit)
    .offset((page - 1) * limit);
  return result(list);
};

module.exports = {
  create,
  findByUserId,
  getMemberByIdOrClientId,
  find,
  registerUserMember, 
  registerMember,
  findById,
  getMemberByClientId,
  getList,
  findBySqlProviderId,
  
};