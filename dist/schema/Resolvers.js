"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Resolvers = void 0;
const type_graphql_1 = require("type-graphql");
const models_1 = require("../models");
let Resolvers = class Resolvers {
    async allTags() {
        return await models_1.Tag.find();
    }
    async allUsers() {
        return await models_1.User.find();
    }
    async allChallenges() {
        return await models_1.Challenge.find();
    }
    async allEcoverse() {
        return await models_1.Ecoverse.find();
    }
};
__decorate([
    type_graphql_1.Query(() => [models_1.Tag]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Resolvers.prototype, "allTags", null);
__decorate([
    type_graphql_1.Query(() => [models_1.User]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Resolvers.prototype, "allUsers", null);
__decorate([
    type_graphql_1.Query(() => [models_1.Challenge]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Resolvers.prototype, "allChallenges", null);
__decorate([
    type_graphql_1.Query(() => [models_1.Ecoverse]),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Resolvers.prototype, "allEcoverse", null);
Resolvers = __decorate([
    type_graphql_1.Resolver()
], Resolvers);
exports.Resolvers = Resolvers;
//# sourceMappingURL=Resolvers.js.map