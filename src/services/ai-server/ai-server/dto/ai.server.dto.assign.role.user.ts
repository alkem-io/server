import { AiServerRole } from '@common/enums/ai.server.role';
import { UUID_NAMEID_EMAIL } from '@domain/common/scalars/scalar.uuid.nameid.email';
import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AssignAiServerRoleToUserInput {
  @Field(() => UUID_NAMEID_EMAIL, { nullable: false })
  userID!: string;

  @Field(() => AiServerRole, { nullable: false })
  role!: AiServerRole;
}
