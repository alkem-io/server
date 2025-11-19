export const splitEmail = (email: string): { name: string; domain: string } => {
  if (!email.includes('@')) {
    throw new Error('Email does not include "@" separator');
  }

  const [name, domain] = email.split('@');
  return { name, domain };
};

export const getEmailName = (email: string): string => splitEmail(email).name;
export const getEmailDomain = (email: string): string =>
  splitEmail(email).domain;

export const validateEmail = (email: string): boolean => {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
};

export const isEmailBlacklisted = (
  email: string,
  blacklistedDomains: string[] = [],
  blacklistedAddresses: string[] = []
): boolean => {
  if (!email) {
    return false;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if the exact email address is blacklisted
  if (
    blacklistedAddresses.some(
      addr => addr.toLowerCase().trim() === normalizedEmail
    )
  ) {
    return true;
  }

  // Check if the email domain is blacklisted
  try {
    const domain = getEmailDomain(normalizedEmail);
    return blacklistedDomains.some(d => d.toLowerCase().trim() === domain);
  } catch {
    // If we can't extract domain, consider it not blacklisted
    return false;
  }
};
