import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const hubCommunityApplicationForm: CreateFormInput = {
  description: '',
  questions: [
    {
      question: 'What makes you want to join?',
      required: true,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
    {
      question: 'Any particular role or contribution that you have in mind?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 2,
    },
    {
      question:
        'Through which user,organization or medium have you become acquainted with this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 3,
    },
    {
      question: 'Anything fun you want to tell us about yourself?!',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 4,
    },
    {
      question:
        'Do you already want to join a Challenge? If so, please provide the name(s).',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 5,
    },
  ],
};
