const test = require('node:test');
const assert = require('node:assert');

const { AppointmentPipeline } = require('../src/pipeline/appointmentPipeline');
const { EntityExtractor } = require('../src/entities/entityExtractor');

const referenceDate = new Date('2025-09-18T09:00:00+05:30');

function createPipeline() {
  return new AppointmentPipeline({
    entityExtractor: new EntityExtractor({ referenceDate })
  });
}

test('pipeline produces structured appointment for valid text input', async () => {
  const pipeline = createPipeline();

  const result = await pipeline.process({ text: 'Book dentist next Friday at 3pm' });

  assert.strictEqual(result.status, 'ok');
  assert.deepStrictEqual(result.appointment, {
    department: 'Dentistry',
    date: '2025-09-26',
    time: '15:00',
    tz: 'Asia/Kolkata'
  });
});

test('pipeline requests clarification when department is missing', async () => {
  const pipeline = createPipeline();

  const result = await pipeline.process({ text: 'Book appointment next Friday at 3pm' });

  assert.strictEqual(result.status, 'needs_clarification');
  assert.strictEqual(result.message, 'Ambiguous or missing department');
});
