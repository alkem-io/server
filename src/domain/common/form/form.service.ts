import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';
import { CreateFormInput } from './dto/form.dto.create';
import { UpdateFormInput } from './dto/form.dto.update';
import { IFormQuestion } from './form.dto.question.interface';
import { Form } from './form.entity';
import { IForm } from './form.interface';

@Injectable()
export class FormService {
  constructor(
    @InjectRepository(Form)
    private formRepository: Repository<Form>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createForm(createFormData: CreateFormInput): Promise<IForm> {
    const form: IForm = new Form();
    form.description = createFormData.description;
    form.questions = this.serializeQuestions(createFormData.questions);

    return this.save(form);
  }

  public async removeForm(form: IForm): Promise<boolean> {
    await this.formRepository.remove(form as Form);
    return true;
  }

  private save(form: IForm): Promise<IForm> {
    return this.formRepository.save(form);
  }

  public getQuestions(form: IForm): IFormQuestion[] {
    const questions: IFormQuestion[] = this.deserializeQuestions(
      form.questions
    );
    return questions.sort((a, b) => (a.sortOrder > b.sortOrder ? 1 : -1));
  }

  public async updateForm(
    form: IForm,
    formData: UpdateFormInput
  ): Promise<IForm> {
    if (formData.description || formData.description === '') {
      form.description = formData.description;
    }
    if (formData.questions) {
      form.questions = this.serializeQuestions(formData.questions);
    }

    return await this.save(form);
  }

  private deserializeQuestions(questionsStr: string): IFormQuestion[] {
    return JSON.parse(questionsStr);
  }

  private serializeQuestions(questions: IFormQuestion[]): string {
    return JSON.stringify(questions);
  }
}
