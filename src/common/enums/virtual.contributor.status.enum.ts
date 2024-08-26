import { registerEnumType } from '@nestjs/graphql';

export enum VirtualContributorStatus {
  NITIALIZING = 'initializing',
  READY = 'ready',
}

registerEnumType(VirtualContributorStatus, {
  name: 'VirtualContributorStatus',
});
