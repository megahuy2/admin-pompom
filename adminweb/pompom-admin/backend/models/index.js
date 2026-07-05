/**
 * Gom toàn bộ 35 Mongoose model theo 8 domain (đúng theo ERD PomPom đã chốt):
 * User, Product, Promotion, Cart & Order, Engagement, Community, AI, Membership
 */
const userModels = require('./user.models');
const productModels = require('./product.models');
const promotionModels = require('./promotion.models');
const orderModels = require('./order.models');
const engagementModels = require('./engagement.models');
const communityModels = require('./community.models');
const communityFeedModels = require('./communityFeed.models');
const websiteModels = require('./website.models');
const aiModels = require('./ai.models');
const membershipModels = require('./membership.models');

module.exports = {
  ...userModels,
  ...productModels,
  ...promotionModels,
  ...orderModels,
  ...engagementModels,
  ...communityModels,
  ...communityFeedModels,
  ...websiteModels,
  ...aiModels,
  ...membershipModels
};
