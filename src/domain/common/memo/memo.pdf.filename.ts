const MAX_SLUG_LENGTH = 80;

/**
 * The download filename the server announces in Content-Disposition:
 * `<slug>-<YYYY-MM-DD>.pdf`. The slug is ASCII `[a-z0-9-]` only, so the header
 * never needs quoting rules or an RFC 5987 `filename*` parameter; a title with
 * no ASCII letters or digits falls back to `memo`. The date is the UTC
 * calendar date of the request.
 */
export const memoPdfFilename = (
  displayName: string | undefined,
  now: Date
): string => {
  const slug =
    (displayName ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, MAX_SLUG_LENGTH)
      .replace(/-+$/g, '') || 'memo';
  return `${slug}-${now.toISOString().slice(0, 10)}.pdf`;
};
