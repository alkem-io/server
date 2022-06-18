import { ICredentialDefinition } from './credential.definition.interface';
export class CredentialDefinition implements ICredentialDefinition {
  type!: string;
  resourceID!: string;
}
