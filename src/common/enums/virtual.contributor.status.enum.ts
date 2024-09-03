import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorStatus {
  INITIALIZING = 'initializing',
  READY = 'ready',
}

registerEnumType(VirtualContributorStatus, {
  name: 'VirtualContributorStatus',
});
