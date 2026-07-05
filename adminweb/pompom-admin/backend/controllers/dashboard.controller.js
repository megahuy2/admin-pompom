const { Order, User, Product } = require('../models');

/**
 * GET /api/dashboard/summary
 * Trả về số liệu tổng quan cho trang Dashboard admin.
 */
async function getDashboardSummary(req, res) {
  try {
    // Mốc đầu ngày hôm nay và 30 ngày trước (theo giờ server)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const [
      revenueAgg,
      totalOrders,
      statusAgg,
      totalUsers,
      newUsers,
      todayOrders,
      todayRevenueAgg,
      totalProducts
    ] = await Promise.all([
      // Tổng doanh thu: chỉ tính đơn đã giao
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$final_amount' } } }
      ]),
      // Tổng số đơn hàng
      Order.countDocuments(),
      // Breakdown theo status
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      // Tổng user role=user
      User.countDocuments({ role: 'user' }),
      // User mới trong 30 ngày qua
      User.countDocuments({ role: 'user', created_at: { $gte: last30Days } }),
      // Số đơn hàng hôm nay
      Order.countDocuments({ created_at: { $gte: startOfToday } }),
      // Doanh thu hôm nay (đơn đã giao tạo trong hôm nay)
      Order.aggregate([
        { $match: { status: 'delivered', created_at: { $gte: startOfToday } } },
        { $group: { _id: null, total: { $sum: '$final_amount' } } }
      ]),
      // Tổng sản phẩm đang bán (dữ liệu cũ lưu is_active dạng số → dùng $ne:false cho bền)
      Product.countDocuments({ is_active: { $ne: false } })
    ]);

    // Chuẩn hóa breakdown status: đảm bảo đủ 7 trạng thái kể cả khi count = 0
    const statusBreakdown = {
      pending: 0, paid: 0, preparing: 0, shipping: 0, delivered: 0, returned: 0, cancelled: 0
    };
    statusAgg.forEach((s) => {
      if (s._id in statusBreakdown) statusBreakdown[s._id] = s.count;
    });

    res.json({
      totalRevenue: revenueAgg[0]?.total || 0,
      totalOrders,
      ordersByStatus: statusBreakdown,
      totalUsers,
      newUsersLast30Days: newUsers,
      todayOrders,
      todayRevenue: todayRevenueAgg[0]?.total || 0,
      totalProducts
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

module.exports = { getDashboardSummary };
