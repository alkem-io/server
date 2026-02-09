import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { TemplateModule } from '@domain/template/template/template.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { Module } from '@nestjs/common';
import { PlatformTemplatesModule } from '@platform/platform-templates/platform.templates.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { SpaceDefaultsService } from './space.defaults.service';

@Module({
  imports: [
    TemplateModule,
    TemplatesManagerModule,
    InputCreatorModule,
    CalloutsSetModule,
    PlatformTemplatesModule,
  ],
  providers: [SpaceDefaultsService],
  exports: [SpaceDefaultsService],
})
export class SpaceDefaultsModule {}
