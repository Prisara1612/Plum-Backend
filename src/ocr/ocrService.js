const { config } = require('../config');
const { GoogleVisionOcrEngine } = require('./googleVisionEngine');

const DEFAULT_TEXT_CONFIDENCE = 0.95;

class OcrService {
  constructor({ engine } = {}) {
    this.engine = engine ?? this._createEngineFromConfig();
  }

  /**
   * @param {Object} input
   * @param {string} [input.text] - Direct text input.
   * @param {Buffer|string} [input.imageBuffer] - Image contents (binary or pre-extracted text for demo).
   */
  async extract(input = {}) {
    const { text, imageBuffer } = input;

    if (text && text.trim()) {
      return {
        rawText: text.trim(),
        confidence: DEFAULT_TEXT_CONFIDENCE,
        source: 'text'
      };
    }

    if (imageBuffer) {
      const result = await this.engine.recognize(imageBuffer);
      return {
        rawText: result.text,
        confidence: result.confidence,
        source: result.source ?? 'image'
      };
    }

    throw new Error('Either text or imageBuffer is required for OCR extraction');
  }

  _createEngineFromConfig() {
    switch (config.ocr.provider) {
      case 'google_vision_rest':
        return new GoogleVisionOcrEngine(config.ocr.googleVision);
      case 'mock':
        return new MockOcrEngine();
      default:
        throw new Error(`Unsupported OCR provider: ${config.ocr.provider}`);
    }
  }
}

class MockOcrEngine {
  async recognize(imageBuffer) {
    const text = this._bufferToText(imageBuffer);
    const normalised = this._normaliseNoise(text);
    const confidence = this._estimateConfidence(text);

    return {
      text: normalised,
      confidence,
      source: 'mock-ocr'
    };
  }

  _bufferToText(imageBuffer) {
    if (Buffer.isBuffer(imageBuffer)) {
      return imageBuffer.toString('utf8');
    }

    if (typeof imageBuffer === 'string') {
      return imageBuffer;
    }

    throw new Error('Unsupported image buffer type for mock OCR');
  }

  _normaliseNoise(text) {
    return text
      .replace(/@/g, 'a')
      .replace(/\s+/g, ' ')
      .replace(/\bnxt\b/gi, 'next')
      .trim();
  }

  _estimateConfidence(text) {
    const length = text.length || 1;
    const noiseMatches = (text.match(/[@#\$%\*]/g) || []).length;
    const noiseRatio = noiseMatches / length;
    return Number(Math.max(0.5, 0.9 - noiseRatio).toFixed(2));
  }
}

module.exports = {
  OcrService,
  MockOcrEngine,
  GoogleVisionOcrEngine,
};
