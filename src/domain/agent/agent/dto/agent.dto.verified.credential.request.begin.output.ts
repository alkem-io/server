import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentBeginVerifiedCredentialRequestOutput {
  @Field(() => String, {
    nullable: false,
    description:
      'The QR Code Image to be offered on the client for scanning by a mobile wallet',
  })
  qrCode!: string;

  @Field({
    nullable: false,
    description:
      'The token containing the information about issuer, callback endpoint and the credentials offered',
  })
  jwt!: string;
}
