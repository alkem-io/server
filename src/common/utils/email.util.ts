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
