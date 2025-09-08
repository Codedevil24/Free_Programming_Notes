// server/utils/telegramUpload.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

async function uploadToTelegram(file, type) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) {
    throw new Error('Telegram credentials not configured');
  }

  const form = new FormData();
  form.append('chat_id', process.env.TELEGRAM_CHAT_ID);
  
  if (type === 'document') {
    form.append('document', fs.createReadStream(file.path));
  } else if (type === 'video') {
    form.append('video', fs.createReadStream(file.path));
  } else {
    form.append('photo', fs.createReadStream(file.path));
  }

  const endpoint = type === 'video' ? 'sendVideo' : type === 'document' ? 'sendDocument' : 'sendPhoto';

  try {
    const response = await axios.post(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${endpoint}`,
      form,
      { headers: form.getHeaders(), timeout: 30000 }
    );

    if (!response.data.ok) throw new Error('Upload to Telegram failed');

    let fileId;
    if (type === 'photo') fileId = response.data.result.photo.at(-1).file_id;
    else if (type === 'video') fileId = response.data.result.video.file_id;
    else fileId = response.data.result.document.file_id;

    const fileInfoResp = await axios.get(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
      { timeout: 10000 }
    );

    if (!fileInfoResp.data.ok) throw new Error('Failed to get file info from Telegram');

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${fileInfoResp.data.result.file_path}`;
    
    // Cleanup
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
    
    return fileUrl;
  } catch (error) {
    if (file && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    throw error;
  }
}

module.exports = { uploadToTelegram };