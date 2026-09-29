import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const organizationApplicationForm: CreateFormInput = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join?',
      // Optional (062): the applicant sees this as a short optional
      // message field, not a mandatory gate.
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
  ],
};
