#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { AppointmentPipeline } = require('../src/pipeline/appointmentPipeline');

async function main() {
  const [, , imagePath] = process.argv;
  if (!imagePath) {
    console.error('Usage: node scripts/parseImage.js <image-path>');
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), imagePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const buffer = fs.readFileSync(absolutePath);
  const pipeline = new AppointmentPipeline();
  const result = await pipeline.process({ imageBuffer: buffer });
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
