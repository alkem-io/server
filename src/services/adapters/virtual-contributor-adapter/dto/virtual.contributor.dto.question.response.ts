import { VirtualContributorBaseResponse } from './virtual.contributor.dto.base.response';

export class VirtualContributorQueryResponse extends VirtualContributorBaseResponse {
  answer!: string;
  sources?: string;
  prompt_tokens!: number;
  completion_tokens!: number;
  total_tokens!: number;
  total_cost!: number;
}
