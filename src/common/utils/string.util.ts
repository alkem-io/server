export function ensureMaxLength(
  string: string,
  maxLength: number,
  ellipsis = '...'
): string {
  if (!string || string.length <= maxLength) return string;
  if (ellipsis) {
    return string.substring(0, maxLength - ellipsis.length) + ellipsis;
  } else {
    return string.substring(0, maxLength);
  }
}
