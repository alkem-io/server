import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const opportunityCommunityApplicationForm: CreateFormInput = {
  description: '',
  questions: [
    {
      question: 'Why do you want to join?',
      explanation: 'Please tell us your rational for joining.',
      sortOrder: 1,
      maxLength: 500,
      required: true,
    },
  ],
};
