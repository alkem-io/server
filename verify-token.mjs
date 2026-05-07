import { jwtVerify, createRemoteJWKSet, decodeProtectedHeader, decodeJwt } from 'jose';
import fs from 'node:fs';

const token = fs.readFileSync('/tmp/at.jwt', 'utf8').trim();
console.log('len:', token.length, 'segments:', token.split('.').length);
console.log('header:', decodeProtectedHeader(token));
const p = decodeJwt(token);
console.log('claims:', { iss: p.iss, aud: p.aud, exp: p.exp, now: Math.floor(Date.now()/1000) });

const jwks = createRemoteJWKSet(new URL('http://localhost:3000/.well-known/jwks.json'));
try {
  const r = await jwtVerify(token, jwks, { issuer: 'http://localhost:3000/', audience: 'alkemio-web' });
  console.log('VERIFY OK kid=', r.protectedHeader.kid);
} catch (e) {
  console.log('VERIFY FAIL', e.code, e.message);
}
