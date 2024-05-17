import { VirtualContributorEngine } from '@common/enums/virtual.persona.engine';

export interface VirtualPersonaEngineAdapterInputBase {
  userId: string;
  engine: VirtualContributorEngine;
}
