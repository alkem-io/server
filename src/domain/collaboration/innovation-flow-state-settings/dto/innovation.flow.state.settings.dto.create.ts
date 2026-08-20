import { CalloutDescriptionDisplayMode } from '@common/enums/callout.description.display.mode';
import { SidebarWidget } from '@common/enums/sidebar.widget';
import { Field, InputType, ObjectType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsOptional,
} from 'class-validator';

@InputType()
@ObjectType('CreateInnovationFlowStateSettingsData')
export class CreateInnovationFlowStateSettingsInput {
  @Field(() => Boolean, {
    nullable: false,
    description: 'The flag to set.',
  })
  allowNewCallouts!: boolean;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Whether the phase is shown in member-facing navigation. Defaults to true when omitted.',
  })
  visible?: boolean;

  @Field(() => CalloutDescriptionDisplayMode, {
    nullable: true,
    description:
      'Optional. How Post descriptions in this State are displayed in the feed: expanded or collapsed. Defaults to EXPANDED when omitted.',
  })
  descriptionDisplayMode?: CalloutDescriptionDisplayMode;

  @Field(() => Boolean, {
    nullable: true,
    description:
      'Optional. Whether Posts in this State show publish details in the feed. Defaults to true when omitted.',
  })
  showPublishDetails?: boolean;

  @Field(() => [SidebarWidget], {
    nullable: true,
    description:
      'Optional. Ordered sidebar widgets; defaults to [INTENT, INDEX] when omitted.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SidebarWidget, { each: true })
  @ArrayUnique()
  @ArrayMaxSize(20)
  sidebar?: SidebarWidget[];
}
