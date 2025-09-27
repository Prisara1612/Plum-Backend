const chrono = require('chrono-node');

const DEPARTMENT_CANONICAL_MAP = new Map([
  ['dentist', 'Dentistry'],
  ['dentistry', 'Dentistry'],
  ['dental', 'Dentistry'],
  ['cardio', 'Cardiology'],
  ['cardiologist', 'Cardiology'],
  ['cardiology', 'Cardiology'],
  ['dermatologist', 'Dermatology'],
  ['skin', 'Dermatology'],
  ['dermatology', 'Dermatology'],
  ['eye', 'Ophthalmology'],
  ['ophthalmology', 'Ophthalmology'],
  ['ophthalmologist', 'Ophthalmology'],
  ['ent', 'Otolaryngology'],
  ['orthopedic', 'Orthopedics'],
  ['orthopaedic', 'Orthopedics'],
  ['physio', 'Physiotherapy'],
  ['physiotherapy', 'Physiotherapy'],
]);

class EntityExtractor {
  constructor({ referenceDate } = {}) {
    this.referenceDate = referenceDate ?? new Date();
  }

  extract(text) {
    if (!text || !text.trim()) {
      throw new Error('Text is required for entity extraction');
    }

    const trimmed = text.trim();
    const chronoResults = chrono.casual.parse(trimmed, this.referenceDate);

    const primaryResult = chronoResults[0];

    const datePhrase = primaryResult ? primaryResult.text : null;
    const timePhrase = this._extractTimePhrase(primaryResult);

    const departmentMatch = this._extractDepartment(trimmed);

    const confidence = this._estimateConfidence({
      hasDate: Boolean(primaryResult),
      hasTime: Boolean(timePhrase),
      hasDepartment: Boolean(departmentMatch.canonical)
    });

    return {
      entities: {
        datePhrase: datePhrase ?? null,
        timePhrase: timePhrase ?? null,
        department: departmentMatch.canonical ?? null,
      },
      details: {
        chronoResults,
        rawDepartment: departmentMatch.match ?? null,
      },
      entitiesConfidence: confidence,
    };
  }

  _extractTimePhrase(primaryResult) {
    if (!primaryResult) {
      return null;
    }

    const { start } = primaryResult;
    if (start && start.knownValues && start.knownValues.hour !== undefined) {
      return primaryResult.text;
    }

    return null;
  }

  _extractDepartment(text) {
    const lower = text.toLowerCase();
    let bestMatch = { canonical: null, match: null };

    for (const [variant, canonical] of DEPARTMENT_CANONICAL_MAP.entries()) {
      const regex = new RegExp(`\\b${this._escapeRegex(variant)}\\b`, 'i');
      const match = lower.match(regex);
      if (match) {
        bestMatch = { canonical, match: match[0] };
        break;
      }
    }

    return bestMatch;
  }

  _estimateConfidence({ hasDate, hasTime, hasDepartment }) {
    const weights = {
      hasDate: 0.4,
      hasTime: 0.3,
      hasDepartment: 0.3,
    };

    const score =
      (hasDate ? weights.hasDate : 0) +
      (hasTime ? weights.hasTime : 0) +
      (hasDepartment ? weights.hasDepartment : 0);

    return Number(Math.min(0.95, 0.5 + score).toFixed(2));
  }

  _escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = {
  EntityExtractor,
  DEPARTMENT_CANONICAL_MAP,
};
