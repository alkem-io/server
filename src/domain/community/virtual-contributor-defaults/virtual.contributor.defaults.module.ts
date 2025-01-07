import { Module } from '@nestjs/common';
import { VirtualContributorDefaultsService } from './virtual.contributor.defaults.service';
import { TemplateModule } from '@domain/template/template/template.module';
import { InputCreatorModule } from '@services/api/input-creator/input.creator.module';
import { PlatformModule } from '@platform/platform/platform.module';
import { TemplatesManagerModule } from '@domain/template/templates-manager/templates.manager.module';
import { CalloutsSetModule } from '@domain/collaboration/callouts-set/callouts.set.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';

@Module({
  imports: [
    TemplateModule,
    TemplatesManagerModule,
    InputCreatorModule,
    CalloutsSetModule,
    PlatformModule,
    NamingModule,
  ],
  providers: [VirtualContributorDefaultsService],
  exports: [VirtualContributorDefaultsService],
})
export class VirtualContributorDefaultsModule {}
