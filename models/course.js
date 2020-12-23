const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name: String,
  description: String,
  active: Boolean,
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
  tutors: [{
    type: mongoose.Schema.Types.ObjectId, ref: 'User'
  }],
}, {timestamps: {createdAt: 'created_at'}});

module.exports = mongoose.model('Course', courseSchema);
