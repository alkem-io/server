import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, IsEnum, IsOptional, IsUUID } from 'class-validator';

/**
 * Partial-update selection settings (FR-022): an omitted field leaves the
 * stored value unchanged; a provided field replaces its stored value whole.
 * The id list is never merged — it is replaced in full.
 */
@InputType()
export class UpdateCalloutSelectionSettingsInput {
  @Field(() => CalloutSelectionMode, {
    nullable: true,
    description:
      'The selection mode (AUTO or CUSTOM). When omitted, the stored mode is unchanged.',
  })
  @IsOptional()
  @IsEnum(CalloutSelectionMode)
  mode?: CalloutSelectionMode;

  @Field(() => [ID], {
    nullable: true,
    description:
      'Replaces the curated selection in full (CUSTOM mode). At most 500 entries. Deduplicated by the server. When omitted, the stored list is unchanged.',
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  @ArrayMaxSize(500)
  selectedIds?: string[];
}
