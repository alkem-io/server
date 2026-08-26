import type { IncomingMessage } from 'http';
import { describe, expect, it } from 'vitest';
import {
  decodeForwardedGuestName,
  decodeGuestNameHeader,
  resolveForwardAuthGuestName,
} from './guest-name.resolver';

const request = (headers: IncomingMessage['headers'] = {}) =>
  ({ headers }) as IncomingMessage;

describe('guest-name resolver', () => {
  it('decodes Unicode from the trusted forwarded URI', () => {
    expect(
      decodeForwardedGuestName(
        request({
          'x-forwarded-uri':
            '/collab/wb-1?type=whiteboard&guestName=Jos%C3%A9%20M%C3%BCller',
        })
      )
    ).toBe('José Müller');
  });

  it('decodes the existing Unicode-safe guest header', () => {
    expect(
      decodeGuestNameHeader(
        request({
          'x-guest-name': Buffer.from('李 明', 'utf8').toString('base64'),
        })
      )
    ).toBe('李 明');
  });

  it('preserves the original raw ASCII guest-header contract', () => {
    expect(
      decodeGuestNameHeader(request({ 'x-guest-name': 'John Visitor' }))
    ).toBe('John Visitor');
    expect(decodeGuestNameHeader(request({ 'x-guest-name': 'John' }))).toBe(
      'John'
    );
    expect(decodeGuestNameHeader(request({ 'x-guest-name': 'Mike' }))).toBe(
      'Mike'
    );
  });

  it.each([
    ['malformed encoded header', request({ 'x-guest-name': 'not-base64!!!' })],
    [
      'invalid UTF-8',
      request({ 'x-guest-name': Buffer.from([0xff]).toString('base64') }),
    ],
    [
      'malformed percent encoding',
      request({ 'x-forwarded-uri': '/collab/wb-1?guestName=%E0%A4%A' }),
    ],
  ])('rejects %s', (_name, req) => {
    expect(resolveForwardAuthGuestName(req)).toBeUndefined();
  });

  it('rejects non-string direct query values without throwing', () => {
    expect(
      resolveForwardAuthGuestName(request(), ['Alice', 'Mallory'])
    ).toBeUndefined();
  });

  it('uses the compatibility sources in direct, forwarded, header order', () => {
    const req = request({
      'x-forwarded-uri': '/collab/wb-1?guestName=Forwarded',
      'x-guest-name': Buffer.from('Header', 'utf8').toString('base64'),
    });

    expect(resolveForwardAuthGuestName(req, 'Direct')).toBe('Direct');
    expect(resolveForwardAuthGuestName(req)).toBe('Forwarded');
    expect(
      resolveForwardAuthGuestName(
        request({ 'x-guest-name': req.headers['x-guest-name'] })
      )
    ).toBe('Header');
  });
});
