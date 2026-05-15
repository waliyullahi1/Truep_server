const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const FundSchema = new Schema({
  email: {
    type: String,
    required: true
    },
  tx_ref: {
    type: String,
    required: true
  },
  transaction_id:String,
   
 

  payment_type:{
    type: String,
    required: true
  },
  bank_name: String,
 
  time_created:{
    type: String,
    required: true
  },
 
  amount:{
    type: Number,
    required: true
  },
  account_expiration:{
    type: Date,
  },
  account_expiration_show:{
    type: String,
  },
  status:{
    type: String,
    required: true
  },


  transfer_account: {
    type: String,
    default: undefined,
    
  },

});

module.exports = mongoose.model('Fund', FundSchema );