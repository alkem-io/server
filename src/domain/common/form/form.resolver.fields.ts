import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { IForm } from './form.interface';
import { FormService } from './form.service';
import { IFormQuestion } from './form.dto.question.interface';

@Resolver(() => IForm)
export class FormResolverFields {
  constructor(private formService: FormService) {}

  @ResolveField('questions', () => [IFormQuestion], {
    nullable: false,
    description: 'The set of Questions in this Form.',
  })
  questions(@Parent() form: IForm): IFormQuestion[] {
    return this.formService.getQuestions(form);
  }
}
