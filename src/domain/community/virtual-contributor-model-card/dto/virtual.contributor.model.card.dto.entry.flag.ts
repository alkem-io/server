import { VirtualContributorModelCardEntryFlagName } from '@common/enums/virtual.contributor.model.card.entry.flag.name';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('VirtualContributorModelCardFlag')
export class VirtualContributorModelCardEntryFlag {
  @Field(() => VirtualContributorModelCardEntryFlagName, {
    description: 'The name of the Model Card Entry flag',
    nullable: false,
  })
  name!: VirtualContributorModelCardEntryFlagName;

  @Field(() => Boolean, {
    description: 'Is this model card entry flag enabled?',
    nullable: false,
  })
  enabled!: boolean;
}
