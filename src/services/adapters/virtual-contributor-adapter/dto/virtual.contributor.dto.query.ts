import { VirtualContributorInputBase } from './virtual.contributor.dto.base';

export interface VirtualContributorQueryInput
  extends VirtualContributorInputBase {
  question: string;
  prompt: string;
}
