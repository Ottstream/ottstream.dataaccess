const { BotMessages } = require('../../models');

/**
 * Get item by id
 *  * Update Option by id
 * @param {Number} chatId
 * @param {Number} messageId
 * @returns {Promise<BotMessages>}
 */
const createBotMessage = async (data, messageId) => {
  const message = await BotMessages.create({
    ...data,
    messageIds: [messageId],
  });
  return message;
};

/**
 * Get item by id
 * @returns {Promise<BotMessages>}
 * @param filter
 */
const getBotMessages = async (filter) => {
  const messages = await BotMessages.find(filter);
  return messages;
};

/**
 * Get item by id
 * @returns {Promise<BotMessages>}
 * @param id
 */
const getBotMessageById = async (id) => {
  const message = await BotMessages.findById(id);
  return message;
};

/**
 * Get item by id
 * @returns {Promise<BotMessages>}
 * @param chatId
 */
const getBotMessageByChatId = async (filter) => {
  const message = await BotMessages.findOne(filter);
  return message;
};

/**
 * Get item by id
 * @returns {Promise<BotMessages>}
 * @param botId
 */
const getBotMessagesByBotId = async (botId) => {
  const message = await BotMessages.find({
    botId,
  });
  return message;
};

/**
 * Update Option by id
 * @param {ObjectId} id
 * @param {Object} data
 * @returns {Promise<BotMessages>}
 */
const BotMessageByIdAndUpdate = async (id, data) => {
  const message = await BotMessages.findByIdAndUpdate(
    id,
    {
      $set: data,
    },
    { new: true }
  );
  return message;
};

/**
 * Get item by id
 *  * Update Option by id
 * @param {Number} chatId
 * @param {Number} messageId
 * @returns {Promise<BotMessages>}
 */
const getBotMessageByChatIdAndPushMessageId = async (chatId, messageId) => {
  const message = await BotMessages.findOneAndUpdate(
    {
      chatId,
    },
    {
      $addToSet: {
        messageIds: messageId,
      },
    },
    { new: true }
  );
  return message;
};

module.exports = {
  createBotMessage,
  getBotMessages,
  getBotMessageById,
  BotMessageByIdAndUpdate,
  getBotMessageByChatId,
  getBotMessagesByBotId,
  getBotMessageByChatIdAndPushMessageId,
};
