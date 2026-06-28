const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 31. MEMBERSHIP_HISTORY
 * Quan hệ: USERS 1-N MEMBERSHIP_HISTORY
 */
const membershipHistorySchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  level: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Diamond'], required: true },
  points: { type: Number, required: true, default: 0 },
  changed_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 32. POINTS_TRANSACTIONS
 * Quan hệ: USERS 1-N POINTS_TRANSACTIONS
 */
const pointsTransactionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  points_change: { type: Number, required: true },
  reason: { type: String, trim: true },
  reference_id: { type: String, trim: true },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = {
  MembershipHistory: mongoose.model('MembershipHistory', membershipHistorySchema),
  PointsTransaction: mongoose.model('PointsTransaction', pointsTransactionSchema)
};
