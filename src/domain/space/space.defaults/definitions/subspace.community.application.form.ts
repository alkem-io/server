import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const subspceCommunityApplicationForm: CreateFormInput = {
  description: '<strong>Welcome!</strong><br> Thank you for expressing interest in joining our community. We would like to learn more about you and how you can contribute. Please take a moment to complete the following application form.',

  questions: [
    {
      question: 'What brings you here?',
      required: false,
      maxLength: 500,
      explanation: 'Please introduce yourself and share what motivated you to explore membership in our community.',
      sortOrder: 1,
    },
    {
      question: 'What do you hope to gain from being part of this community?',
      required: false,
      maxLength: 500,
      explanation: 'Let us know your expectations and what you are looking forward to experiencing within our community.',
      sortOrder: 2,
    },
    {
      question: 'How can you contribute to this community?',
      required: false,
      maxLength: 500,
      explanation: 'We value diverse perspectives and skills. Tell us how you can enrich our community.',
      sortOrder: 3,
    },
    {
      question: 'How did you discover this community?',
      required: false,
      maxLength: 500,
      explanation: 'We are curious! Was it through a friend, social media, or some other avenue?',
      sortOrder: 4,
    },
  ],
};
