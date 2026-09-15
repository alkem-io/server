import { Module } from '@nestjs/common';
import { Emoji } from './scalar.emoji';
import { LifecycleDefinitionScalar } from './scalar.lifecycle.definition';
import { Markdown } from './scalar.markdown';
import { MessageID } from './scalar.messageid';
import { NameID } from './scalar.nameid';
import { SearchCursor } from './scalar.search.cursor';
import { UUID } from './scalar.uuid';

@Module({
  imports: [],
  providers: [
    Emoji,
    NameID,
    UUID,
    Markdown,
    MessageID,
    LifecycleDefinitionScalar,
    SearchCursor,
  ],
  exports: [],
})
export class ScalarsModule {}
