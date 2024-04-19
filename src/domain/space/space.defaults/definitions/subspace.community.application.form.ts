import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const subspceCommunityApplicationForm: CreateFormInput = {
  description: '<strong>Welcome!</strong>\ Thank you for expressing interest in joining our community. We would like to learn more about you and how you can contribute. Please take a moment to complete the following application form.',

  questions: [
    {
      question: 'What brings you here?',
      required: false,
      maxLength: 500,
      sortOrder: 1,
    },
    {
      question: 'What do you hope to gain from being part of this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 2,
    },
    {
      question: 'How can you contribute to this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 3,
    },
    {
      question: 'How did you discover this community?',
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 4,
    },
  ],
};
