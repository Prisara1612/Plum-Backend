const { OcrService } = require('../ocr/ocrService');
const { EntityExtractor } = require('../entities/entityExtractor');
const { Normalizer } = require('../normalization/normalizer');

class AppointmentPipeline {
  constructor(options = {}) {
    this.ocrService = options.ocrService ?? new OcrService();
    this.entityExtractor = options.entityExtractor ?? new EntityExtractor();
    this.normalizer = options.normalizer ?? new Normalizer();

    this.thresholds = {
      ocrConfidence: 0.5,
      entityConfidence: 0.6,
      normalizationConfidence: 0.6,
    };
  }

  async process(input) {
    const ocrResult = await this.ocrService.extract(input);
    const entityResult = this.entityExtractor.extract(ocrResult.rawText);
    const normalizationResult = this.normalizer.normalize({
      chronoResults: entityResult.details.chronoResults,
      referenceDate: this.entityExtractor.referenceDate,
    });

    const guardrail = this._checkGuardrails({ ocrResult, entityResult, normalizationResult });
    if (guardrail) {
      return {
        status: 'needs_clarification',
        message: guardrail.message,
        context: guardrail.context,
        intermediates: {
          ocrResult,
          entityResult,
          normalizationResult,
        },
      };
    }

    const appointment = {
      department: entityResult.entities.department,
      date: normalizationResult.normalized.date,
      time: normalizationResult.normalized.time,
      tz: normalizationResult.normalized.tz,
    };

    return {
      status: 'ok',
      appointment,
      intermediates: {
        ocrResult,
        entityResult,
        normalizationResult,
      },
    };
  }

  _checkGuardrails({ ocrResult, entityResult, normalizationResult }) {
    if (!ocrResult.rawText) {
      return { message: 'Unable to extract text from input', context: { stage: 'ocr' } };
    }

    if (ocrResult.confidence < this.thresholds.ocrConfidence) {
      return {
        message: 'Low OCR confidence, please provide clearer text',
        context: { stage: 'ocr', confidence: ocrResult.confidence },
      };
    }

    const { entities } = entityResult;
    if (!entities.department) {
      return {
        message: 'Ambiguous or missing department',
        context: { stage: 'entity-extraction' },
      };
    }

    if (!entities.datePhrase || !entities.timePhrase) {
      return {
        message: 'Ambiguous date or time phrase',
        context: { stage: 'entity-extraction' },
      };
    }

    if (entityResult.entitiesConfidence < this.thresholds.entityConfidence) {
      return {
        message: 'Low confidence in extracted entities',
        context: {
          stage: 'entity-extraction',
          confidence: entityResult.entitiesConfidence,
        },
      };
    }

    if (!normalizationResult.normalized) {
      return {
        message: 'Unable to normalise date/time',
        context: { stage: 'normalization' },
      };
    }

    if (normalizationResult.normalizationConfidence < this.thresholds.normalizationConfidence) {
      return {
        message: 'Low confidence in date/time normalisation',
        context: {
          stage: 'normalization',
          confidence: normalizationResult.normalizationConfidence,
        },
      };
    }

    return null;
  }
}

module.exports = {
  AppointmentPipeline,
};
