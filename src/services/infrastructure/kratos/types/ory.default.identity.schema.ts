import { Identity } from '@ory/kratos-client';
import { OryTraits } from './ory.traits';

export interface AlkemioMetadataPublic {
  alkemio_actor_id?: string;
}

export interface OryDefaultIdentitySchema extends Identity {
  created_at: string; //UTC Zulu time
  id: string;
  metadata_public?: AlkemioMetadataPublic | null;
  recovery_addresses: [
    {
      created_at: string; //UTC Zulu time
      id: string;
      updated_at: string; //UTC Zulu time
      value: string;
      via: 'email';
    },
  ];
  schema_id: 'default' | 'customer' | 'employee';
  schema_url: string;
  state: 'active';
  state_changed_at: string;
  traits: OryTraits;
  updated_at: string; //UTC Zulu time
  verifiable_addresses: [
    {
      created_at: string; //UTC Zulu time
      id: string;
      status: 'completed' | 'sent';
      updated_at: string; //UTC Zulu time
      value: string;
      verified: boolean;
      verified_at: string; //UTC Zulu time
      via: 'email';
    },
  ];
}
