const http = require('http');
const Busboy = require('busboy');
const { AppointmentPipeline } = require('./pipeline/appointmentPipeline');
const { resolveImageInput } = require('./utils/imageInput');

const DEFAULT_PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

function createServer({ pipeline } = {}) {
  const appointmentPipeline = pipeline ?? new AppointmentPipeline();

  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        respondJson(res, 200, { status: 'ok' });
        return;
      }

      if (req.method === 'POST' && req.url === '/appointments/parse') {
        const contentType = req.headers['content-type'] ?? '';
        let text;
        let imageBase64;
        let imageUrl;
        let imageText;
        let imageBuffer;

        if (contentType.includes('multipart/form-data')) {
          let multipartData;
          try {
            multipartData = await readMultipart(req);
          } catch (error) {
            respondJson(res, 400, { error: error.message });
            return;
          }

          const { fields, fileBuffer } = multipartData;
          text = fields.text;
          imageBase64 = fields.imageBase64;
          imageUrl = fields.imageUrl;
          imageText = fields.imageText;
          imageBuffer = fileBuffer;
        } else if (contentType.startsWith('application/octet-stream') || contentType.startsWith('image/')) {
          try {
            imageBuffer = await readBinary(req);
          } catch (error) {
            respondJson(res, 413, { error: error.message });
            return;
          }
        } else {
          let payload;
          try {
            payload = await readJson(req);
          } catch (error) {
            respondJson(res, 400, { error: error.message });
            return;
          }

          ({ text, imageBase64, imageUrl, imageText } = payload ?? {});
        }

        if (!text && !imageBase64 && !imageUrl && !imageText && !imageBuffer) {
          respondJson(res, 400, { error: 'Provide `text`, `imageBase64`, `imageUrl`, or attach an image file' });
          return;
        }

        let pipelineInput;
        if (text) {
          pipelineInput = { text };
        } else if (imageBuffer) {
          pipelineInput = { imageBuffer };
        } else {
          try {
            const buffer = await resolveImageInput({ imageBase64, imageUrl, imageText });
            pipelineInput = { imageBuffer: buffer };
          } catch (error) {
            respondJson(res, 400, { error: error.message });
            return;
          }
        }

        const result = await appointmentPipeline.process(pipelineInput);
        respondJson(res, 200, result);
        return;
      }

      respondJson(res, 404, { error: 'Not found' });
    } catch (error) {
      respondJson(res, 500, { error: error.message ?? 'Internal error' });
    }
  });
}

function respondJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', (err) => reject(new Error(err.message || 'Failed to read request')));
  });
}

function readBinary(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        reject(new Error('Uploaded file exceeds 5MB limit'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (error) => reject(error));
  });
}

function readMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers, limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 } });
    const fields = {};
    let fileBuffer = null;
    let fileError;

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, file) => {
      const chunks = [];
      file.on('data', (chunk) => {
        chunks.push(chunk);
      });
      file.on('limit', () => {
        fileError = new Error('Uploaded file exceeds 5MB limit');
        file.resume();
      });
      file.on('end', () => {
        if (!fileError) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    busboy.on('error', (error) => {
      fileError = error;
    });

    busboy.on('finish', () => {
      if (fileError) {
        reject(fileError);
        return;
      }
      resolve({ fields, fileBuffer });
    });

    req.pipe(busboy);
  });
}

if (require.main === module) {
  const server = createServer();
  server.listen(DEFAULT_PORT, () => {
    console.log(`Appointment pipeline listening on port ${DEFAULT_PORT}`);
  });
}

module.exports = {
  createServer,
};
