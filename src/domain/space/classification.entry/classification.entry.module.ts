import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Template } from '@domain/template/template/template.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationEntry } from './classification.entry.entity';
import { ClassificationEntryResolverFields } from './classification.entry.resolver.fields';
import { ClassificationEntryResolverMutations } from './classification.entry.resolver.mutations';
import { ClassificationEntryService } from './classification.entry.service';

// Deliberately does NOT import TemplateModule — that would close a module
// cycle (SpaceAboutModule -> ClassificationEntryModule -> TemplateModule ->
// TemplateContentSpaceModule -> SpaceAboutModule). ClassificationEntryService
// reads Template rows directly via a narrow TypeOrmModule.forFeature
// registration instead (see the constructor comment there).
@Module({
  imports: [
    AuthorizationModule,
    SpaceLookupModule,
    TypeOrmModule.forFeature([ClassificationEntry, Template]),
  ],
  providers: [
    ClassificationEntryService,
    ClassificationEntryResolverMutations,
    ClassificationEntryResolverFields,
  ],
  exports: [ClassificationEntryService],
})
export class ClassificationEntryModule {}
