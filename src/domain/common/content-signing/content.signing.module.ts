import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SigningAttempt } from './signing.attempt.entity';
import { SigningAttemptService } from './signing.attempt.service';

@Module({
  imports: [TypeOrmModule.forFeature([SigningAttempt])],
  providers: [SigningAttemptService],
  exports: [SigningAttemptService],
})
export class ContentSigningModule {}
