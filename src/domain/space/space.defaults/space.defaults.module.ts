import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TemplateModule } from '@domain/template/template/template.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { PlatformModule } from '@platform/platfrom/platform.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';

@Module({
  imports: [
    TemplateModule,
    TemplatesManagerModule,
    InputCreatorModule,
    PlatformModule,
  ],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
