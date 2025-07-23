const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    required: true,
    enum: ['ADMIN', 'MANAGER', 'EMPLOYEE'],
    default: "EMPLOYEE"
  },
  managerId:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  createdBy:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedBy:{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
},{
  timestamps: true
});




module.exports = mongoose.model('User', userSchema);