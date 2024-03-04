const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

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

const find = async (search) => {
  const members = await db.table(dbConstants.tables.chatMembers)
  .where(function () {
    this.whereRaw(`exists (select 1 from jsonb_array_elements(phones) as elem where elem->>'phoneNumber' like ?)`, [`%${search}%`]).orWhere(
      "name",
      "ILIKE",
      `%${search}%`
    );
  })
  .select("*");
  return result(members);
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

  return member[0];
};

const registerMember = async (chatMember) => {
  let member = await db.table(dbConstants.tables.chatMembers)
    .where(function () {
      this.where("client_id", user._id).orWhere("user_id", user._id);
    })
    .select("id")[0];
  if (!member) {
    member = await db.table(dbConstants.tables.chatMembers).insert(chatMember).returning("id")[0];
  }
  return result(member.id);
};

const findById = async (id) => {
  const member = await db.table(dbConstants.tables.chatMembers).where({ id }).select("*");
  return result(member[0]);
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
};