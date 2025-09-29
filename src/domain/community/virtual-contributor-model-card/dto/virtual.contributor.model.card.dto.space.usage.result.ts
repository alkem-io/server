import { VirtualContributorModelCardEntry } from '@common/enums/virtual.contributor.model.card.entry';
import { Field, ObjectType } from '@nestjs/graphql';
import { VirtualContributorModelCardEntryFlag } from './virtual.contributor.model.card.dto.entry.flag';

@ObjectType()
export class ModelCardSpaceUsageResult {
  @Field(() => VirtualContributorModelCardEntry, {
    description: 'The Model Card Entry type.',
  })
  modelCardEntry!: VirtualContributorModelCardEntry;

  @Field(() => [VirtualContributorModelCardEntryFlag], {
    nullable: false,
    description: 'The Flags for this Model Card Entry.',
  })
  flags?: VirtualContributorModelCardEntryFlag[];
}
