import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PostTemplate } from './post.template.entity';
import { IPostTemplate } from './post.template.interface';
import { TemplateBaseService } from '../template-base/template.base.service';
import { CreatePostTemplateInput } from './dto/post.template.dto.create';
import { UpdatePostTemplateInput } from './dto/post.template.dto.update';

@Injectable()
export class PostTemplateService {
  constructor(
    @InjectRepository(PostTemplate)
    private postTemplateRepository: Repository<PostTemplate>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private templateBaseService: TemplateBaseService
  ) {}

  async createPostTemplate(
    postTemplateData: CreatePostTemplateInput
  ): Promise<IPostTemplate> {
    const postTemplate: IPostTemplate = PostTemplate.create(postTemplateData);
    await this.templateBaseService.initialise(postTemplate, postTemplateData);

    return await this.postTemplateRepository.save(postTemplate);
  }

  async getPostTemplateOrFail(
    postTemplateID: string,
    options?: FindOneOptions<PostTemplate>
  ): Promise<IPostTemplate | never> {
    const postTemplate = await this.postTemplateRepository.findOne({
      ...options,
      where: {
        ...options?.where,
        id: postTemplateID,
      },
    });
    if (!postTemplate)
      throw new EntityNotFoundException(
        `Not able to locate PostTemplate with the specified ID: ${postTemplateID}`,
        LogContext.COMMUNICATION
      );
    return postTemplate;
  }

  async updatePostTemplate(
    postTemplateInput: IPostTemplate,
    postTemplateData: UpdatePostTemplateInput
  ): Promise<IPostTemplate> {
    const postTemplate = await this.getPostTemplateOrFail(
      postTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    await this.templateBaseService.updateTemplateBase(
      postTemplate,
      postTemplateData
    );
    if (postTemplateData.defaultDescription) {
      postTemplate.defaultDescription = postTemplateData.defaultDescription;
    }
    if (postTemplateData.type) {
      postTemplate.type = postTemplateData.type;
    }

    return await this.postTemplateRepository.save(postTemplate);
  }

  async deletePostTemplate(
    postTemplateInput: IPostTemplate
  ): Promise<IPostTemplate> {
    const postTemplate = await this.getPostTemplateOrFail(
      postTemplateInput.id,
      {
        relations: ['profile'],
      }
    );
    const templateId: string = postTemplate.id;
    await this.templateBaseService.deleteEntities(postTemplate);
    const result = await this.postTemplateRepository.remove(
      postTemplate as PostTemplate
    );
    result.id = templateId;
    return result;
  }

  async save(postTemplate: IPostTemplate): Promise<IPostTemplate> {
    return await this.postTemplateRepository.save(postTemplate);
  }
}
