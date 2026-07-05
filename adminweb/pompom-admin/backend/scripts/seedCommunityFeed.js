/**
 * Seed dữ liệu MOCKUP cho màn hình CỘNG ĐỒNG (buyer app).
 * Tạo dữ liệu cho 6 collection mới: Reel, Blog, Expert, ExpertArticle,
 * ConsultationRequest, NearbyPost.
 *
 * - Dùng 4 link reel Cloudinary (lặp lại) làm video mẫu.
 * - Gán tác giả/sản phẩm THẬT lấy từ DB, ảnh bìa lấy từ ProductImage thật.
 * - NearbyPost: rải toạ độ quanh TP.HCM (trong 100km) + vài tin ở xa (Đà Nẵng,
 *   Hà Nội) để test bộ lọc bán kính. expires_at = now + 24h (TTL tự xoá).
 *
 * An toàn & chạy lại được: xoá sạch dữ liệu 6 collection này rồi tạo lại.
 * Cách chạy:  node scripts/seedCommunityFeed.js
 */
require('dotenv').config();
const connectDB = require('../config/db');
const {
  User, Product, ProductImage,
  Reel, Blog, Expert, ExpertArticle, ConsultationRequest, NearbyPost
} = require('../models');

// ---- 4 link reel mẫu (lặp lại để tạo nhiều bản ghi) ----
const REEL_VIDEOS = [
  'https://res.cloudinary.com/dwu6e0ian/video/upload/v1783157568/reel1_cl2ct1.mp4',
  'https://res.cloudinary.com/dwu6e0ian/video/upload/v1783157570/reel2_royxow.mp4',
  'https://res.cloudinary.com/dwu6e0ian/video/upload/v1783157571/reel3_arlqkf.mp4',
  'https://res.cloudinary.com/dwu6e0ian/video/upload/v1783157565/reel4_xycnr6.mp4'
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const slugify = (s) => s.toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const DAY = 24 * 60 * 60 * 1000;

// ---- Toạ độ mẫu quanh TP.HCM (đều nằm trong bán kính 100km) ----
// [lng, lat]
const HCM_AREA = [
  { c: [106.7009, 10.7769], city: 'TP. Hồ Chí Minh', district: 'Quận 1' },
  { c: [106.6822, 10.7626], city: 'TP. Hồ Chí Minh', district: 'Quận 5' },
  { c: [106.7500, 10.8000], city: 'TP. Hồ Chí Minh', district: 'TP. Thủ Đức' },
  { c: [106.6297, 10.8231], city: 'TP. Hồ Chí Minh', district: 'Quận 12' },
  { c: [106.6667, 10.7333], city: 'TP. Hồ Chí Minh', district: 'Quận 8' },
  { c: [106.4057, 10.9804], city: 'Bình Dương', district: 'TP. Thủ Dầu Một' },   // ~35km
  { c: [106.8300, 10.9450], city: 'Đồng Nai', district: 'TP. Biên Hòa' },        // ~30km
  { c: [106.4200, 10.5417], city: 'Long An', district: 'TP. Tân An' },           // ~45km
];
// ---- Toạ độ ở XA (ngoài 100km) để chứng minh bộ lọc bán kính ----
const FAR_AREA = [
  { c: [108.2022, 16.0544], city: 'Đà Nẵng', district: 'Hải Châu' },   // ~600km
  { c: [105.8342, 21.0278], city: 'Hà Nội', district: 'Hoàn Kiếm' },   // ~1150km
];

async function run() {
  await connectDB();

  const users = await User.find({ role: 'user' }).select('_id full_name avatar_url').lean();
  if (!users.length) { console.error('Cần có User (role=user).'); process.exit(1); }

  const products = await Product.find().select('_id name slug').lean();
  const imgDocs = await ProductImage.find().select('image_url').limit(60).lean();
  const imageUrls = imgDocs.map((i) => i.image_url);
  const coverOf = () => imageUrls.length ? pick(imageUrls) : '';
  const someProducts = (n) => products.slice().sort(() => 0.5 - Math.random()).slice(0, n).map(p => p._id);

  // ============================ CLEAN =============================
  const cleaned = await Promise.all([
    Reel.deleteMany({}), Blog.deleteMany({}), Expert.deleteMany({}),
    ExpertArticle.deleteMany({}), ConsultationRequest.deleteMany({}), NearbyPost.deleteMany({})
  ]);
  console.log('Đã dọn dữ liệu cũ:', cleaned.map(c => c.deletedCount).join('/'));

  // ============================ 1. REELS =============================
  const reelSeeds = [
    { source: 'instagram', caption: 'Swatch son PomPom Velvet Rose 💋 lên môi mịn như nhung, giá quá hời!', tags: ['pompom', 'sonlì', 'review'], author: { name: 'Beauty by Linh', handle: '@beautybylinh', verified: true } },
    { source: 'tiktok', caption: 'GRWM đi hẹn hò cùng bảng phấn Unicorn Magic ✨ tone tím khói cực sang', tags: ['grwm', 'makeup', 'pompom'], author: { name: 'Mai Trang', handle: '@maitrang.official', verified: true } },
    { source: 'facebook', caption: 'Cushion PomPom Cloud che phủ tốt, kiềm dầu 8 tiếng luôn nha các nàng', tags: ['cushion', 'dadau', 'review'], author: { name: 'Góc Review Mỹ Phẩm', handle: '@gocreviewmp', verified: false } },
    { source: 'instagram', caption: 'Unbox set quà PomPom limited 🎁 xinh xỉu, đáng tiền mua tặng', tags: ['unbox', 'pompom', 'gift'], author: { name: 'Hân Vlog', handle: '@hanvlog', verified: false } },
    { source: 'tiktok', caption: 'Test độ lì son sau khi ăn lẩu 🍲 kết quả bất ngờ với PomPom!', tags: ['test', 'sonli', 'viral'], author: { name: 'Ăn Sập Sài Gòn', handle: '@ansapsg', verified: true } },
    { source: 'instagram', caption: 'Makeup tông cam đất mùa thu với PomPom 🍂 hợp da ngăm cực', tags: ['fall', 'makeup', 'tone'], author: { name: 'Thu Hà Makeup', handle: '@thuha.mua', verified: true } },
    { source: 'facebook', caption: 'Review chân thực sau 1 tháng dùng skincare PomPom, da lên rõ', tags: ['skincare', 'review', '1thang'], author: { name: 'Nhật ký làm đẹp', handle: '@nhatkylamdep', verified: false } },
    { source: 'tiktok', caption: 'Dupe son hàng hiệu bằng PomPom mà màu y chang 😱', tags: ['dupe', 'son', 'tiktokmademebuyit'], author: { name: 'Chi Pu Beauty', handle: '@chipu.beauty', verified: true } },
    { source: 'instagram', caption: 'One brand tutorial toàn bộ bằng PomPom 💄 từ da tới môi', tags: ['onebrand', 'tutorial', 'pompom'], author: { name: 'Vy Makeup Artist', handle: '@vy.mua', verified: true } },
    { source: 'youtube', caption: 'Top 5 sản phẩm PomPom đáng mua nhất 2026 🏆', tags: ['top5', 'review', 'bestof'], author: { name: 'Đánh Giá Thật', handle: '@danhgiathat', verified: false } },
  ];
  const reels = reelSeeds.map((r, i) => ({
    source: r.source,
    source_url: `https://www.${r.source}.com/p/pompom_${i + 1}`,
    video_url: REEL_VIDEOS[i % REEL_VIDEOS.length],
    thumbnail_url: coverOf(),
    caption: r.caption,
    hashtags: r.tags,
    author: { ...r.author, avatar_url: pick(users).avatar_url },
    product_tags: someProducts(rand(1, 3)),
    duration: rand(12, 45),
    view_count: rand(5000, 250000),
    like_count: rand(500, 40000),
    comment_count: rand(20, 2000),
    share_count: rand(10, 1500),
    created_at: new Date(Date.now() - i * rand(2, 20) * 3600 * 1000)
  }));
  await Reel.insertMany(reels);
  console.log(`✅ Reels: ${reels.length}`);

  // ============================ 2. BLOGS =============================
  const blogSeeds = [
    { title: 'Câu chuyện thương hiệu PomPom: Từ đam mê đến hộp phấn đầu tiên', category: 'Thương hiệu', excerpt: 'Hành trình PomPom khởi nguồn từ tình yêu với mỹ phẩm thuần chay và mong muốn tôn vinh vẻ đẹp tự nhiên của phụ nữ Việt.' },
    { title: 'Bộ sưu tập Xuân Hè 2026: Bảng màu Pastel Bloom', category: 'Sản phẩm mới', excerpt: 'PomPom giới thiệu BST mới lấy cảm hứng từ sắc hoa mùa xuân, gồm 12 tông màu pastel nịnh da.' },
    { title: '5 bí quyết trang điểm giữ lớp nền cả ngày dưới trời nắng Sài Gòn', category: 'Bí quyết', excerpt: 'Thời tiết nóng ẩm khiến lớp nền dễ trôi? Đây là 5 mẹo giúp bạn giữ makeup bền đẹp 8 tiếng.' },
    { title: 'PomPom cam kết thuần chay & không thử nghiệm trên động vật', category: 'Thương hiệu', excerpt: 'Toàn bộ sản phẩm PomPom đạt chứng nhận Cruelty-Free và Vegan, an toàn cho làn da nhạy cảm.' },
    { title: 'Cách chọn tông son hợp undertone da của bạn', category: 'Bí quyết', excerpt: 'Hiểu về undertone ấm - lạnh - trung tính để chọn đúng thỏi son tôn da nhất.' },
    { title: 'Review nội bộ: Vì sao Cushion Cloud lại kiềm dầu tốt đến vậy?', category: 'Sản phẩm mới', excerpt: 'Đội ngũ R&D PomPom chia sẻ công nghệ bột kiềm dầu Air-Powder đứng sau Cushion Cloud.' },
  ];
  const blogs = blogSeeds.map((b, i) => ({
    title: b.title,
    slug: slugify(b.title) + '-' + (i + 1),
    cover_image: coverOf(),
    excerpt: b.excerpt,
    content: `<p>${b.excerpt}</p><p>Nội dung chi tiết đang được cập nhật. Đây là bài blog mẫu phục vụ mockup màn hình Cộng đồng của PomPom.</p>`,
    author: { name: 'PomPom Team', avatar_url: pick(users).avatar_url, role: 'Thương hiệu' },
    category: b.category,
    tags: ['pompom', slugify(b.category)],
    read_time: rand(3, 8),
    view_count: rand(300, 20000),
    like_count: rand(20, 1500),
    published_at: new Date(Date.now() - i * 3 * DAY)
  }));
  await Blog.insertMany(blogs);
  console.log(`✅ Blogs: ${blogs.length}`);

  // ============================ 3. EXPERTS =============================
  const expertSeeds = [
    { name: 'BS. Nguyễn Thị Hồng Ân', title: 'Bác sĩ Da liễu', specialty: 'Chăm sóc da mụn & nhạy cảm', credentials: 'CK1 Da liễu - BV Da liễu TP.HCM', years: 12, contact: { phone: '0901234567', zalo: '0901234567', messenger: 'm.me/bs.hongan', email: 'hongan@pompom.vn' } },
    { name: 'BS. Trần Quốc Bảo', title: 'Bác sĩ Thẩm mỹ', specialty: 'Lão hoá da & chống nắng', credentials: 'ThS.BS - ĐH Y Dược TP.HCM', years: 9, contact: { phone: '0912345678', zalo: '0912345678', messenger: 'm.me/bs.quocbao', email: 'quocbao@pompom.vn' } },
    { name: 'DS. Lê Minh Châu', title: 'Dược sĩ Mỹ phẩm', specialty: 'Thành phần & tương thích da', credentials: 'DS Đại học - Cố vấn công thức PomPom', years: 7, contact: { phone: '0923456789', zalo: '0923456789', messenger: 'm.me/ds.minhchau', email: 'minhchau@pompom.vn' } },
  ];
  const experts = await Expert.insertMany(expertSeeds.map((e) => ({
    name: e.name, title: e.title, specialty: e.specialty,
    avatar_url: pick(users).avatar_url, credentials: e.credentials,
    bio: `${e.title} với ${e.years} năm kinh nghiệm, chuyên ${e.specialty.toLowerCase()}. Đồng hành cùng cộng đồng PomPom trong các bài tư vấn chăm sóc da & trang điểm an toàn.`,
    years_experience: e.years, rating: (45 + rand(0, 5)) / 10,
    consultation_count: rand(200, 3000), contact: e.contact, is_available: true
  })));
  console.log(`✅ Experts: ${experts.length}`);

  // ============================ 4. EXPERT ARTICLES =============================
  const articleSeeds = [
    { title: 'Da dầu mụn nên chọn nền dạng nào? Bác sĩ giải đáp', category: 'Chăm sóc da', excerpt: 'Nền cushion kiềm dầu hay foundation lì tốt hơn cho da dầu mụn? Cùng bác sĩ phân tích ưu nhược điểm.' },
    { title: '3 sai lầm khi tẩy trang khiến da bạn nổi mụn nhiều hơn', category: 'Chăm sóc da', excerpt: 'Tẩy trang sai cách là nguyên nhân âm thầm gây mụn. Bác sĩ chỉ ra 3 lỗi phổ biến nhất.' },
    { title: 'Niacinamide và Vitamin C: kết hợp thế nào cho đúng?', category: 'Thành phần', excerpt: 'Hai hoạt chất vàng trong skincare - dùng chung được không và dùng sao cho hiệu quả?' },
    { title: 'Trang điểm cho da nhạy cảm: những thành phần cần tránh', category: 'Trang điểm', excerpt: 'Danh sách thành phần dễ gây kích ứng và cách chọn mỹ phẩm an toàn cho da nhạy cảm.' },
    { title: 'Chống nắng đúng cách: SPF bao nhiêu là đủ cho da Việt?', category: 'Chăm sóc da', excerpt: 'Bác sĩ hướng dẫn chọn chỉ số SPF/PA phù hợp và cách bôi lại kem chống nắng trong ngày.' },
    { title: 'Routine tối giản cho người mới bắt đầu skincare', category: 'Chăm sóc da', excerpt: 'Chỉ 4 bước cơ bản mỗi ngày, phù hợp người bận rộn và ngân sách tiết kiệm.' },
  ];
  const articles = articleSeeds.map((a, i) => ({
    expert_id: experts[i % experts.length]._id,
    title: a.title,
    cover_image: coverOf(),
    excerpt: a.excerpt,
    content: `<p>${a.excerpt}</p><p>Bài viết được biên soạn bởi đội ngũ chuyên gia PomPom. Nếu bạn cần tư vấn riêng cho tình trạng da của mình, hãy bấm <b>Liên hệ tư vấn</b> để được bác sĩ hỗ trợ.</p>`,
    category: a.category,
    tags: ['tips', slugify(a.category)],
    product_tags: someProducts(rand(0, 2)),
    read_time: rand(4, 9),
    view_count: rand(500, 30000),
    like_count: rand(50, 2500),
    published_at: new Date(Date.now() - i * 2 * DAY)
  }));
  await ExpertArticle.insertMany(articles);
  console.log(`✅ Expert articles: ${articles.length}`);

  // ============================ 5. CONSULTATION REQUESTS =============================
  const topics = ['Da mụn tuổi dậy thì', 'Chọn nền cho da hỗn hợp', 'Thâm nám sau sinh', 'Da nhạy cảm dễ kích ứng', 'Routine chống lão hoá'];
  const channels = ['phone', 'zalo', 'messenger', 'email'];
  const statuses = ['pending', 'pending', 'contacted', 'done'];
  const requests = Array.from({ length: 8 }).map((_, i) => {
    const u = pick(users);
    return {
      user_id: u._id,
      expert_id: pick(experts)._id,
      name: u.full_name,
      phone: '09' + rand(10000000, 99999999),
      email: slugify(u.full_name) + '@gmail.com',
      skin_type: pick(['dry', 'oily', 'combination', 'normal', 'sensitive']),
      topic: pick(topics),
      message: 'Em muốn được bác sĩ tư vấn sản phẩm phù hợp với tình trạng da của em ạ.',
      preferred_channel: pick(channels),
      status: pick(statuses),
      created_at: new Date(Date.now() - i * rand(1, 12) * 3600 * 1000)
    };
  });
  await ConsultationRequest.insertMany(requests);
  console.log(`✅ Consultation requests: ${requests.length}`);

  // ============================ 6. NEARBY POSTS =============================
  const nearbyContents = [
    'Vừa ghé store PomPom Nguyễn Huệ, tester đầy đủ luôn 😍',
    'Unbox đơn PomPom mới ship tới, gói quà xinh xỉu 🎁',
    'Test son ngoài trời nắng Sài Gòn, lên màu chuẩn nè các nàng ☀️',
    'Makeup nhẹ đi làm với cushion PomPom, kiềm dầu ổn áp 💦',
    'Mua được set skincare sale, review sau 3 ngày dùng nha 🧴',
    'Check-in workshop trang điểm của PomPom hôm nay 💄',
    'Da hôm nay căng bóng nhờ serum mới, ai da khô thử đi 💧',
    'Swatch nguyên bảng phấn mới, tone nào cũng xinh 🎨',
    'Đơn hàng PomPom giao nhanh ghê, 2 tiếng có liền 🚀',
    'Rủ hội bạn thân cùng mua chung cho đủ freeship 🛍️',
  ];
  const now = Date.now();
  const nearbyDocs = [];
  // Tin trong khu vực TP.HCM & lân cận (trong 100km) - phần lớn
  for (let i = 0; i < 12; i++) {
    const loc = pick(HCM_AREA);
    const u = pick(users);
    const isVideo = Math.random() < 0.5;
    const createdOffset = rand(1, 22) * 3600 * 1000; // đăng trong vòng 22h qua
    nearbyDocs.push({
      user_id: u._id,
      content: pick(nearbyContents),
      media_type: isVideo ? 'video' : 'image',
      media_url: isVideo ? pick(REEL_VIDEOS) : coverOf(),
      thumbnail_url: coverOf(),
      product_tag: Math.random() < 0.6 ? someProducts(1)[0] : null,
      location: { type: 'Point', coordinates: [loc.c[0] + (Math.random() - 0.5) * 0.05, loc.c[1] + (Math.random() - 0.5) * 0.05] },
      city: loc.city, district: loc.district,
      like_count: rand(0, 300), view_count: rand(20, 5000),
      created_at: new Date(now - createdOffset),
      expires_at: new Date(now - createdOffset + DAY) // hết hạn 24h sau khi đăng
    });
  }
  // Vài tin ở XA (ngoài 100km) - để test bộ lọc bán kính
  for (let i = 0; i < 3; i++) {
    const loc = pick(FAR_AREA);
    const u = pick(users);
    const createdOffset = rand(1, 20) * 3600 * 1000;
    nearbyDocs.push({
      user_id: u._id,
      content: pick(nearbyContents) + ` (tại ${loc.city})`,
      media_type: 'image', media_url: coverOf(), thumbnail_url: coverOf(),
      product_tag: someProducts(1)[0],
      location: { type: 'Point', coordinates: loc.c },
      city: loc.city, district: loc.district,
      like_count: rand(0, 200), view_count: rand(20, 3000),
      created_at: new Date(now - createdOffset),
      expires_at: new Date(now - createdOffset + DAY)
    });
  }
  await NearbyPost.insertMany(nearbyDocs);
  console.log(`✅ Nearby posts: ${nearbyDocs.length} (12 quanh TP.HCM trong 100km + 3 ở xa)`);

  console.log('\n🎉 SEED COMMUNITY FEED HOÀN TẤT');
  console.log('   Reels / Blogs / Experts / Articles / Requests / Nearby =',
    `${reels.length} / ${blogs.length} / ${experts.length} / ${articles.length} / ${requests.length} / ${nearbyDocs.length}`);
  process.exit(0);
}

run().catch((err) => { console.error('Seed lỗi:', err); process.exit(1); });
