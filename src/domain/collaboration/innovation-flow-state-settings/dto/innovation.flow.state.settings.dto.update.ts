import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';

@InputType()
export class UpdateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether new callouts can be added to this State; omission leaves the stored value unchanged.',
  })
  allowNewCallouts?: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether the phase is shown in member-facing navigation; omission leaves the stored value unchanged.',
  })
  visible?: boolean;

  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: true,
    description:
      'Optional. Sets how Post descriptions in this State are displayed in the feed; omission leaves the stored value unchanged.',
  })
  descriptionDisplayMode?: CalloutDescriptionDisplayMode;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Sets whether Posts in this State show publish details (publisher, publish date, avatar) in the feed; omission leaves the stored value unchanged.',
  })
  showPublishDetails?: boolean;

  @Field(() => [SidebarWidget], {
    nullable: true,
    description:
      'Optional. Ordered sidebar widgets for this State; omission leaves the stored value unchanged. Duplicates rejected; max 20 entries.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SidebarWidget, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(20)
  sidebar?: SidebarWidget[];
}
