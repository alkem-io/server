import { AiServerRole } from '@common/enums/ai.server.role';
import { UUID } from '@domain/common/scalars';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class RemoveAiServerRoleFromUserInput {
  @Field(() => UUID, { nullable: false })
  userID!: string;

  @Field(() => AiServerRole, { nullable: false })
  role!: AiServerRole;
}
