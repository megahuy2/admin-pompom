const { CommunityPost, Comment, Notification } = require('../models');

/**
 * GET /api/community/posts?page=1&limit=20&is_hidden=&post_type=&search=
 * Mặc định liệt kê tất cả bài; truyền ?is_hidden=true để xem danh sách bài chờ duyệt
 */
async function getPosts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = {};

    if (req.query.is_hidden !== undefined) filter.is_hidden = req.query.is_hidden === 'true';
    if (req.query.post_type) filter.post_type = req.query.post_type;
    if (req.query.search) filter.content = { $regex: req.query.search, $options: 'i' };

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .populate('user_id', 'full_name email')
        .populate('product_tag', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ created_at: -1 }),
      CommunityPost.countDocuments(filter)
    ]);

    res.json({ data: posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/community/posts/:id (kèm danh sách comments)
 */
async function getPostById(req, res) {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('user_id', 'full_name email avatar_url')
      .populate('product_tag', 'name');
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    const comments = await Comment.find({ post_id: post._id })
      .populate('user_id', 'full_name avatar_url')
      .sort({ created_at: 1 });

    res.json({ ...post.toObject(), comments });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * GET /api/community/posts/pending?page=1&limit=20
 * Danh sách bài CHỜ DUYỆT (is_hidden = true), populate tác giả để hiển thị.
 */
async function getPendingPosts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = { is_hidden: true };

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter)
        .populate('user_id', 'full_name email avatar_url')
        .populate('product_tag', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort({ created_at: -1 }),
      CommunityPost.countDocuments(filter)
    ]);

    res.json({ data: posts, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
}

/**
 * PUT /api/community/posts/:id/approve
 * Theo BPMN nhánh "Bài viết hợp lệ? -> Có": cho hiển thị (is_hidden = false)
 * và tạo Notification gửi tác giả.
 */
async function approvePost(req, res) {
  try {
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { is_hidden: false },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    await Notification.create({
      user_id: post.user_id,
      type: 'post_approved',
      title: 'Bài viết đã được duyệt',
      message: 'Bài viết của bạn đã được phê duyệt và hiển thị trên cộng đồng.',
      reference_id: post._id.toString()
    });

    res.json({ message: 'Đã duyệt bài viết', post });
  } catch (err) {
    res.status(400).json({ message: 'Không thể duyệt bài viết', error: err.message });
  }
}

/**
 * PUT /api/community/posts/:id/reject
 * Theo BPMN nhánh "Bài viết hợp lệ? -> Không": giữ ẩn bài (is_hidden = true)
 * và tạo Notification gửi tác giả, kèm lý do (body.reason - tùy chọn).
 */
async function rejectPost(req, res) {
  try {
    const reason = (req.body && req.body.reason ? String(req.body.reason).trim() : '');
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { is_hidden: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    await Notification.create({
      user_id: post.user_id,
      type: 'post_rejected',
      title: 'Bài viết bị từ chối',
      message: reason
        ? `Bài viết của bạn đã bị từ chối. Lý do: ${reason}`
        : 'Bài viết của bạn đã bị từ chối do không phù hợp với quy định cộng đồng.',
      reference_id: post._id.toString()
    });

    res.json({ message: 'Đã từ chối bài viết', post });
  } catch (err) {
    res.status(400).json({ message: 'Không thể từ chối bài viết', error: err.message });
  }
}

/**
 * PUT /api/community/posts/:id/hide
 * Ẩn bài: gỡ bài khỏi cộng đồng (is_hidden = true)
 */
async function hidePost(req, res) {
  try {
    const post = await CommunityPost.findByIdAndUpdate(
      req.params.id,
      { is_hidden: true },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.json({ message: 'Đã ẩn bài viết', post });
  } catch (err) {
    res.status(400).json({ message: 'Không thể ẩn bài viết', error: err.message });
  }
}

module.exports = {
  getPosts,
  getPendingPosts,
  getPostById,
  approvePost,
  rejectPost,
  hidePost
};
