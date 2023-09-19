import { BaseAlkemioEntity } from '@domain/common/entity/base-entity';
import { Entity, Column } from 'typeorm';

@Entity()
export class ChatGuidanceLog extends BaseAlkemioEntity {
  @Column()
  question!: string;

  @Column()
  createdBy!: string;

  @Column()
  answer!: string;

  @Column()
  sources?: string;

  @Column()
  promptTokens!: number;

  @Column()
  completionTokens!: number;

  @Column()
  totalTokens!: number;

  @Column({ type: 'decimal', precision: 20, scale: 1 })
  totalCost!: number;
}
