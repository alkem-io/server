import { Module } from '@nestjs/common';
import { FormResolverFields } from './form.resolver.fields';
import { FormService } from './form.service';

@Module({
  imports: [],
  providers: [FormService, FormResolverFields],
  exports: [FormService],
})
export class FormModule {}
