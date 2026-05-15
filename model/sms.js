const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SmsSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  Activation_Code: {
    type: String,
  },
  transactiondate: {
    type: Date,  // better to use Date instead of string
    required: true,
    default: Date.now
  },
  expireAt: {
    type: Date,
    required: true
  },
  Phone_Number: {
    type: String,
    required: true
  },
  Country: {
    type: String,
    required: true
  },
  App: {
    type: String,
    required: true
  },
  Amount: {
    type: Number,
    required: true
  },
  token: String,
  new_bal: {
    type: Number
  },
  status: { 
    type: String, 
    enum: ["ACTIVE", "EXPIRED", "REJECTED", "USED"], 
    default: "ACTIVE" 
  },
});

// Index expireAt to make queries faster
SmsSchema.index({ expireAt: 1 });

module.exports = mongoose.model('Sms', SmsSchema);
