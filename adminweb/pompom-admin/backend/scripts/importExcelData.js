/**
 * Import dữ liệu mẫu PomPom từ scripts/pompom_data.json vào MongoDB.
 *
 * Cách dùng:
 *   1. python3 scripts/excel_to_json.py   (chỉ cần chạy lại khi file Excel gốc đổi)
 *   2. npm run import-data                 (hoặc: node scripts/importExcelData.js)
 *
 * Nguyên tắc: import theo đúng thứ tự phụ thuộc (bảng cha trước, bảng con sau),
 * và map ID số nguyên trong Excel (vd user_id=1) sang ObjectId MongoDB thật,
 * dùng 1 Map làm "sổ tra cứu" id_cu -> ObjectId_moi cho từng collection.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const models = require('../models');

const DATA_PATH = path.join(__dirname, 'pompom_data.json');

async function run() {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const data = JSON.parse(raw);

  await connectDB();

  // idMap['users'].get(1) => ObjectId thật của user có user_id=1 trong Excel
  const idMap = {};
  const mapOf = (sheet) => {
    if (!idMap[sheet]) idMap[sheet] = new Map();
    return idMap[sheet];
  };

  // Chuẩn hoá giá trị enum từ dữ liệu nguồn (viết hoa/khác chuẩn) về đúng enum schema
  const normPayMethod = (m) => ({ COD: 'COD', MOMO: 'MoMo', VNPAY: 'VNPay', VISA: 'VISA' }[String(m).toUpperCase()] || m);
  const normPayStatus = (s) => (String(s).toLowerCase() === 'unpaid' ? 'pending' : s);

  console.log('\n--- XÓA DỮ LIỆU CŨ (nếu có) ---');
  for (const model of Object.values(models)) {
    await model.deleteMany({});
  }

  // ====== 1. USERS (không phụ thuộc bảng nào) ======
  console.log('\n--- Import users ---');
  for (const row of data.users) {
    const doc = await models.User.create({
      full_name: row.full_name,
      email: row.email,
      password_hash: row.password_hash, // dữ liệu mẫu: chưa hash thật, chỉ phục vụ demo
      phone_number: row.phone_number,
      avatar_url: row.avatar_url,
      bio: row.bio,
      join_date: row.join_date,
      role: row.role,
      status: row.status,
      last_login: row.last_login,
      birth_date: row.birth_date,
      gender: row.gender,
      skin_type: row.skin_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
    mapOf('users').set(row.user_id, doc._id);
  }
  console.log(`  -> ${data.users.length} users`);

  // ====== 2. GUEST_SESSIONS ======
  console.log('\n--- Import guest_sessions ---');
  for (const row of data.guest_sessions) {
    const doc = await models.GuestSession.create({
      session_id: row.session_id,
      created_at: row.created_at,
      last_activity: row.last_activity
    });
    mapOf('guest_sessions').set(row.session_id, doc._id);
  }
  console.log(`  -> ${data.guest_sessions.length} guest_sessions`);

  // ====== 9. USER_ADDRESSES (phụ thuộc users) ======
  console.log('\n--- Import user_addresses ---');
  for (const row of data.user_addresses) {
    const doc = await models.UserAddress.create({
      user_id: mapOf('users').get(row.user_id),
      label: row.label,
      recipient_name: row.recipient_name,
      phone: row.phone,
      address_line: row.address_line,
      city: row.city,
      district: row.district,
      ward: row.ward,
      is_default: !!row.is_default
    });
    mapOf('user_addresses').set(row.address_id, doc._id);
  }
  console.log(`  -> ${data.user_addresses.length} user_addresses`);

  // ====== 3. CATEGORIES (tự tham chiếu parent_id) ======
  console.log('\n--- Import categories ---');
  // Bước 1: tạo hết category chưa gán parent_id
  for (const row of data.categories) {
    const doc = await models.Category.create({
      category_name: row.category_name,
      sort_order: row.sort_order,
      image_url: row.image_url
    });
    mapOf('categories').set(row.category_id, doc._id);
  }
  // Bước 2: gán lại parent_id sau khi đã có đủ ObjectId
  for (const row of data.categories) {
    if (row.parent_id) {
      await models.Category.findByIdAndUpdate(mapOf('categories').get(row.category_id), {
        parent_id: mapOf('categories').get(row.parent_id)
      });
    }
  }
  console.log(`  -> ${data.categories.length} categories`);

  // ====== 4. PRODUCTS (phụ thuộc categories) ======
  console.log('\n--- Import products ---');
  for (const row of data.products) {
    const doc = await models.Product.create({
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: row.price,
      sale_price: row.sale_price,
      stock: row.stock,
      sku: row.sku,
      category_id: mapOf('categories').get(row.category_id),
      brand: row.brand,
      is_active: !!row.is_active
    });
    mapOf('products').set(row.product_id, doc._id);
  }
  console.log(`  -> ${data.products.length} products`);

  // ====== 5. PRODUCT_IMAGES (phụ thuộc products) ======
  console.log('\n--- Import product_images ---');
  for (const row of data.product_images) {
    await models.ProductImage.create({
      product_id: mapOf('products').get(row.product_id),
      image_url: row.image_url,
      sort_order: row.sort_order
    });
  }
  console.log(`  -> ${data.product_images.length} product_images`);

  // ====== 6. PRODUCT_VARIANTS (phụ thuộc products) ======
  console.log('\n--- Import product_variants ---');
  for (const row of data.product_variants) {
    const doc = await models.ProductVariant.create({
      product_id: mapOf('products').get(row.product_id),
      variant_name: row.variant_name,
      sku: row.sku,
      additional_price: row.additional_price,
      stock: row.stock,
      image_url: row.image_url
    });
    mapOf('product_variants').set(row.variant_id, doc._id);
  }
  console.log(`  -> ${data.product_variants.length} product_variants`);

  // ====== 7. VOUCHERS ======
  console.log('\n--- Import vouchers ---');
  for (const row of data.vouchers) {
    const doc = await models.Voucher.create({
      code: row.code,
      discount_type: row.discount_type,
      discount_value: row.discount_value,
      min_order_amount: row.min_order_amount,
      max_discount: row.max_discount,
      start_date: row.start_date,
      end_date: row.end_date,
      usage_limit: row.usage_limit,
      used_count: row.used_count,
      is_active: !!row.is_active
    });
    mapOf('vouchers').set(row.voucher_id, doc._id);
  }
  console.log(`  -> ${data.vouchers.length} vouchers`);

  // ====== 8. USER_VOUCHERS (phụ thuộc users, vouchers) ======
  console.log('\n--- Import user_vouchers ---');
  for (const row of data.user_vouchers) {
    await models.UserVoucher.create({
      user_id: mapOf('users').get(row.user_id),
      voucher_id: mapOf('vouchers').get(row.voucher_id),
      used_at: row.used_at,
      assigned_at: row.assigned_at
    });
  }
  console.log(`  -> ${data.user_vouchers.length} user_vouchers`);

  // ====== 34. PROMOTIONS ======
  console.log('\n--- Import promotions ---');
  for (const row of data.promotions) {
    const doc = await models.Promotion.create({
      name: row.name,
      type: row.type,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: !!row.is_active
    });
    mapOf('promotions').set(row.promotion_id, doc._id);
  }
  console.log(`  -> ${data.promotions.length} promotions`);

  // ====== 35. PROMOTION_DETAILS (phụ thuộc promotions, products) ======
  console.log('\n--- Import promotion_details ---');
  let promoDetailCount = 0;
  for (const row of data.promotion_details) {
    const productOid = row.product_id ? mapOf('products').get(row.product_id) : null;
    // Bỏ qua dòng khuyến mãi không gắn sản phẩm cụ thể (product_id null) — schema yêu cầu product_id
    if (!productOid) continue;
    await models.PromotionDetail.create({
      promotion_id: mapOf('promotions').get(row.promotion_id),
      product_id: productOid,
      buy_quantity: row.buy_quantity,
      get_product_id: row.get_product_id ? mapOf('products').get(row.get_product_id) : null,
      get_quantity: row.get_quantity,
      discount_percent: row.discount_percent,
      discount_amount: row.discount_amount
    });
    promoDetailCount++;
  }
  console.log(`  -> ${promoDetailCount}/${data.promotion_details.length} promotion_details (bỏ dòng thiếu product_id)`);

  // ====== 10. CARTS (phụ thuộc users hoặc guest_sessions) ======
  console.log('\n--- Import carts ---');
  for (const row of data.carts) {
    const doc = await models.Cart.create({
      user_id: row.user_id ? mapOf('users').get(row.user_id) : null,
      session_id: row.session_id ? mapOf('guest_sessions').get(row.session_id) : null,
      created_at: row.created_at,
      updated_at: row.updated_at
    });
    mapOf('carts').set(row.cart_id, doc._id);
  }
  console.log(`  -> ${data.carts.length} carts`);

  // ====== 11. CART_ITEMS (phụ thuộc carts, products, variants) ======
  console.log('\n--- Import cart_items ---');
  for (const row of data.cart_items) {
    await models.CartItem.create({
      cart_id: mapOf('carts').get(row.cart_id),
      product_id: mapOf('products').get(row.product_id),
      variant_id: row.variant_id ? mapOf('product_variants').get(row.variant_id) : null,
      quantity: row.quantity,
      unit_price: row.unit_price
    });
  }
  console.log(`  -> ${data.cart_items.length} cart_items`);

  // ====== 12. ORDERS (phụ thuộc users/guest_sessions/user_addresses) ======
  console.log('\n--- Import orders ---');
  for (const row of data.orders) {
    const doc = await models.Order.create({
      order_number: row.order_number,
      user_id: row.user_id ? mapOf('users').get(row.user_id) : null,
      session_id: row.session_id ? mapOf('guest_sessions').get(row.session_id) : null,
      address_id: row.address_id ? mapOf('user_addresses').get(row.address_id) : null,
      total_amount: row.total_amount,
      shipping_fee: row.shipping_fee,
      discount_amount: row.discount_amount,
      final_amount: row.final_amount,
      status: row.status,
      payment_method: normPayMethod(row.payment_method),
      payment_status: normPayStatus(row.payment_status),
      shipping_carrier: row.shipping_carrier,
      tracking_number: row.tracking_number,
      note: row.note,
      created_at: row.created_at
    });
    mapOf('orders').set(row.order_id, doc._id);
  }
  console.log(`  -> ${data.orders.length} orders`);

  // ====== 13. ORDER_ITEMS (phụ thuộc orders, products, variants) ======
  console.log('\n--- Import order_items ---');
  for (const row of data.order_items) {
    await models.OrderItem.create({
      order_id: mapOf('orders').get(row.order_id),
      product_id: mapOf('products').get(row.product_id),
      variant_id: row.variant_id ? mapOf('product_variants').get(row.variant_id) : null,
      quantity: row.quantity,
      price: row.price
    });
  }
  console.log(`  -> ${data.order_items.length} order_items`);

  // ====== 14. ORDER_STATUS_HISTORY (phụ thuộc orders) ======
  console.log('\n--- Import order_status_history ---');
  for (const row of data.order_status_history) {
    await models.OrderStatusHistory.create({
      order_id: mapOf('orders').get(row.order_id),
      status: row.status,
      note: row.note,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.order_status_history.length} order_status_history`);

  // ====== 15. PAYMENTS (phụ thuộc orders) ======
  console.log('\n--- Import payments ---');
  for (const row of data.payments) {
    await models.Payment.create({
      order_id: mapOf('orders').get(row.order_id),
      transaction_id: row.transaction_id,
      amount: row.amount,
      status: row.status,
      payment_method: normPayMethod(row.payment_method),
      paid_at: row.paid_at
    });
  }
  console.log(`  -> ${data.payments.length} payments`);

  // ====== 16. WISHLISTS (phụ thuộc users, products) ======
  console.log('\n--- Import wishlists ---');
  for (const row of data.wishlists) {
    await models.Wishlist.create({
      user_id: mapOf('users').get(row.user_id),
      product_id: mapOf('products').get(row.product_id),
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.wishlists.length} wishlists`);

  // ====== 17. PRODUCT_REVIEWS (phụ thuộc users, products, orders) ======
  console.log('\n--- Import product_reviews ---');
  // Nguồn có review trỏ user_id vượt số user thực (1..56 vs 10 user) -> fallback về user thật theo vòng
  const userOids = [...mapOf('users').values()];
  const resolveUser = (uid) => mapOf('users').get(uid) || userOids[(Number(uid) - 1) % userOids.length];
  for (const row of data.product_reviews) {
    await models.ProductReview.create({
      user_id: resolveUser(row.user_id),
      product_id: mapOf('products').get(row.product_id),
      order_id: row.order_id ? mapOf('orders').get(row.order_id) : null,
      rating: row.rating,
      comment: row.comment,
      images: row.images ? String(row.images).split(',').map((s) => s.trim()) : [],
      is_verified_purchase: !!row.is_verified_purchase,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.product_reviews.length} product_reviews`);

  // ====== 18. COMMUNITY_POSTS (phụ thuộc users, products) ======
  console.log('\n--- Import community_posts ---');
  for (const row of data.community_posts) {
    const doc = await models.CommunityPost.create({
      user_id: mapOf('users').get(row.user_id),
      content: row.content,
      images: row.images ? String(row.images).split(',').map((s) => s.trim()) : [],
      product_tag: row.product_tag ? mapOf('products').get(row.product_tag) : null,
      like_count: row.like_count,
      comment_count: row.comment_count,
      is_hidden: !!row.is_hidden,
      created_at: row.created_at
    });
    mapOf('community_posts').set(row.post_id, doc._id);
  }
  console.log(`  -> ${data.community_posts.length} community_posts`);

  // ====== 19. COMMENTS (phụ thuộc community_posts, users, tự tham chiếu parent_id) ======
  console.log('\n--- Import comments ---');
  for (const row of data.comments) {
    const doc = await models.Comment.create({
      post_id: mapOf('community_posts').get(row.post_id),
      user_id: mapOf('users').get(row.user_id),
      content: row.content,
      created_at: row.created_at
    });
    mapOf('comments').set(row.comment_id, doc._id);
  }
  // Gán lại parent_id sau khi đã có đủ ObjectId (giống pattern categories)
  for (const row of data.comments) {
    if (row.parent_id) {
      await models.Comment.findByIdAndUpdate(mapOf('comments').get(row.comment_id), {
        parent_id: mapOf('comments').get(row.parent_id)
      });
    }
  }
  console.log(`  -> ${data.comments.length} comments`);

  // ====== 20. LIKES (phụ thuộc users; target_id polymorphic) ======
  console.log('\n--- Import likes ---');
  for (const row of data.likes) {
    let targetId = row.target_id;
    if (row.target_type === 'post') targetId = mapOf('community_posts').get(row.target_id);
    await models.Like.create({
      user_id: mapOf('users').get(row.user_id),
      target_type: row.target_type,
      target_id: targetId,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.likes.length} likes`);

  // ====== 21. FOLLOWS (phụ thuộc users x2) ======
  console.log('\n--- Import follows ---');
  for (const row of data.follows) {
    await models.Follow.create({
      follower_id: mapOf('users').get(row.follower_id),
      followed_id: mapOf('users').get(row.followed_id),
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.follows.length} follows`);

  // ====== 22. NOTIFICATIONS (phụ thuộc users) ======
  console.log('\n--- Import notifications ---');
  for (const row of data.notifications) {
    await models.Notification.create({
      user_id: mapOf('users').get(row.user_id),
      type: row.type,
      title: row.title,
      message: row.message,
      image_url: row.image_url,
      action_url: row.action_url,
      is_read: !!row.is_read,
      reference_id: row.reference_id ? String(row.reference_id) : null,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.notifications.length} notifications`);

  // ====== 23. BANNERS (độc lập) ======
  console.log('\n--- Import banners ---');
  for (const row of data.banners) {
    await models.Banner.create({
      title: row.title,
      image_url: row.image_url,
      target_type: row.target_type,
      target_id: row.target_id ? String(row.target_id) : null,
      target_url: row.target_url,
      sort_order: row.sort_order,
      is_active: !!row.is_active
    });
  }
  console.log(`  -> ${data.banners.length} banners`);

  // ====== 24. SEARCH_HISTORY (phụ thuộc users/guest_sessions) ======
  console.log('\n--- Import search_history ---');
  for (const row of data.search_history) {
    await models.SearchHistory.create({
      user_id: row.user_id ? mapOf('users').get(row.user_id) : null,
      session_id: row.session_id ? mapOf('guest_sessions').get(row.session_id) : null,
      keyword: row.keyword,
      searched_at: row.searched_at
    });
  }
  console.log(`  -> ${data.search_history.length} search_history`);

  // ====== 25-28. AI_SESSIONS + 3 bảng con 1-1 ======
  console.log('\n--- Import ai_sessions + AI sub-tables ---');
  for (const row of data.ai_sessions) {
    const doc = await models.AiSession.create({
      user_id: row.user_id ? mapOf('users').get(row.user_id) : null,
      session_id: row.session_id ? mapOf('guest_sessions').get(row.session_id) : null,
      ai_type: row.ai_type,
      input_data: row.input_data,
      output_data: row.output_data,
      device_info: row.device_info,
      processing_time_ms: row.processing_time_ms,
      created_at: row.created_at
    });
    mapOf('ai_sessions').set(row.id, doc._id);
  }
  for (const row of data.ai_dermatologist) {
    await models.AiDermatologist.create({
      ai_session_id: mapOf('ai_sessions').get(row.ai_session_id),
      image_url: row.image_url,
      skin_analysis: row.skin_analysis,
      recommendation_skincare: row.recommendation_skincare,
      confidence: row.confidence
    });
  }
  for (const row of data.ai_makeup_artist) {
    await models.AiMakeupArtist.create({
      ai_session_id: mapOf('ai_sessions').get(row.ai_session_id),
      original_image_url: row.original_image_url,
      facial_landmarks: row.facial_landmarks,
      virtual_makeup_image_url: row.virtual_makeup_image_url
    });
  }
  for (const row of data.ai_client_advisor) {
    await models.AiClientAdvisor.create({
      ai_session_id: mapOf('ai_sessions').get(row.ai_session_id),
      voice_transcript: row.voice_transcript,
      past_purchase_context: row.past_purchase_context
    });
  }
  console.log(`  -> ${data.ai_sessions.length} ai_sessions (+ các bảng con AI)`);

  // ====== 29-30. CHATBOT_CONVERSATIONS + CHATBOT_MESSAGES ======
  console.log('\n--- Import chatbot_conversations + messages ---');
  for (const row of data.chatbot_conversations) {
    const doc = await models.ChatbotConversation.create({
      user_id: row.user_id ? mapOf('users').get(row.user_id) : null,
      session_id: row.session_id ? mapOf('guest_sessions').get(row.session_id) : null,
      started_at: row.started_at,
      ended_at: row.ended_at
    });
    mapOf('chatbot_conversations').set(row.id, doc._id);
  }
  for (const row of data.chatbot_messages) {
    await models.ChatbotMessage.create({
      conversation_id: mapOf('chatbot_conversations').get(row.conversation_id),
      sender: row.sender,
      message: row.message,
      intent: row.intent,
      response_time_ms: row.response_time_ms,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.chatbot_conversations.length} chatbot_conversations, ${data.chatbot_messages.length} chatbot_messages`);

  // ====== 31. MEMBERSHIP_HISTORY (phụ thuộc users) ======
  console.log('\n--- Import membership_history ---');
  for (const row of data.membership_history) {
    await models.MembershipHistory.create({
      user_id: mapOf('users').get(row.user_id),
      level: row.level,
      points: row.points,
      changed_at: row.changed_at
    });
  }
  console.log(`  -> ${data.membership_history.length} membership_history`);

  // ====== 32. POINTS_TRANSACTIONS (phụ thuộc users) ======
  console.log('\n--- Import points_transactions ---');
  for (const row of data.points_transactions) {
    await models.PointsTransaction.create({
      user_id: mapOf('users').get(row.user_id),
      points_change: row.points_change,
      reason: row.reason,
      reference_id: row.reference_id ? String(row.reference_id) : null,
      created_at: row.created_at
    });
  }
  console.log(`  -> ${data.points_transactions.length} points_transactions`);

  // ====== 33. RECENTLY_VIEWED (phụ thuộc users, products) ======
  console.log('\n--- Import recently_viewed ---');
  for (const row of data.recently_viewed) {
    await models.RecentlyViewed.create({
      user_id: mapOf('users').get(row.user_id),
      product_id: mapOf('products').get(row.product_id),
      viewed_at: row.viewed_at
    });
  }
  console.log(`  -> ${data.recently_viewed.length} recently_viewed`);

  console.log('\n=== IMPORT HOÀN TẤT ===');
  const counts = await Promise.all(
    Object.entries(models).map(async ([name, model]) => [name, await model.countDocuments()])
  );
  counts.forEach(([name, count]) => console.log(`  ${name}: ${count}`));

  await mongoose.connection.close();
  process.exit(0);
}

run().catch((err) => {
  console.error('LỖI IMPORT:', err);
  process.exit(1);
});
