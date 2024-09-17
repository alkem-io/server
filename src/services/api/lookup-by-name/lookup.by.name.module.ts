import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LookupByNameService } from './lookup.by.name.service';
import { LookupByNameResolverQueries } from './lookup.by.name.resolver.queries';
import { LookupByNameResolverFields } from './lookup.by.name.resolver.fields';
import { InnovationPackModule } from '@library/innovation-pack/innovation.pack.module';
import { TemplateModule } from '@domain/template/template/template.module';

@Module({
  imports: [AuthorizationModule, InnovationPackModule, TemplateModule],
  providers: [
    LookupByNameService,
    LookupByNameResolverQueries,
    LookupByNameResolverFields,
  ],
  exports: [LookupByNameService],
})
export class LookupByNameModule {}
