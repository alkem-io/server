import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CollaboraEditorUrlResult')
export class CollaboraEditorUrlResult {
  @Field(() => String, {
    description: 'The URL to open the document in the Collabora editor.',
  })
  editorUrl!: string;

  @Field(() => Number, {
    description: 'The time-to-live of the access token in seconds.',
  })
  accessTokenTTL!: number;
}
