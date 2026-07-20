import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('CollaboraEditorUrlResult')
export class CollaboraEditorUrlResult {
  @Field(() => String, {
    description: 'The URL to open the document in the Collabora editor.',
  })
  editorUrl!: string;

  @Field(() => Number, {
    description:
      'When the access token expires, as an absolute Unix timestamp in milliseconds (the WOPI access_token_ttl passed through from the WOPI host); 0 means it does not expire.',
  })
  accessTokenTTL!: number;
}
