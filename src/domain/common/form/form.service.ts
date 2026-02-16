import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { eq } from 'drizzle-orm';
import { forms } from './form.schema';
import { CreateFormInput } from './dto/form.dto.create';
import { UpdateFormInput } from './dto/form.dto.update';
import { IFormQuestion } from './form.dto.question.interface';
import { Form } from './form.entity';
import { IForm } from './form.interface';

@Injectable()
export class FormService {
  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createForm(createFormData: CreateFormInput): IForm {
    const form: IForm = new Form();
    form.description = createFormData.description;
    form.questions = this.serializeQuestions(createFormData.questions);

    return form;
  }

  public async removeForm(form: IForm): Promise<boolean> {
    await this.db.delete(forms).where(eq(forms.id, form.id));
    return true;
  }

  private async save(form: IForm): Promise<IForm> {
    const [updated] = await this.db
      .update(forms)
      .set({
        description: form.description,
        questions: form.questions,
      })
      .where(eq(forms.id, form.id))
      .returning();
    return updated as unknown as IForm;
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
