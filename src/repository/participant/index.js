const db = require('../../../db.pg')
const dbConstants = require('../../constants/db.config')

class ParticipantRepo {
    #table = db.table(dbConstants.tables.participants)
    #result = (data, error) => ({ data, error })

    async create(body) {
        if (!Array.isArray(body.phones) || !body.phones.length) return this.#result(null, 'missing phones')
        if (!body.client && !body.participant_type) return this.#result(null, 'invalid participant type, client invalid')
        const participant = await this.#table.insert(body).returning('*')
        return this.#result(participant)
    }

    async createMany(list) {
        const createdList = await this.#table.insert(list).returning('*')
        return this.#result(createdList)
    }

    async getAll(filter = {}) {
        const list = await this.#table.select().where(filter)
        return this.#result(list)
    }
}

module.exports = new ParticipantRepo()