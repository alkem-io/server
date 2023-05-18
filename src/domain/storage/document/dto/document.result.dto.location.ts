import { Field, ObjectType } from '@nestjs/graphql';
import { IDocumentLocationResult } from './document.result.location.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IHub } from '@domain/challenge/hub/hub.interface';

@ObjectType('DocumentResultLocation', {
  implements: () => [IDocumentLocationResult],
})
export abstract class IJourneyDocumentLocationResult extends IDocumentLocationResult {
  @Field(() => IHub, {
    nullable: true,
    description:
      'The parent Hub of Storage Bucket, if the Storage Bucket is in a Hub.',
  })
  hub?: IHub;

  @Field(() => IChallenge, {
    nullable: true,
    description:
      'The parent Challenge of Storage Bucket, if the Storage Bucket is in a Challenge.',
  })
  challenge?: IChallenge;
}
