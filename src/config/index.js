const dotenv = require('dotenv');

dotenv.config();

function getEnv(name, fallback) {
  return process.env[name] !== undefined ? process.env[name] : fallback;
}

const OCR_PROVIDER = getEnv('OCR_PROVIDER', 'google_vision_rest');

const config = {
  ocr: {
    provider: OCR_PROVIDER,
    googleVision: {
      apiKey: process.env.GOOGLE_VISION_API_KEY,
      endpoint: getEnv('GOOGLE_VISION_API_ENDPOINT', 'https://vision.googleapis.com/v1/images:annotate'),
    },
  },
};

module.exports = {
  config,
};
