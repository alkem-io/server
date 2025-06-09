import { Module } from '@nestjs/common';
import { PlatformTemplatesService } from './platform.templates.service';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';

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
