const db = require('../../../db.pg')
const dbConstants = require('../../constants/db.config')

const result = (data, error) => ({ data, error })

const create = async (body) => {
    if (!body.conversation) return result(null, 'missing conversation')
    if (!body.author) return result(null, 'missing author')
    const message = await db.table(dbConstants.tables.messages)
        .insert(body).returning('*')
    return result(message)
}

const deleteMessage = async (id) => {
    const deletedList = await db.table(dbConstants.tables.messages) 
        .where({ id })
        .update({ deleted: 1, deleted_at: new Date() })
    return result(deletedList)
}
const getList = async (filter, type, limit = 10, page = 1, sortBy = 'created_at', sort = 'desc') => {
    try {
      if (!filter.conversation) {
        return result(null, 'Filter by conversation required!');
      }
  
      let query = db.table(dbConstants.tables.messages)
        .select()
        .where({ ...filter, deleted: 0 })
        .orderBy(sortBy, sort)
        .limit(limit)
        .offset((page - 1) * limit);
  
      if (type !== 'all') {
        query = query.andWhere('social_provider', type);
      }
  
      const list = await query;
  
      return result(list);
    } catch (error) {
      console.error("Error fetching list:", error);
      throw error;
    }
  };


const edit = async (id, body) => {
    const editedMesssage = await db.table(dbConstants.tables.messages)
        .where({ id })
        .update(body)
    return result(editedMesssage)
}
const findMessagesList = async (find, id) => {
    try {
      // Construct the query to search for messages based on conversationId and the provided find criteria
      const messages = await db.table(dbConstants.tables.messages)
        .where({ conversation: id })
        .where('message', 'like', `%${find}%`)
  
      return messages;
    } catch (error) {
      throw error;
    }
  };


  
module.exports = {
    create,
    deleteMessage,
    getList,
    edit,
    findMessagesList,

}