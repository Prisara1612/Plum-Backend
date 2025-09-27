const { AppointmentPipeline } = require('./pipeline/appointmentPipeline');

async function main() {
  const pipeline = new AppointmentPipeline();

  const textInput = {
    text: 'Book dentist next Friday at 3pm',
  };

  const imageInput = {
    imageBuffer: Buffer.from('book dentist nxt Friday @ 3 pm'),
  };

  const textResult = await pipeline.process(textInput);
  const imageResult = await pipeline.process(imageInput);

  console.log('--- Text Input ---');
  console.log(JSON.stringify(textResult, null, 2));
  console.log('\n--- Image/OCR Input ---');
  console.log(JSON.stringify(imageResult, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  main,
};
