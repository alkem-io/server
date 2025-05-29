import { Module } from '@nestjs/common';
import { PlatformTemplatesService } from './platform.templates.service';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesManager } from '@domain/template/templates-manager';
import { PlatformModule } from '@platform/platform/platform.module';

@Module({
  imports: [
    InputCreatorModule,
    TemplateModule,
    PlatformModule,
    TemplatesManager,
  ],
  providers: [PlatformTemplatesService],
  exports: [PlatformTemplatesService],
})
export class PlatformTemplatesModule {}
