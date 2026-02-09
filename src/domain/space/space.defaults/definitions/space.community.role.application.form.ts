import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const spaceCommunityApplicationForm: CreateFormInput = {
  description: 'Welcome, thank you for your interest!',
  questions: [
    {
      question:
        "If you have a specific idea for how you'd like to contribute, please share it below.",
      required: false,
      maxLength: 500,
      explanation: '',
      sortOrder: 1,
    },
  ],
};
