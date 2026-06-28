const jwt = require('jsonwebtoken');

/**
 * Kiểm tra JWT token hợp lệ, gán req.user nếu hợp lệ
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Thiếu token xác thực' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

/**
 * Chỉ cho phép role 'admin' truy cập (dùng sau verifyToken)
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ Admin được phép thực hiện hành động này' });
  }
  next();
}

module.exports = { verifyToken, requireAdmin };
