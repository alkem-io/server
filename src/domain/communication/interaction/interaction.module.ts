import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InteractionService } from './interaction.service';
import { Interaction } from './interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Interaction])],
  providers: [InteractionService],
  exports: [InteractionService],
})
export class InteractionModule {}
