import { Module } from '@nestjs/common';
import { UUID } from './scalar.uuid';
import { NameID } from './scalar.nameid';
import { DID } from './scalar.did';
import { Markdown } from './scalar.markdown';
import { MessageID } from './scalar.messageid';
import { LifecycleDefinitionScalar } from './scalar.lifecycle.definition';
import { Emoji } from './scalar.emoji';
import { WhiteboardContent } from './scalar.whiteboard.content';
import { MemoContent } from './scalar.memo.content';
import { SearchCursor } from './scalar.search.cursor';

@Module({
  imports: [],
  providers: [
    Emoji,
    NameID,
    UUID,
    DID,
    Markdown,
    MessageID,
    LifecycleDefinitionScalar,
    MemoContent,
    WhiteboardContent,
    SearchCursor,
  ],
  exports: [],
})
export class ScalarsModule {}
