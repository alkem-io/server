import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ITagset } from '@domain/common/tagset/tagset.interface';
import { TagsetService } from '@domain/common/tagset/tagset.service';
import { Classification } from '@domain/common/classification/classification.entity';
import { IClassification } from '@domain/common/classification/classification.interface';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CreateTagsetInput } from '../tagset';
import { ITagsetTemplate } from '@domain/common/tagset-template';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { UpdateClassificationSelectTagsetValueInput } from './dto/classification.dto.update.select.tagset.value';
import { LogContext } from '@common/enums/logging.context';
import { UpdateClassificationInput } from './dto/classification.dto.update';
import { CreateClassificationInput } from './dto/classification.dto.create';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';

@Injectable()
export class ClassificationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private tagsetService: TagsetService,
    @InjectRepository(Classification)
    private classificationRepository: Repository<Classification>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public createClassification(
    tagsetTemplates: ITagsetTemplate[],
    classificationData?: CreateClassificationInput
  ): IClassification {
    const classification: IClassification = Classification.create();
    classification.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.CLASSIFICATION
    );
    classification.tagsets = [];

    let tagsetsData =
      this.tagsetService.convertTagsetTemplatesToCreateTagsetInput(
        tagsetTemplates
      );
    if (classificationData) {
      const classificationTagsets = classificationData.tagsets.map(tagset => ({
        ...tagset,
        name: Object.keys(TagsetReservedName).includes(tagset.name)
          ? TagsetReservedName[tagset.name as keyof typeof TagsetReservedName]
          : tagset.name,
      }));

      // Ensure any supplied values in tags are used
      tagsetsData = this.tagsetService.updatedTagsetInputUsingProvidedData(
        tagsetsData,
        classificationTagsets
      );
    }
    classification.tagsets = tagsetsData.map(tagsetData =>
      this.tagsetService.createTagsetWithName([], tagsetData)
    );

    return classification;
  }

  async deleteClassification(
    classificationID: string
  ): Promise<IClassification> {
    // Note need to load it in with all contained entities so can remove fully
    const classification = await this.getClassificationOrFail(
      classificationID,
      {
        relations: {
          tagsets: true,
          authorization: true,
        },
      }
    );

    if (!classification.tagsets || !classification.authorization) {
      throw new EntityNotInitializedException(
        `Classification not initialized: ${classification.id}`,
        LogContext.CLASSIFICATION
      );
    }

    for (const tagset of classification.tagsets) {
      await this.tagsetService.removeTagset(tagset.id);
    }

    await this.authorizationPolicyService.delete(classification.authorization);

    return await this.classificationRepository.remove(
      classification as Classification
    );
  }

  public async save(classification: IClassification): Promise<IClassification> {
    return await this.classificationRepository.save(classification);
  }

  public async addTagsetOnClassification(
    classification: IClassification,
    tagsetData: CreateTagsetInput
  ): Promise<ITagset> {
    if (!classification.tagsets) {
      classification.tagsets = await this.getTagsets(classification.id);
    }

    const tagset = this.tagsetService.createTagsetWithName(
      classification.tagsets,
      tagsetData
    );
    tagset.classification = classification;
    return await this.tagsetService.save(tagset);
  }

  async getClassificationOrFail(
    classificationID: string,
    options?: FindOneOptions<Classification>
  ): Promise<IClassification | never> {
    const classification = await Classification.findOne({
      ...options,
      where: { ...options?.where, id: classificationID },
    });
    if (!classification)
      throw new EntityNotFoundException(
        `Classification with id(${classificationID}) not found!`,
        LogContext.CLASSIFICATION
      );
    return classification;
  }

  async getTagsets(classificationID: string): Promise<ITagset[]> {
    const classification = await this.getClassificationOrFail(
      classificationID,
      {
        relations: { tagsets: true },
      }
    );
    if (!classification.tagsets) {
      throw new EntityNotInitializedException(
        `Classification not initialized: ${classification.id}`,
        LogContext.CLASSIFICATION
      );
    }
    return classification.tagsets;
  }

  private async getTagset(
    classificationID: string,
    tagsetName: string
  ): Promise<ITagset> {
    const tagsets = await this.getTagsets(classificationID);
    return this.tagsetService.getTagsetByNameOrFail(tagsets, tagsetName);
  }

  public updateClassification(
    classification: IClassification,
    updateData: UpdateClassificationInput
  ): IClassification {
    if (updateData.tagsets) {
      const classificationTagsets = updateData.tagsets.map(tagset => ({
        ...tagset,
        name: Object.keys(TagsetReservedName).includes(tagset.name ?? '')
          ? TagsetReservedName[tagset.name as keyof typeof TagsetReservedName]
          : tagset.name,
      }));
      classification.tagsets = this.tagsetService.updateTagsets(
        classification.tagsets,
        classificationTagsets
      );
    }
    return classification;
  }

  async updateSelectTagsetValue(
    updateData: UpdateClassificationSelectTagsetValueInput
  ): Promise<ITagset> {
    const tagset = await this.getTagset(
      updateData.classificationID,
      updateData.tagsetName
    );
    return await this.tagsetService.updateTagset({
      ID: tagset.id,
      tags: [updateData.selectedValue],
    });
  }

  // Note: provided data has priority when it comes to tags
  public updateClassificationTagsetInputs(
    tagsetInputDtata: CreateTagsetInput[] | undefined,
    additionalTagsetInputs: CreateTagsetInput[]
  ): CreateTagsetInput[] {
    const result: CreateTagsetInput[] = [...additionalTagsetInputs];

    if (!tagsetInputDtata) return result;

    for (const tagsetInput of tagsetInputDtata) {
      const existingInput = result.find(t => t.name === tagsetInput.name);
      if (existingInput) {
        // Do not change type, name etc - only tags
        if (tagsetInput.tags) {
          existingInput.tags = tagsetInput.tags;
        }
      } else {
        result.push(tagsetInput);
      }
    }
    return result;
  }
}
