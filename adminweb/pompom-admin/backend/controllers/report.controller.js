const { Order, OrderItem, ProductImage, RecentlyViewed, SearchHistory } = require('../models');

/**
 * Tạo điều kiện lọc theo khoảng thời gian created_at từ query ?from=&to=
 * - from/to dạng 'YYYY-MM-DD'. 'to' được tính tới hết ngày (cộng 1 ngày, dùng $lt).
 */
function buildDateMatch(query) {
  const match = {};
  if (query.from) match.$gte = new Date(query.from);
  if (query.to) {
    const to = new Date(query.to);
    to.setDate(to.getDate() + 1); // bao trọn ngày 'to'
    match.$lt = to;
  }
  return Object.keys(match).length ? match : null;
}

/**
 * GET /api/reports/revenue?from=&to=&groupBy=day|week|month
 * Doanh thu theo mốc thời gian, chỉ tính đơn status='delivered'.
 */
async function getRevenueReport(req, res) {
  try {
    const groupBy = ['day', 'week', 'month'].includes(req.query.groupBy) ? req.query.groupBy : 'day';
    const format = groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%G-W%V' : '%Y-%m-%d';

    const match = { status: 'delivered' };
    const dateMatch = buildDateMatch(req.query);
    if (dateMatch) match.created_at = dateMatch;

    const data = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format, date: '$created_at' } },
          revenue: { $sum: '$final_amount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, period: '$_id', revenue: 1, orders: 1 } }
    ]);

    res.json({ groupBy, data });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/reports/top-products?limit=10&from=&to=
 * Sản phẩm bán chạy: gộp OrderItem theo product_id (loại đơn 'cancelled'),
 * sum(quantity) và sum(quantity*price), join Product lấy tên + ảnh đầu tiên.
 */
async function getTopProducts(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const dateMatch = buildDateMatch(req.query);

    // Điều kiện trên đơn hàng (join từ OrderItem -> Order)
    const orderMatch = { 'order.status': { $ne: 'cancelled' } };
    if (dateMatch) orderMatch['order.created_at'] = dateMatch;

    const data = await OrderItem.aggregate([
      { $lookup: { from: 'orders', localField: 'order_id', foreignField: '_id', as: 'order' } },
      { $unwind: '$order' },
      { $match: orderMatch },
      {
        $group: {
          _id: '$product_id',
          totalQuantity: { $sum: '$quantity' },
          totalRevenue: { $sum: { $multiply: ['$quantity', '$price'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: '$product.name',
          price: '$product.price',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Ảnh đầu tiên của từng sản phẩm
    const ids = data.map((d) => d.productId);
    const images = await ProductImage.find({ product_id: { $in: ids } }).sort({ sort_order: 1 });
    const firstImage = {};
    images.forEach((img) => {
      const k = img.product_id.toString();
      if (!firstImage[k]) firstImage[k] = img.image_url;
    });
    const result = data.map((d) => ({ ...d, image_url: firstImage[d.productId.toString()] || null }));

    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/reports/user-behavior
 * - Tổng lượt xem sản phẩm (RecentlyViewed)
 * - Top từ khóa tìm kiếm (SearchHistory group theo keyword)
 * - Tỷ lệ chuyển đổi đơn giản = số Order delivered / số User có ít nhất 1
 *   RecentlyViewed hoặc SearchHistory
 */
async function getUserBehaviorReport(req, res) {
  try {
    const [totalViews, topSearches, deliveredOrders, rvUsers, shUsers] = await Promise.all([
      RecentlyViewed.countDocuments(),
      SearchHistory.aggregate([
        { $group: { _id: '$keyword', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { _id: 0, keyword: '$_id', count: 1 } }
      ]),
      Order.countDocuments({ status: 'delivered' }),
      RecentlyViewed.distinct('user_id'),
      SearchHistory.distinct('user_id')
    ]);

    // Union user_id (bỏ null) -> số user có tương tác
    const engaged = new Set();
    [...rvUsers, ...shUsers].forEach((id) => { if (id) engaged.add(id.toString()); });
    const engagedUsers = engaged.size;
    const conversionRate = engagedUsers > 0 ? deliveredOrders / engagedUsers : 0;

    res.json({
      totalProductViews: totalViews,
      topSearches,
      deliveredOrders,
      engagedUsers,
      conversionRate: Math.round(conversionRate * 1000) / 1000
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = { getRevenueReport, getTopProducts, getUserBehaviorReport };
