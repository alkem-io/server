import {
  parseChildMessage,
  parseParentMessage,
} from './memo.pdf.executor.protocol';

describe('memo PDF executor protocol', () => {
  const jobId = 'job-1';
  const jpeg = Buffer.from([0xff, 0xd8, 0xff]);

  describe('parent messages', () => {
    it.each([
      [{ type: 'START', jobId, state: Buffer.from('state') }],
      [
        {
          type: 'IMAGE',
          jobId,
          index: 0,
          outcome: { kind: 'data', jpeg, width: 2, height: 3 },
        },
      ],
      [{ type: 'IMAGE', jobId, index: 19, outcome: { kind: 'link' } }],
    ])('accepts %j', message => {
      expect(parseParentMessage(message)).toEqual(message);
    });

    it.each([
      ['a non-object', 'START'],
      ['an unknown type', { type: 'DONE', jobId, state: Buffer.from('x') }],
      ['a missing job id', { type: 'START', state: Buffer.from('x') }],
      [
        'an empty job id',
        { type: 'START', jobId: '', state: Buffer.from('x') },
      ],
      ['a non-Buffer state', { type: 'START', jobId, state: [1, 2, 3] }],
      [
        'a negative index',
        { type: 'IMAGE', jobId, index: -1, outcome: { kind: 'link' } },
      ],
      [
        'a fractional index',
        { type: 'IMAGE', jobId, index: 1.5, outcome: { kind: 'link' } },
      ],
      [
        'a non-Buffer JPEG',
        {
          type: 'IMAGE',
          jobId,
          index: 0,
          outcome: { kind: 'data', jpeg: 'base64', width: 2, height: 3 },
        },
      ],
      [
        'a missing image dimension',
        { type: 'IMAGE', jobId, index: 0, outcome: { kind: 'data', jpeg } },
      ],
      [
        'an unknown outcome kind',
        { type: 'IMAGE', jobId, index: 0, outcome: { kind: 'file' } },
      ],
    ])('rejects %s', (_label, message) => {
      expect(parseParentMessage(message)).toBeUndefined();
    });
  });

  describe('child messages', () => {
    it.each([
      [{ type: 'RESOLVE_IMAGE', jobId, index: 0, src: 'https://x/y.png' }],
      [{ type: 'DONE', jobId, pdf: Buffer.from('%PDF-'), imageCount: 0 }],
      [{ type: 'FAILED', jobId, kind: 'invalid', message: 'too many' }],
      [{ type: 'FAILED', jobId, kind: 'crashed', message: 'TypeError' }],
    ])('accepts %j', message => {
      expect(parseChildMessage(message)).toEqual(message);
    });

    it.each([
      ['a non-object', null],
      [
        'a parent message type',
        { type: 'START', jobId, state: Buffer.from('x') },
      ],
      [
        'a missing job id',
        { type: 'DONE', pdf: Buffer.from('x'), imageCount: 0 },
      ],
      [
        'a non-Buffer pdf',
        { type: 'DONE', jobId, pdf: '%PDF-', imageCount: 0 },
      ],
      [
        'a negative image count',
        { type: 'DONE', jobId, pdf: Buffer.from('x'), imageCount: -1 },
      ],
      [
        'a negative index',
        { type: 'RESOLVE_IMAGE', jobId, index: -1, src: 'https://x' },
      ],
      ['a missing source', { type: 'RESOLVE_IMAGE', jobId, index: 0 }],
      [
        'an unknown failure kind',
        { type: 'FAILED', jobId, kind: 'busy', message: 'x' },
      ],
    ])('rejects %s', (_label, message) => {
      expect(parseChildMessage(message)).toBeUndefined();
    });
  });
});
