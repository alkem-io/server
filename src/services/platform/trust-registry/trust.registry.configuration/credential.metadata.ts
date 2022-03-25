export type CredentialMetadata = {
  name: string;
  description: string;
  issuer: string;
  schema: string;
  types: string[];
  uniqueType: string;
  context: Record<string, string>;
  trusted_issuers: string[];
};
