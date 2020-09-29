import { Field, ID, ObjectType } from 'type-graphql';
import { BaseEntity, Column, Entity, JoinColumn, JoinTable, ManyToMany, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Challenge, Context, DID, Organisation, Tag, User, UserGroup, RestrictedGroupNames } from '.';
import { IEcoverse } from 'src/interfaces/IEcoverse';
import { IGroupable } from '../interfaces';


@Entity()
@ObjectType()
export class Ecoverse extends BaseEntity implements IEcoverse, IGroupable {

  @Field(() => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  // The context and host organisation
  @Field(() => String, { nullable: false, description: '' })
  @Column('varchar', { length: 100 })
  name: string;

  @Field(() => Organisation, { nullable: true, description: 'The organisation that hosts this Ecoverse instance' })
  @OneToOne(() => Organisation, { eager: true, cascade: true })
  @JoinColumn()
  host: Organisation;

  @Field(() => Context, { nullable: true, description: 'The shared understanding for the Ecoverse' })
  @OneToOne(() => Context, { eager: true, cascade: true })
  @JoinColumn()
  context: Context;

  // The digital identity for the Ecoverse - critical for its trusted role
  @OneToOne(() => DID, { eager: true, cascade: true })
  @JoinColumn()
  DID!: DID;

  @Field(() => [UserGroup], { nullable: true })
  @OneToMany(
    () => UserGroup,
    userGroup => userGroup.ecoverse,
    { eager: true, cascade: true },
  )
  groups?: UserGroup[];

  @Field(() => [Organisation], { nullable: true, description: 'The set of partner organisations associated with this Ecoverse' })
  @ManyToMany(
    () => Organisation,
    organisation => organisation.ecoverses,
    { eager: true, cascade: true },
  )
  @JoinTable({
    name: 'ecoverse_partner',
    joinColumns: [{ name: 'ecoverseId', referencedColumnName: 'id' }],
    inverseJoinColumns: [{ name: 'organisationId', referencedColumnName: 'id' }],
  })
  partners?: Organisation[];

  //
  @Field(() => [Challenge], { nullable: true, description: 'The Challenges hosted by the Ecoverse' })
  @OneToMany(
    () => Challenge,
    challenge => challenge.ecoverse,
    { eager: true, cascade: true },
  )
  challenges?: Challenge[];

  @Field(() => [Tag], { nullable: true, description: 'Set of restricted tags that are used within this ecoverse' })
  @ManyToMany(
    () => Tag,
    tag => tag.ecoverses,
    { eager: true, cascade: true })
  @JoinTable({ name: 'ecoverse_tag' })
  tags?: Tag[];

  // The restricted group names at the ecoverse level
  restrictedGroupNames?: string[];

  // Create the ecoverse with enough defaults set/ members populated
  constructor() {
    super();
    this.name = '';
    this.context = new Context();
    this.host = new Organisation('Default host');
  }

  // Functional methods for managing the Ecoverse
  private static instance: Ecoverse;

  static async getInstance(): Promise<Ecoverse> {
    if (Ecoverse.instance) {
      return Ecoverse.instance;
    }

    // Instance has not been set, fix that by creating a new ecoverse if needed
    const ecoverseCount = await Ecoverse.count();
    if (ecoverseCount != 1) {
      throw new Error('Must always be exactly one ecoverse');
    }
    const ecoverse = await Ecoverse.find();
    Ecoverse.instance = ecoverse[0];

    return Ecoverse.instance;
  }

  // Populate an empty ecoverse
  static async populateEmptyEcoverse(ecoverse: Ecoverse): Promise<Ecoverse> {
    // Create new Ecoverse
    ecoverse.initialiseMembers();
    ecoverse.name = 'Empty ecoverse';
    ecoverse.context.tagline = 'An empty ecoverse to be populated';
    ecoverse.host.name = 'Default host organisation'

    // Find the admin user and put that person in as member + admin
    const adminUser = new User('admin');
    const admins = UserGroup.getGroupByName(ecoverse, RestrictedGroupNames.Admins);
    const members = UserGroup.getGroupByName(ecoverse, RestrictedGroupNames.Members);
    admins.addUserToGroup(adminUser);
    members.addUserToGroup(adminUser);

    return ecoverse;
  }


  // Helper method to ensure all members that are arrays are initialised properly.
  // Note: has to be a seprate call due to restrictions from ORM.
  initialiseMembers(): Ecoverse {
    if (!this.restrictedGroupNames) {
      this.restrictedGroupNames = [RestrictedGroupNames.Members, RestrictedGroupNames.Admins];
    }

    if (!this.groups) {
      this.groups = [];
    }

    // Check that the mandatory groups for a challenge are created
    UserGroup.addMandatoryGroups(this, this.restrictedGroupNames);

    if (!this.tags) {
      this.tags = [];
    }

    if (!this.challenges) {
      this.challenges = [];
    }

    if (!this.partners) {
      this.partners = [];
    }

    return this;
  }
}