import { VirtualContributorEngine } from '@common/enums/virtual.contributor.engine';

export interface VirtualPersonaEngineAdapterInputBase {
  userId: string;
  engine: VirtualContributorEngine;
}
