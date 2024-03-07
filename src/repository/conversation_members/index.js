const db = require("../../../db.pg");
const dbConstants = require("../../constants/db.config");

const create = async (body) => {
    const { conversation, chat_member, type, provider, is_client } = body;
    const convresation_member = await db.table(dbConstants.tables.conversation_members)
        .insert({ conversation, chat_member, type, provider, is_client })
        .returning('id')
    return await db.table(dbConstants.tables.conversation_members)
        .select('*')
        .where({ id: convresation_member[0].id })
        .leftJoin('conversations', `${dbConstants.tables.conversation_members}.conversation`, '=', `${dbConstants.tables.conversations}.id`)
        .leftJoin('chat_members', `${dbConstants.tables.conversation_members}.chat_member`, '=', `${dbConstants.tables.chatMembers}.id`)
}

const getByMembers = async (memberIdList) => {
    return await db.table(dbConstants.tables.conversation_members)
        .select('*')
        .whereIn('chat_member', memberIdList)
        .leftJoin('conversations', `${dbConstants.tables.conversation_members}.conversation`, '=', `${dbConstants.tables.conversations}.id`)
        .leftJoin('chat_members', `${dbConstants.tables.conversation_members}.chat_member`, '=', `${dbConstants.tables.chatMembers}.id`)
}

const getByProvider = async (provider) => {
    return await db.table(dbConstants.tables.conversation_members)
        .select('*')
        .where({ provider, is_client: 1 })
        .leftJoin('conversations', `${dbConstants.tables.conversation_members}.conversation`, '=', `${dbConstants.tables.conversations}.id`)
        .leftJoin('chat_members', `${dbConstants.tables.conversation_members}.chat_member`, '=', `${dbConstants.tables.chatMembers}.id`)
}

const remove = async (idList) => {
    return await db.table(dbConstants.tables.conversation_members)
        .whereIn('id', idList)
        .update({ deleted: 1 })
        .returning('id')
}

module.exports = { create, getByMembers, getByProvider, remove };