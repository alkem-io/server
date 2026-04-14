import { ENUM_LENGTH } from '@common/constants';
import { CollaboraDocumentType } from '@common/enums/collabora.document.type';
import { AuthorizableEntity } from '@domain/common/entity/authorizable-entity/authorizable.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { Document } from '@domain/storage/document/document.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { ICollaboraDocument } from './collabora.document.interface';

@Entity()
export class CollaboraDocument
  extends AuthorizableEntity
  implements ICollaboraDocument
{
  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  documentType!: CollaboraDocumentType;

  @Column('uuid', { nullable: true })
  createdBy?: string;

  @OneToOne(() => Profile, {
    eager: false,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  profile?: Profile;

  @ManyToOne(() => Document, {
    eager: false,
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  document?: Document;
}
