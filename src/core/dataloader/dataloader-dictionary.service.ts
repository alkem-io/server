// import DataLoader from 'dataloader';
// import { UserDataloaderService } from '@domain/community/user/user.dataloader.service';
// import { OrganizationDataloaderService } from '@domain/community/organization/organization.dataloader.service';
// import { ProfileDataloaderService } from '@domain/community/profile/profile.dataloader.service';
// import { CollaborationDataloaderService } from '@domain/collaboration/collaboration/collaboration.dataloader.service';
// import { Injectable, Scope } from '@nestjs/common';
// import { IDataloaders } from '@core/dataloader/dataloader.interface';
// import { ProfileLoadersMaker } from './loader-makers';
//
// @Injectable()
// export class DataloaderDictionary {
//   private readonly loaders: Partial<IDataloaders>;
//   private readonly options: DataLoader.Options<any, any>;
//
//   constructor(
//     private readonly userDataloaderService: UserDataloaderService,
//     private readonly orgDataloaderService: OrganizationDataloaderService,
//     private readonly profileDataloaderService: ProfileDataloaderService,
//     private readonly collaborationDataloaderService: CollaborationDataloaderService,
//     private readonly profileLoadersMaker: ProfileLoadersMaker
//   ) {}
//
//   public createDict() {
//     return new DataloaderDict();
//   }
// }
// // todo: try PublicPart
// type LoaderNames = keyof IDataloaders;
//
// type LoaderMakerFactory = (
//   options?: DataLoader.Options<any, any>
// ) => DataLoader<string, unknown>;
//
// const loaderMakers: Record<LoaderNames, LoaderMakerFactory> = {
//   referencesLoader: options =>
// };
//
//
// class DataloaderDict {
//   private readonly loaders: Partial<IDataloaders>;
//   private readonly options: DataLoader.Options<any, any>;
//
//   constructor(dataLoaderOptions: DataLoader.Options<any, any> = {}) {
//     this.loaders = {};
//     this.options = dataLoaderOptions;
//   }
//
//   get<LoaderName extends LoaderNames>(loaderName: LoaderName) {
//     const loader = this.loaders[loaderName];
//     if (loader) {
//       return loader;
//     }
//
//     if (!this.loaders[loaderName]) {
//       this.loaders[loaderName] = createLoader(loaderName);
//     }
//     return this.loaders[loaderName] as Loaders<T>;
//   }
// }
