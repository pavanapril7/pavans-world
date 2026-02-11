require('@testing-library/jest-dom');
require('dotenv').config();

// Polyfill for TextEncoder/TextDecoder required by Prisma
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for ReadableStream
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Polyfill for MessageChannel and MessagePort
const { MessageChannel, MessagePort } = require('worker_threads');
global.MessageChannel = MessageChannel;
global.MessagePort = MessagePort;

// Polyfill for Request, Response, Headers, fetch for Next.js API routes
// Using undici which is built into Node.js 18+
if (typeof global.Request === 'undefined') {
  const { Request, Response, Headers, FormData, fetch } = require('undici');
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  global.FormData = FormData;
  global.fetch = fetch;
}
