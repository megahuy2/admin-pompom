require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const userRoutes = require('./routes/user.routes');
const communityRoutes = require('./routes/community.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const bannerRoutes = require('./routes/banner.routes');
const feedRoutes = require('./routes/feed.routes');
const categoryRoutes = require('./routes/category.routes');
const voucherRoutes = require('./routes/voucher.routes');
const websiteRoutes = require('./routes/website.routes');
const uploadRoutes = require('./routes/upload.routes');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

// Phục vụ màn hình mockup Cộng đồng: http://localhost:5000/community
app.use('/community', express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.json({ message: 'PomPom Admin API đang chạy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/website', websiteRoutes);
app.use('/api/upload', uploadRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Không tìm thấy endpoint' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] PomPom Admin API đang chạy tại http://localhost:${PORT}`);
});
