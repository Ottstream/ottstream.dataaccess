const mongoose = require('mongoose');

const history_log = mongoose.Schema(
  {
    data: {
        type: Object,
        default: null
    }
  },
  {
    timestamps: true,
  }
);
const HistoryLog = mongoose.model('history_log', history_log);

module.exports = HistoryLog;
