const { DateTime } = require('luxon');

class Normalizer {
  constructor({ timezone = 'Asia/Kolkata' } = {}) {
    this.timezone = timezone;
  }

  normalize({ chronoResults, referenceDate = new Date() }) {
    const primaryResult = chronoResults?.[0];

    if (!primaryResult) {
      return {
        normalized: null,
        normalizationConfidence: 0,
        details: { reason: 'no-date' }
      };
    }

    const date = primaryResult.date();
    const dateTime = DateTime.fromJSDate(date).setZone(this.timezone);

    const normalized = {
      date: dateTime.toISODate(),
      time: dateTime.toFormat('HH:mm'),
      tz: this.timezone,
    };

    const confidence = this._estimateConfidence(primaryResult, normalized, referenceDate);

    return {
      normalized,
      normalizationConfidence: confidence,
      details: {
        isCertain: primaryResult.start?.isCertain?.('hour') ?? false,
        tags: primaryResult.tags ?? {},
      }
    };
  }

  _estimateConfidence(primaryResult, normalized, referenceDate) {
    if (!normalized) {
      return 0;
    }

    const hasTime = primaryResult.start?.isCertain?.('hour') ?? false;
    const hasMeridiem = primaryResult.start?.isCertain?.('meridiem') ?? false;

    let confidence = 0.6;
    if (hasTime) {
      confidence += 0.2;
    }
    if (hasMeridiem) {
      confidence += 0.1;
    }

    const diffDays = Math.abs(DateTime.fromISO(normalized.date).diff(DateTime.fromJSDate(referenceDate), 'days').days);
    if (diffDays > 180) {
      confidence -= 0.15;
    }

    return Number(Math.min(0.95, Math.max(0.4, confidence)).toFixed(2));
  }
}

module.exports = {
  Normalizer,
};
