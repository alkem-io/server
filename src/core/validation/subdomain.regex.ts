// https://www.rfc-editor.org/rfc/rfc1034#section-3.5
export const SUBDOMAIN_PATTERN = '[a-z][a-z0-9\\-]{0,61}[a-z0-9]';
export const SUBDOMAIN_REGEX = new RegExp(`^${SUBDOMAIN_PATTERN}$`);
