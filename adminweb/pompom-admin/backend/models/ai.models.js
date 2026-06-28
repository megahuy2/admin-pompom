const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * 25. AI_SESSIONS
 * Quan hệ: USERS 1-N AI_SESSIONS, GUEST_SESSIONS 1-N AI_SESSIONS,
 * AI_SESSIONS 1-1 AI_DERMATOLOGIST, AI_SESSIONS 1-1 AI_MAKEUP_ARTIST, AI_SESSIONS 1-1 AI_CLIENT_ADVISOR
 */
const aiSessionSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  session_id: { type: Schema.Types.ObjectId, ref: 'GuestSession', default: null },
  ai_type: {
    type: String,
    enum: ['dermatologist', 'makeup_artist', 'client_advisor'],
    required: true
  },
  input_data: { type: Schema.Types.Mixed },
  output_data: { type: Schema.Types.Mixed },
  product_recommendations: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  device_info: { type: String, trim: true },
  processing_time_ms: { type: Number },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

/**
 * 26. AI_DERMATOLOGIST
 * Quan hệ: AI_SESSIONS 1-1 AI_DERMATOLOGIST
 */
const aiDermatologistSchema = new Schema({
  ai_session_id: { type: Schema.Types.ObjectId, ref: 'AiSession', required: true, unique: true },
  image_url: { type: String, trim: true },
  skin_analysis: { type: Schema.Types.Mixed }, // độ ẩm, độ nhờn, mụn, nếp nhăn, sắc tố, loại da
  recommendation_skincare: { type: Schema.Types.Mixed },
  confidence: { type: Number, min: 0, max: 1 }
}, { timestamps: false });

/**
 * 27. AI_MAKEUP_ARTIST
 * Quan hệ: AI_SESSIONS 1-1 AI_MAKEUP_ARTIST
 */
const aiMakeupArtistSchema = new Schema({
  ai_session_id: { type: Schema.Types.ObjectId, ref: 'AiSession', required: true, unique: true },
  original_image_url: { type: String, trim: true },
  facial_landmarks: { type: Schema.Types.Mixed },
  virtual_makeup_image_url: { type: String, trim: true },
  makeup_products_used: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: false });

/**
 * 28. AI_CLIENT_ADVISOR
 * Quan hệ: AI_SESSIONS 1-1 AI_CLIENT_ADVISOR
 */
const aiClientAdvisorSchema = new Schema({
  ai_session_id: { type: Schema.Types.ObjectId, ref: 'AiSession', required: true, unique: true },
  voice_transcript: { type: String, trim: true },
  past_purchase_context: { type: Schema.Types.Mixed },
  suggested_products: [{ type: Schema.Types.ObjectId, ref: 'Product' }]
}, { timestamps: false });

/**
 * 29. CHATBOT_CONVERSATIONS
 * Quan hệ: USERS 1-N CHATBOT_CONVERSATIONS, GUEST_SESSIONS 1-N CHATBOT_CONVERSATIONS
 * Lưu ý: CHATBOT_CONVERSATIONS-CHATBOT_MESSAGES KHÔNG nằm trong 48 quan hệ chính thức
 * (đã loại bỏ ở vòng audit trước) — cột conversation_id vẫn giữ theo Excel nhưng không ref bắt buộc.
 */
const chatbotConversationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  session_id: { type: Schema.Types.ObjectId, ref: 'GuestSession', default: null },
  started_at: { type: Date, default: Date.now },
  ended_at: { type: Date, default: null }
}, { timestamps: false });

/**
 * 30. CHATBOT_MESSAGES
 */
const chatbotMessageSchema = new Schema({
  conversation_id: { type: Schema.Types.ObjectId, ref: 'ChatbotConversation', required: true },
  sender: { type: String, enum: ['user', 'bot'], required: true },
  message: { type: String, required: true, trim: true },
  intent: { type: String, trim: true },
  response_time_ms: { type: Number },
  created_at: { type: Date, default: Date.now }
}, { timestamps: false });

module.exports = {
  AiSession: mongoose.model('AiSession', aiSessionSchema),
  AiDermatologist: mongoose.model('AiDermatologist', aiDermatologistSchema),
  AiMakeupArtist: mongoose.model('AiMakeupArtist', aiMakeupArtistSchema),
  AiClientAdvisor: mongoose.model('AiClientAdvisor', aiClientAdvisorSchema),
  ChatbotConversation: mongoose.model('ChatbotConversation', chatbotConversationSchema),
  ChatbotMessage: mongoose.model('ChatbotMessage', chatbotMessageSchema)
};
