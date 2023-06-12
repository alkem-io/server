import { Module } from '@nestjs/common';
import { UUID } from './scalar.uuid';
import { NameID } from './scalar.nameid';
import { UUID_NAMEID } from './scalar.uuid.nameid';
import { UUID_NAMEID_EMAIL } from './scalar.uuid.nameid.email';
import { DID } from './scalar.did';
import { Markdown } from './scalar.markdown';
import { MessageID } from './scalar.messageid';
import { LifecycleDefinitionScalar } from './scalar.lifecycle.definition';
import { CID } from './scalar.cid';
import { Emoji } from './scalar.emoji';

@Module({
  imports: [],
  providers: [
    Emoji,
    NameID,
    UUID,
    UUID_NAMEID,
    UUID_NAMEID_EMAIL,
    DID,
    CID,
    Markdown,
    MessageID,
    LifecycleDefinitionScalar,
  ],
  exports: [],
})
export class ScalarsModule {}
