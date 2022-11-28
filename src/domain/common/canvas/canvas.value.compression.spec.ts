import { Test, TestingModule } from '@nestjs/testing';
import {
  deflateRawSync,
  inflate,
  inflateSync,
  gzip,
  gunzip,
  deflateSync,
  deflate,
} from 'zlib';
import { promisify } from 'util';

const deflateAsync = promisify(gzip);
const inflateAsync = promisify(gunzip);

describe('Compression', () => {
  it('should be defined', async () => {
    const input = 'GeeksForGeeks';
    // Calling deflateSync method
    // const deflated = await deflateAsync(input);
    const deflated = await deflateAsync(Buffer.from(input, 'utf-8'));
    console.log(
      '\n\n\n============ Deflated ============\n',
      deflated.toString('base64'),
      '\n========================\n\n\n'
    );

    // Calling inflateSync method
    // const inflated = await inflateAsync(deflated.toString('base64'));
    const inflated = await inflateAsync(
      Buffer.from(deflated.toString('base64'), 'utf-8')
    );

    console.log(
      '\n\n\n============ Inflated ============\n',
      inflated.toString(),
      '\n========================\n\n\n'
    );

    expect(inflated.toString()).toEqual(input);
  });
});

describe('Compression example', () => {
  it('should be equal strings after decompression', async () => {
    const input = 'GeeksforGeeks';
    // Calling deflateSync method
    const deflated = await deflateAsync(input);
    // const deflated = deflateSync(input);

    // Calling inflateSync method
    const inflated = await inflateAsync(Buffer.from(deflated));
    // const inflated = inflateSync(Buffer.from(deflated)).toString();

    expect(inflated.toString()).toEqual(input);
  });
});

describe('Buffer toSting example', () => {
  it('should be same string', async () => {
    const input = 'test string';
    const buffer = Buffer.from(input, 'utf-8');
    const convertedString = buffer.toString();

    expect(convertedString).toBe(input);
  });
});
