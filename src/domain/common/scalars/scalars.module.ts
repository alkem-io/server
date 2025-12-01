import { Module } from '@nestjs/common';
import { UUID } from './scalar.uuid';
import { NameID } from './scalar.nameid';
import { Markdown } from './scalar.markdown';
import { MessageID } from './scalar.messageid';
import { LifecycleDefinitionScalar } from './scalar.lifecycle.definition';
import { Emoji } from './scalar.emoji';
import { WhiteboardContent } from './scalar.whiteboard.content';
import { SearchCursor } from './scalar.search.cursor';

@Module({
  imports: [],
  providers: [
    Emoji,
    NameID,
    UUID,
    Markdown,
    MessageID,
    LifecycleDefinitionScalar,
    WhiteboardContent,
    SearchCursor,
  ],
  exports: [],
})
export class ScalarsModule {}
