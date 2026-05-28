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

  /**
   * Sniffed MIME of the actual file backing this CollaboraDocument.
   * Set at create-time from the OOXML default for blank-create flow,
   * or from file-service-go's content-sniff result for import flow.
   * Drives the rename helper's extension preservation — `documentType`
   * alone is too coarse for imports (e.g., a `.doc` and `.docx` are
   * both `WORDPROCESSING` but rename must keep them distinct).
   */
  @Column('varchar', {
    length: ENUM_LENGTH,
    nullable: false,
  })
  originalMimeType!: string;

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
