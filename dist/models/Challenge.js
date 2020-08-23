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
exports.Challenge = void 0;
const type_graphql_1 = require("type-graphql");
const typeorm_1 = require("typeorm");
const Tag_1 = require("./Tag");
let Challenge = class Challenge extends typeorm_1.BaseEntity {
    constructor(name) {
        super();
        this.id = null;
        this.name = '';
        this.name = name;
    }
};
__decorate([
    type_graphql_1.Field(() => type_graphql_1.ID),
    typeorm_1.PrimaryGeneratedColumn(),
    __metadata("design:type", Object)
], Challenge.prototype, "id", void 0);
__decorate([
    type_graphql_1.Field(() => String),
    typeorm_1.Column(),
    __metadata("design:type", String)
], Challenge.prototype, "name", void 0);
__decorate([
    type_graphql_1.Field(() => Tag_1.Tag),
    typeorm_1.ManyToOne(tag => Tag_1.Tag, tags => tags, { eager: true }),
    __metadata("design:type", Tag_1.Tag)
], Challenge.prototype, "tag", void 0);
Challenge = __decorate([
    typeorm_1.Entity(),
    type_graphql_1.ObjectType(),
    __metadata("design:paramtypes", [String])
], Challenge);
exports.Challenge = Challenge;
//# sourceMappingURL=Challenge.js.map