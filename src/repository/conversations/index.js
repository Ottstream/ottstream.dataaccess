const db = require('../../../db.pg')
const dbConstants = require('../../constants/db.config')

class ConversationRepo {
    get #table() {
        return db.table(dbConstants.tables.conversations)
    }
    #result = (data, error) => ({ error, data })

    async create(body) {
        if (!body.name) return this.#result(null, 'missing name')
        if (!body.type) return this.#result(null, 'missing type')
        if (!body.provider) return this.#result(null, 'missing provider')
        if (!Array.isArray(body.members) || !body.members.length) return this.#result(null, 'members must be array and required has min 1 member')
        body.members = JSON.stringify(body.members)
        return await this.#table.insert(body).returning('*')
    }

    async getList(filter, limit = 10, page = 1) {
        const list = await this.#table
            .select()
            .where({ ...filter, deleted: 0 })
            .limit(limit)
            .offset((page - 1) * limit)
        return this.#result(list)
    }

    async delete (id) {
        const deletedList = await this.#table
            .where({ id })
            .update({ deleted: 1, deleted_at: new Date() })
        return this.#result(deletedList)
    }

    async update (id, body) {
        const updatedList = await this.#table
            .where({ id })
            .update(body)
        return this.#result(updatedList)
    }

}

module.exports = new ConversationRepo()