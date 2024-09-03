import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { BaseSubscriptionPayload } from '@interfaces/index';

export interface VirtualContributorUpdatedSubscriptionPayload
  extends BaseSubscriptionPayload {
  virtualContributor: IVirtualContributor;
}
