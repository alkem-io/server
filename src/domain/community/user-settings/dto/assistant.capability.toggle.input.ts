import { SMALL_TEXT_LENGTH } from '@common/constants';
import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsString, MaxLength } from 'class-validator';

/**
 * One per-capability toggle in an assistant-authority update
 * (contracts/assistant-authority.md §2). `capability` is an MCP tool name.
 */
@InputType()
export class AssistantCapabilityToggleInput {
  @Field(() => String, {
    nullable: false,
    description: 'The capability (MCP tool name) this toggle controls.',
  })
  @IsString()
  @MaxLength(SMALL_TEXT_LENGTH)
  capability!: string;

  @Field(() => Boolean, {
    nullable: false,
    description: 'Whether the capability is enabled.',
  })
  @IsBoolean()
  enabled!: boolean;
}
