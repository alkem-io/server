import { MatrixAgentMessageRequest } from './matrix.agent.dto.message.request';

export class MatrixAgentMessageRequestDirect extends MatrixAgentMessageRequest {
  matrixID!: string;
}
