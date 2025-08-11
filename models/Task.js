const mongoose = require('mongoose');
const { TASK_STATUS, TASK_PRIORITY, VALIDATION } = require('../constants');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(TASK_STATUS),
    default: TASK_STATUS.PENDING
  },
  priority: {
    type: String,
    enum: Object.values(TASK_PRIORITY),
    default: TASK_PRIORITY.MEDIUM
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimeType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  estimatedHours: Number,
  actualHours: Number,
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
taskSchema.index({ status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ isDeleted: 1 });
taskSchema.index({ createdAt: 1 });

// Compound indexes for common queries
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ dueDate: 1, priority: 1 });

// Pre-save middleware to validate attachments
taskSchema.pre('save', function(next) {
  if (this.attachments && this.attachments.length > 3) {
    return next(new Error('Maximum 3 attachments allowed per task'));
  }
  next();
});

// Method to add attachment
taskSchema.methods.addAttachment = function(attachmentData) {
  if (this.attachments.length >= 3) {
    throw new Error('Maximum 3 attachments allowed per task');
  }
  
  this.attachments.push(attachmentData);
  return this.save();
};

// Method to remove attachment
taskSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments = this.attachments.filter(
    attachment => attachment._id.toString() !== attachmentId.toString()
  );
  return this.save();
};

// Method to update status
taskSchema.methods.updateStatus = function(newStatus, userId) {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (this.status === 'completed' && newStatus !== 'completed') {
    this.completedAt = undefined;
  }
  
  // Add comment about status change
  this.comments.push({
    user: userId,
    content: `Status changed to ${newStatus}`
  });
  
  return this.save();
};

// Method to assign task
taskSchema.methods.assignTask = function(newAssigneeId, assignedBy) {
  this.assignedTo = newAssigneeId;
  
  // Add comment about assignment
  this.comments.push({
    user: assignedBy,
    content: `Task reassigned to new user`
  });
  
  return this.save();
};

// Method to add comment
taskSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    user: userId,
    content: content
  });
  return this.save();
};

// Method to soft delete
taskSchema.methods.softDelete = function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  return this.save();
};

// Method to restore
taskSchema.methods.restore = function() {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  return this.save();
};

// Virtual for completion time
taskSchema.virtual('completionTime').get(function() {
  if (this.status === 'completed' && this.completedAt && this.createdAt) {
    return this.completedAt - this.createdAt;
  }
  return null;
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false;
  return this.dueDate < new Date();
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  if (this.status === 'completed') return 0;
  const now = new Date();
  const diffTime = this.dueDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Static method to get tasks by user role
taskSchema.statics.getTasksByRole = function(userId, userRole) {
  let query = { isDeleted: false };
  
  if (userRole === 'employee') {
    query.assignedTo = userId;
  } else if (userRole === 'manager') {
    query.$or = [
      { createdBy: userId },
      { assignedTo: userId }
    ];
  }
  // Admin can see all tasks
  
  return this.find(query);
};

// Ensure virtual fields are serialized
taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Task', taskSchema);
