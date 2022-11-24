import { Module } from '@nestjs/common';
import { UUID } from './scalar.uuid';
import { NameID } from './scalar.nameid';
import { UUID_NAMEID } from './scalar.uuid.nameid';
import { UUID_NAMEID_EMAIL } from './scalar.uuid.nameid.email';
import { DID } from './scalar.did';
import { Markdown } from './scalar.markdown';
import { MessageID } from './scalar.message';
import { LifecycleDefinitionScalar } from './scalar.lifecycle.definition';
import { CID } from './scalar.cid';

@Module({
  imports: [],
  providers: [
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
