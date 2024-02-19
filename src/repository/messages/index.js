const db = require('../../../db.pg')
const dbConstants = require('../../constants/db.config')

class MessagesRepo {
    get #table() {
        return db.table(dbConstants.tables.messages)
    }
    #result = (data, error) => ({ data, error })

    async create(body) {
        if (!body.conversation) return this.#result(null, 'missing conversation')
        if (!body.author) return this.#result(null, 'missing author')

        const message = await this.#table
            .insert(body).returning('*')
        return this.#result(message)
    }

    async delete(id) {
        const deletedList = await this.#table 
            .where({ id })
            .update({ deleted: 1, deleted_at: new Date() })
        return this.#result(deletedList)
    }

    async getList(filter, sortBy = 'created_at', sort = 'desc', limit = 10, page = 1) {
        if (!filter.conversation) return this.#result(null, 'filter by conversation required!')
        const list = await this.#table
            .select()
            .where({ ...filter, deleted: 0})
            .orderBy(sortBy, sort)
            .limit(limit)
            .offset((page - 1) * limit)
        return this.#result(list)
    }

    async edit(id, body) {
        const editedMesssage = await this.#table
            .where({ id })
            .update(body)
        return this.#result(editedMesssage)
    }

}

module.exports = new MessagesRepo()