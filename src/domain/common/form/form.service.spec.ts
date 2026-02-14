import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { repositoryProviderMockFactory } from '@test/utils/repository.provider.mock.factory';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MockType } from '@test/utils/mock.type';
import { Repository } from 'typeorm';
import { Form } from './form.entity';
import { FormService } from './form.service';
import { IFormQuestion } from './form.dto.question.interface';

describe('FormService', () => {
  let service: FormService;
  let formRepository: MockType<Repository<Form>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        repositoryProviderMockFactory(Form),
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(FormService);
    formRepository = module.get(getRepositoryToken(Form));
  });

  describe('createForm', () => {
    it('should create a form with description and serialized questions', () => {
      const questions: IFormQuestion[] = [
        {
          question: 'What is your goal?',
          explanation: 'Explain your main goal.',
          sortOrder: 1,
          maxLength: 256,
          required: true,
        },
      ];

      const result = service.createForm({
        description: 'Test form',
        questions,
      });

      expect(result.description).toBe('Test form');
      expect(JSON.parse(result.questions)).toEqual(questions);
    });

    it('should serialize an empty questions array to valid JSON', () => {
      const result = service.createForm({
        description: 'Empty form',
        questions: [],
      });

      expect(JSON.parse(result.questions)).toEqual([]);
    });
  });

  describe('getQuestions', () => {
    it('should return questions sorted by sortOrder ascending', () => {
      const questions: IFormQuestion[] = [
        {
          question: 'Second',
          explanation: '',
          sortOrder: 2,
          maxLength: 100,
          required: false,
        },
        {
          question: 'First',
          explanation: '',
          sortOrder: 1,
          maxLength: 100,
          required: true,
        },
        {
          question: 'Third',
          explanation: '',
          sortOrder: 3,
          maxLength: 100,
          required: false,
        },
      ];

      const form = { questions: JSON.stringify(questions) } as Form;

      const result = service.getQuestions(form);

      expect(result[0].question).toBe('First');
      expect(result[1].question).toBe('Second');
      expect(result[2].question).toBe('Third');
    });

    it('should return empty array for form with no questions', () => {
      const form = { questions: '[]' } as Form;

      const result = service.getQuestions(form);

      expect(result).toEqual([]);
    });
  });

  describe('updateForm', () => {
    it('should update description when provided', async () => {
      const form = {
        description: 'Old description',
        questions: '[]',
      } as Form;
      formRepository.save!.mockResolvedValue(form);

      const result = await service.updateForm(form, {
        description: 'New description',
      });

      expect(result.description).toBe('New description');
    });

    it('should update description to empty string when empty string provided', async () => {
      const form = {
        description: 'Old description',
        questions: '[]',
      } as Form;
      formRepository.save!.mockResolvedValue(form);

      const result = await service.updateForm(form, { description: '' });

      expect(result.description).toBe('');
    });

    it('should not update description when undefined', async () => {
      const form = {
        description: 'Keep this',
        questions: '[]',
      } as Form;
      formRepository.save!.mockResolvedValue(form);

      await service.updateForm(form, {});

      expect(form.description).toBe('Keep this');
    });

    it('should update questions when provided', async () => {
      const form = { description: 'desc', questions: '[]' } as Form;
      const newQuestions: IFormQuestion[] = [
        {
          question: 'New Q',
          explanation: 'Explain',
          sortOrder: 1,
          maxLength: 512,
          required: true,
        },
      ];
      formRepository.save!.mockResolvedValue(form);

      await service.updateForm(form, { questions: newQuestions });

      expect(JSON.parse(form.questions)).toEqual(newQuestions);
    });
  });

  describe('removeForm', () => {
    it('should remove the form and return true', async () => {
      const form = { id: 'form-1' } as Form;
      formRepository.remove!.mockResolvedValue(form);

      const result = await service.removeForm(form);

      expect(result).toBe(true);
      expect(formRepository.remove).toHaveBeenCalledWith(form);
    });
  });
});
