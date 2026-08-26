import { X_GUEST_NAME_HEADER } from '@core/authentication/constants';
import type { IncomingMessage } from 'http';
import { TextDecoder } from 'util';

const X_FORWARDED_URI_HEADER = 'x-forwarded-uri';
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const CONTROL_CHARACTER_PATTERN = /\p{Cc}/u;

const firstHeaderValue = (
  request: IncomingMessage,
  header: string
): string | undefined => {
  const raw = request.headers?.[header];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

const normalizeGuestName = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized || normalized.includes('\uFFFD')) {
    return undefined;
  }
  return normalized;
};

type EncodedGuestName = {
  matched: boolean;
  guestName?: string;
};

const decodeEncodedGuestName = (encoded: string): EncodedGuestName => {
  if (!BASE64_PATTERN.test(encoded)) {
    return { matched: false };
  }

  try {
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.toString('base64') !== encoded) {
      return { matched: false };
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const guestName = normalizeGuestName(decoded);
    if (guestName && CONTROL_CHARACTER_PATTERN.test(guestName)) {
      return { matched: false };
    }
    return { matched: true, guestName };
  } catch {
    return { matched: false };
  }
};

const decodeEncodedGuestNameHeader = (
  request: IncomingMessage
): string | undefined => {
  const encoded = firstHeaderValue(request, X_GUEST_NAME_HEADER);
  return encoded ? decodeEncodedGuestName(encoded).guestName : undefined;
};

/**
 * Resolves the platform guest header for the global authentication interceptor.
 * New browser callers use Unicode-safe base64; the original public contract
 * also permits a raw ASCII display name, which remains supported here.
 */
export const decodeGuestNameHeader = (
  request: IncomingMessage
): string | undefined => {
  const raw = firstHeaderValue(request, X_GUEST_NAME_HEADER);
  if (!raw) {
    return undefined;
  }
  const encoded = decodeEncodedGuestName(raw);
  return encoded.matched ? encoded.guestName : normalizeGuestName(raw);
};

/** Reads guestName from the original target URI supplied by trusted ForwardAuth. */
export const decodeForwardedGuestName = (
  request: IncomingMessage
): string | undefined => {
  const forwardedUri = firstHeaderValue(request, X_FORWARDED_URI_HEADER);
  if (!forwardedUri) {
    return undefined;
  }

  try {
    const parsed = new URL(forwardedUri, 'http://forward-auth.internal');
    return normalizeGuestName(
      parsed.searchParams.get('guestName') ?? undefined
    );
  } catch {
    return undefined;
  }
};

/**
 * Resolves the current guest metadata sources at the ForwardAuth boundary.
 * Direct query is retained for compatibility; production WS and asset requests
 * arrive through the trusted forwarded URI and encoded header respectively.
 */
export const resolveForwardAuthGuestName = (
  request: IncomingMessage,
  directGuestName?: unknown
): string | undefined =>
  normalizeGuestName(directGuestName) ??
  decodeForwardedGuestName(request) ??
  decodeEncodedGuestNameHeader(request);
