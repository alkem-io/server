import { VirtualContributorType } from '../virtual.contributor.type';
import { VirtualContributorInputBase } from './virtual.contributor.dto.base';

export interface VirtualContributorQueryInput
  extends VirtualContributorInputBase {
  question: string;
  prompt: string;
  virtualContributorType: VirtualContributorType;
  spaceID: string;
  roomID: string;
}
