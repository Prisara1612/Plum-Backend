const axios = require('axios');

async function resolveImageInput({ imageBase64, imageUrl, imageText }) {
  if (imageBase64) {
    return decodeBase64(imageBase64);
  }

  if (imageUrl) {
    return downloadImage(imageUrl);
  }

  if (imageText) {
    return Buffer.from(imageText, 'utf8');
  }

  throw new Error('Provide `imageBase64`, `imageUrl`, or legacy `imageText`');
}

function decodeBase64(value) {
  const base64 = value.includes('base64,') ? value.split('base64,').pop() : value;
  try {
    return Buffer.from(base64, 'base64');
  } catch (error) {
    throw new Error('Invalid base64 string for image');
  }
}

async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Unable to download image from URL: ${error.message}`);
  }
}

module.exports = {
  resolveImageInput,
  decodeBase64,
  downloadImage,
};
