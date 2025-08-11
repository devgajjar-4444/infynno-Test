const mongoose = require('mongoose');
const { EMAIL_TYPES, EMAIL_STATUS } = require('../constants');

const emailSchema = new mongoose.Schema({
  to: String,
  subject: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: Object.values(EMAIL_TYPES)
  },
  status: {
    type: String,
    enum: Object.values(EMAIL_STATUS),
    default: EMAIL_STATUS.PENDING
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  scheduledAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  sentAt: {
    type: Date
  },
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 3
  },
  errorMessage: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for better query performance
emailSchema.index({ status: 1 });
emailSchema.index({ type: 1 });
emailSchema.index({ priority: 1 });
emailSchema.index({ scheduledAt: 1 });
emailSchema.index({ recipient: 1 });
emailSchema.index({ status: 1, scheduledAt: 1 });

// Compound indexes for common queries
emailSchema.index({ status: 1, priority: 1 });
emailSchema.index({ type: 1, status: 1 });

// Pre-save middleware to set processing time
emailSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'sent') {
    this.sentAt = new Date();
  }
  if (this.isModified('status') && this.status === 'processing') {
    this.processedAt = new Date();
  }
  next();
});

// Method to mark as processing
emailSchema.methods.markAsProcessing = function() {
  this.status = 'processing';
  this.processedAt = new Date();
  this.attempts += 1;
  return this.save();
};

// Method to mark as sent
emailSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Method to mark as failed
emailSchema.methods.markAsFailed = function(errorMessage) {
  this.status = 'failed';
  this.errorMessage = errorMessage;
  this.processedAt = new Date();
  return this.save();
};

// Method to retry
emailSchema.methods.retry = function() {
  if (this.attempts < this.maxAttempts) {
    this.status = 'pending';
    this.processedAt = undefined;
    this.sentAt = undefined;
    this.errorMessage = undefined;
    return this.save();
  }
  throw new Error('Maximum retry attempts exceeded');
};

// Method to check if can be retried
emailSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.attempts < this.maxAttempts;
};

// Static method to get pending emails
emailSchema.statics.getPendingEmails = function(limit = 10) {
  return this.find({
    status: 'pending',
    scheduledAt: { $lte: new Date() }
  })
  .sort({ priority: -1, scheduledAt: 1 })
  .limit(limit)
  .populate('recipient', 'name email')
  .populate('sender', 'name email')
  .populate('relatedTask', 'title');
};

// Static method to get failed emails
// emailSchema.statics.getFailedEmails = function(limit = 10) {
//   return this.find({
//     status: 'failed',
//     attempts: { $lt: '$maxAttempts' }
//   })
//   .sort({ updatedAt: 1 })
//   .limit(limit)
//   .populate('recipient', 'name email')
//   .populate('sender', 'name email');
// };

// Static method to get failed emails
emailSchema.statics.getFailedEmails = function(limit = 10) {
  return this.find({
    status: 'failed',
    $expr: { $lt: ['$attempts', '$maxAttempts'] }
  })
  .sort({ updatedAt: 1 })
  .limit(limit)
  .populate('recipient', 'name email')
  .populate('sender', 'name email');
};


// Static method to clean old emails
emailSchema.statics.cleanOldEmails = function(daysOld = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  return this.deleteMany({
    status: { $in: ['sent', 'failed'] },
    updatedAt: { $lt: cutoffDate }
  });
};

// Virtual for email age
emailSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt;
});

// Virtual for is overdue
emailSchema.virtual('isOverdue').get(function() {
  if (this.status === 'pending') {
    return this.scheduledAt < new Date();
  }
  return false;
});

// Ensure virtual fields are serialized
emailSchema.set('toJSON', { virtuals: true });
emailSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Email', emailSchema);
