// FR-024 — boot-time parse of BEARER_AUD_ALLOW_LIST. Comma-separated list of
// audience values acceptable on Hydra-issued JWTs. Empty entries are rejected
// (raises) since "no audience" silently disables the check; duplicates are
// warn-logged but tolerated (drift between env files happens).

import type { LoggerService } from '@nestjs/common';

export class BearerAudAllowListEmptyError extends Error {
  constructor() {
    super('BEARER_AUD_ALLOW_LIST is empty — refusing to boot Bearer path');
    this.name = 'BearerAudAllowListEmptyError';
  }
}

export function parseBearerAudAllowList(
  raw: string,
  logger?: LoggerService
): string[] {
  const seen = new Set<string>();
  const dupes: string[] = [];
  const out: string[] = [];
  for (const part of (raw ?? '').split(',')) {
    const v = part.trim();
    if (v.length === 0) continue;
    if (seen.has(v)) {
      dupes.push(v);
      continue;
    }
    seen.add(v);
    out.push(v);
  }
  if (out.length === 0) throw new BearerAudAllowListEmptyError();
  if (dupes.length > 0) {
    logger?.warn?.(
      `BEARER_AUD_ALLOW_LIST contained duplicate entries: ${dupes.join(', ')}`,
      'BearerAudAllowList'
    );
  }
  return out;
}
