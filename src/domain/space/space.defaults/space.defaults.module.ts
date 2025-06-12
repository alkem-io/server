import { Module } from '@nestjs/common';
import { SpaceDefaultsService } from './space.defaults.service';
import { TemplateModule } from '@domain/template/template/template.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { PlatformTemplatesModule } from '@platform/platform-templates/platform.templates.module';

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
