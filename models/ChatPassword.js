const mongoose = require('mongoose');

const chatPasswordSchema = new mongoose.Schema({
  chatName: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  }
});

module.exports = mongoose.model('ChatPassword', chatPasswordSchema);
