import { describe, expect, it } from 'vitest';
import { DEFAULT_ALLOWED_MIME_TYPES, MimeFileType } from './mime.file.type';
import { MimeTypeDocument } from './mime.file.type.document';

describe('MimeTypeDocument', () => {
  // Regression for alkem-io/server#6159 — admins must be able to upload
  // iCalendar (.ics) files wherever document upload is supported.
  it('includes the iCalendar (.ics) type mapped to text/calendar', () => {
    expect(MimeTypeDocument.ICS).toBe('text/calendar');
  });

  it('exposes ICS via the combined MimeFileType', () => {
    expect((MimeFileType as Record<string, string>).ICS).toBe('text/calendar');
  });

  it('allows text/calendar by default for new storage buckets', () => {
    expect(DEFAULT_ALLOWED_MIME_TYPES).toContain('text/calendar');
  });
});
