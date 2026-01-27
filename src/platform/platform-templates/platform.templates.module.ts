import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { Module } from '@nestjs/common';
import { PlatformModule } from '@platform/platform/platform.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { PlatformTemplatesService } from './platform.templates.service';

@Module({
  imports: [
    InputCreatorModule,
    TemplateModule,
    PlatformModule,
    TemplatesManagerModule,
  ],
  providers: [PlatformTemplatesService],
  exports: [PlatformTemplatesService],
})
export class PlatformTemplatesModule {}
