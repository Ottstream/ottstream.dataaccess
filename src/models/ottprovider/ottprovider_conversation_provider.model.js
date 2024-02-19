const mongoose = require('mongoose');
const { toJSON, paginate } = require('../plugins');

const { Schema } = mongoose;

const ottproviderConversationProviderSchema = mongoose.Schema(
  {
    telegram: {
      authToken: {
        type: String,
        required: false,
      },
      isValid: {
        type: Boolean,
        required: false,
      },
      info: {
        type: Object,
      },
    },
    twilio: {
      sId: {
        type: String,
        required: false,
      },
      isValid: {
        type: Boolean,
      },
      authToken: {
        type: String,
        required: false,
      },
      fromNumber: {
        type: String,
        required: false,
      },
    },
    viber: {
      authToken: {
        type: String,
        required: false,
      },
      isValid: {
        type: Boolean,
        required: false,
      },
    },
    chat_telegram: { type: Object, default: null },
    chat_whatsapp: { type: Object, default: null },
    chat_twitter: { type: Object, default: null },
    chat_viber: { type: Object, default: null },
    chat_messenger: { type: Object, default: null },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'OttProvider',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
ottproviderConversationProviderSchema.plugin(toJSON);
ottproviderConversationProviderSchema.plugin(paginate);

/**
 * @typedef ottproviderSchema
 */
const OttProviderConversationProvider = mongoose.model(
  'OttProviderConversationProvider',
  ottproviderConversationProviderSchema,
  'ottprovider_conversation_provider'
);

module.exports = OttProviderConversationProvider;
