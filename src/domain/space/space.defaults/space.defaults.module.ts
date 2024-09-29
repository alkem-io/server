import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TemplateModule } from '@domain/template/template/template.module';

@Module({
  imports: [TemplateModule],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
