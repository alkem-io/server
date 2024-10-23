import { AiServerRole } from '@common/enums/ai.server.role';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignAiServerRoleToUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => AiServerRole, { nullable: false })
  role!: AiServerRole;
}
