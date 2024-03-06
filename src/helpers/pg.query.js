class PgQueryBuilder {

    selectConversationsByMembersByIdQuery(id) {
        return `SELECT conversations.id, conversations.name, conversations.type, conversations.created_at, jsonb_agg(jsonb_build_object('id', subquery.member_id, 'name', subquery.member_name, 'phones', subquery.phones)) AS members
        FROM conversations
        LEFT JOIN (
            SELECT conversations.id AS conversation_id, chat_members.id AS member_id, chat_members.name AS member_name, chat_members.phones as phones
            FROM conversations
            CROSS JOIN LATERAL jsonb_array_elements_text(conversations.members) AS member_id
            LEFT JOIN chat_members ON CAST(chat_members.id AS text) = member_id
        ) AS subquery ON conversations.id = subquery.conversation_id
        WHERE conversations.id = ${id}
        GROUP BY conversations.id;`
 
    }
    selectConversationsByMembersByIdsQuery(ids) {
        const idList = ids.join(','); // Assuming ids is an array of integers
        return `SELECT conversations.id, conversations.name, conversations.type, conversations.created_at, jsonb_agg(jsonb_build_object('id', subquery.member_id, 'name', subquery.member_name, 'phones', subquery.phones)) AS members
        FROM conversations
        LEFT JOIN (
            SELECT conversations.id AS conversation_id, chat_members.id AS member_id, chat_members.name AS member_name, chat_members.phones as phones
            FROM conversations
            CROSS JOIN LATERAL jsonb_array_elements_text(conversations.members) AS member_id
            LEFT JOIN chat_members ON CAST(chat_members.id AS text) = member_id
        ) AS subquery ON conversations.id = subquery.conversation_id
        WHERE conversations.id IN (${idList})
        GROUP BY conversations.id;`;
    }

}

module.exports = new PgQueryBuilder();
