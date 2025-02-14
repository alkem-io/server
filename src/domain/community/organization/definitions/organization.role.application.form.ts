import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const organizationApplicationForm: CreateFormInput = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
  ],
};
