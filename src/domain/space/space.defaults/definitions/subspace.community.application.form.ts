import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';

export const subspceCommunityApplicationForm: CreateFormInput = {
  description: '',

  questions: [
    {
      question: 'Why do you want to join?',
      explanation: 'Please tell us your rational for joining.',
      required: true,
      maxLength: 500,
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
  ],
};
