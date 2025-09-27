const axios = require('axios');

class GoogleVisionOcrEngine {
  constructor({ apiKey, endpoint } = {}) {
    if (!apiKey) {
      throw new Error('GOOGLE_VISION_API_KEY is required for Google Vision OCR');
    }

    this.apiKey = apiKey;
    this.endpoint = endpoint ?? 'https://vision.googleapis.com/v1/images:annotate';
  }

  async recognize(imageBuffer) {
    const content = this._coerceToBase64(imageBuffer);
    const url = this._buildUrl();

    const requestBody = {
      requests: [
        {
          image: { content },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        },
      ],
    };

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    const result = response.data?.responses?.[0];

    if (!result) {
      throw new Error('No OCR response received from Google Vision');
    }

    const text = result.fullTextAnnotation?.text?.trim();
    if (!text) {
      throw new Error('Google Vision did not return any recognised text');
    }

    return {
      text,
      confidence: this._deriveConfidence(result),
      source: 'google-vision-rest',
    };
  }

  _deriveConfidence(result) {
    const pages = result.fullTextAnnotation?.pages;
    if (!Array.isArray(pages) || pages.length === 0) {
      return 0.8;
    }

    const confidences = pages
      .flatMap((page) => page.blocks ?? [])
      .map((block) => block.confidence)
      .filter((value) => typeof value === 'number');

    if (confidences.length === 0) {
      return 0.85;
    }

    const average = confidences.reduce((sum, value) => sum + value, 0) / confidences.length;
    return Number(Math.max(0.5, Math.min(0.99, average)).toFixed(2));
  }

  _coerceToBase64(imageBuffer) {
    if (Buffer.isBuffer(imageBuffer)) {
      return imageBuffer.toString('base64');
    }

    if (typeof imageBuffer === 'string') {
      return Buffer.from(imageBuffer, 'utf8').toString('base64');
    }

    throw new Error('Unsupported image buffer type for Google Vision OCR');
  }

  _buildUrl() {
    const hasQuery = this.endpoint.includes('?');
    const separator = hasQuery ? '&' : '?';
    return `${this.endpoint}${separator}key=${encodeURIComponent(this.apiKey)}`;
  }
}

module.exports = {
  GoogleVisionOcrEngine,
};
