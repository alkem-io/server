import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ICollaboraDocument } from '@domain/collaboration/collabora-document/collabora.document.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { SearchResultBase } from './search.result.base';
import { ISearchResult } from './search.result.interface';

@ObjectType('SearchResultCollaboraDocument', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultCollaboraDocument extends SearchResultBase() {
  @Field(() => ICollaboraDocument, {
    nullable: false,
    description: 'The Collabora document that was found.',
  })
  collaboraDocument!: ICollaboraDocument;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space of the Collabora document.',
  })
  space!: ISpace;

  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout of the Collabora document.',
  })
  callout!: ICallout;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the Collabora document is a contribution (response) or part of the framing.',
  })
  isContribution!: boolean;
}
