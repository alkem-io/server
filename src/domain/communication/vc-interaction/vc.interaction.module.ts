import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VcInteractionService } from './vc.interaction.service';
import { VcInteraction } from './vc.interaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VcInteraction])],
  providers: [VcInteractionService],
  exports: [VcInteractionService],
})
export class VcInteractionModule {}
