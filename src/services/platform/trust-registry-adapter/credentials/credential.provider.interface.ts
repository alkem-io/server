export type CredentialMetadata = {
  name: string;
  description: string;
  schema: string;
  types: string[];
  uniqueType: string;
  context: Record<string, string>;
};

export type CredentialConfig = {
  credentials: CredentialMetadata[];
};

export interface ICredentialConfigProvider {
  getCredentials(): CredentialConfig;
}
