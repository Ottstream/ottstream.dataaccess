const mongoose = require('mongoose');

const { Schema } = mongoose;
const botMessages = Schema(
  {
    botId: {
      type: String,
      required: true,
    },
    chatId: {
      type: Number,
      required: true,
    },
    messageIds: [
      {
        type: Number,
        required: false,
      },
    ],
    lastClearingDate: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * @typedef botMessages
 */
const botMessagesSchema = mongoose.model('BotMessages', botMessages, 'bot_messages');

module.exports = botMessagesSchema;
