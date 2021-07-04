import { MatrixAgentMessageRequest } from './matrix.agent.dto.message.request';

export class MatrixAgentMessageRequestCommunity extends MatrixAgentMessageRequest {
  communityId!: string;
}
