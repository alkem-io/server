import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { WhiteboardModule } from '@domain/common/whiteboard/whiteboard.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhiteboardDraftResolver } from './whiteboard.draft.resolver';
import { WhiteboardDraftService } from './whiteboard.draft.service';
import { WhiteboardDraftSweepService } from './whiteboard.draft.sweep.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Whiteboard]),
    WhiteboardModule,
    AuthorizationPolicyModule,
  ],
  providers: [
    WhiteboardDraftService,
    WhiteboardDraftResolver,
    WhiteboardDraftSweepService,
  ],
  exports: [WhiteboardDraftService],
})
export class WhiteboardDraftModule {}
