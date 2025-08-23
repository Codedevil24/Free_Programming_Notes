const dotenv = require('dotenv');
dotenv.config();
console.log('MONGO_URI:', process.env.MONGO_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET);
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN);
console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID);