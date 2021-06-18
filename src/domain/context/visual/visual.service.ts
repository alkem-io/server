import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  Visual,
  CreateVisualInput,
  IVisual,
  UpdateVisualInput,
  DeleteVisualInput,
} from '@domain/context/visual';

@Injectable()
export class VisualService {
  constructor(
    @InjectRepository(Visual)
    private visualRepository: Repository<Visual>
  ) {}

  async createVisual(visualData: CreateVisualInput): Promise<IVisual> {
    const visual = Visual.create(visualData);
    return await this.visualRepository.save(visual);
  }

  updateVisualValues(visual: IVisual, visualData: UpdateVisualInput) {
    // Copy over the received data if a uri is supplied
    if (visualData.avatar) {
      visual.avatar = visualData.avatar;
    }

    if (visualData.background) {
      visual.background = visualData.background;
    }

    if (visualData.banner) {
      visual.banner = visualData.banner;
    }

    return visual;
  }

  async getVisualOrFail(visualID: string): Promise<IVisual> {
    const visual = await this.visualRepository.findOne({
      id: visualID,
    });
    if (!visual)
      throw new EntityNotFoundException(
        `Not able to locate Visual with the specified ID: ${visualID}`,
        LogContext.CHALLENGES
      );
    return visual;
  }

  async deleteVisual(deleteData: DeleteVisualInput): Promise<IVisual> {
    const visualID = deleteData.ID;
    const visual = await this.getVisualOrFail(visualID);
    const { id } = visual;
    const result = await this.visualRepository.remove(visual as Visual);
    return {
      ...result,
      id,
    };
  }

  async saveVisual(Visual: IVisual): Promise<IVisual> {
    return await this.visualRepository.save(Visual);
  }
}
