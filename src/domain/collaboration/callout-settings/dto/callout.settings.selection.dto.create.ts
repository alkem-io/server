import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { Field, ID, InputType, ObjectType } from '@nestjs/graphql';
import { ArrayMaxSize, IsEnum, IsOptional, IsUUID } from 'class-validator';

/**
 * CREATE-time selection settings. Both fields are optional (partial-update
 * semantics apply from the start; the normalizer applies defaults — FR-022).
 *
 * Dual-decorated (@InputType + @ObjectType) so it can nest inside the dual
 * CreateCalloutSettingsFramingData, matching the contributors pattern.
 */
@InputType()
@ObjectType('CreateCalloutSelectionSettingsData')
export class CreateCalloutSelectionSettingsInput {
  @Field(() => CalloutSelectionMode, {
    nullable: true,
    description:
      'The selection mode (AUTO or CUSTOM). Defaults to AUTO when omitted.',
  })
  @IsOptional()
  @IsEnum(CalloutSelectionMode)
  mode?: CalloutSelectionMode;

  @Field(() => [ID], {
    nullable: true,
    description:
      'The curated selection of actor/space IDs (CUSTOM mode). At most 500. Deduplicated by the server.',
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  selectedIds?: string[];
}
