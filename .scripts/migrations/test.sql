-- MySQL dump 10.13  Distrib 8.3.0, for Linux (x86_64)
--
-- Host: localhost    Database: alkemio
-- ------------------------------------------------------
-- Server version	8.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `libraryId` char(36) DEFAULT NULL,
  `defaultsId` char(36) DEFAULT NULL,
  `spaceId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_91a165c1091a6959cc19d52239` (`authorizationId`),
  UNIQUE KEY `REL_bea623a346d2e3f88dd0aeef57` (`libraryId`),
  UNIQUE KEY `REL_9542f2ad51464f961e5b5b5b58` (`defaultsId`),
  UNIQUE KEY `IDX_833582df0c439ab8c9adc5240d` (`agentId`),
  UNIQUE KEY `REL_833582df0c439ab8c9adc5240d` (`agentId`),
  KEY `FK_99998853c1ee793f61bda7eff79` (`storageAggregatorId`),
  CONSTRAINT `FK_833582df0c439ab8c9adc5240d1` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_91a165c1091a6959cc19d522399` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9542f2ad51464f961e5b5b5b582` FOREIGN KEY (`defaultsId`) REFERENCES `space_defaults` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_99998853c1ee793f61bda7eff79` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_bea623a346d2e3f88dd0aeef576` FOREIGN KEY (`libraryId`) REFERENCES `templates_set` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account`
--

LOCK TABLES `account` WRITE;
/*!40000 ALTER TABLE `account` DISABLE KEYS */;
INSERT INTO `account` VALUES ('7ae636b4-e6c3-4524-811e-dad704b59fb2','2024-07-29 06:56:03.032859','2024-07-29 06:56:03.032859',1,'e1dffe0a-1229-469b-a399-7c024a7fb802','3e9bc807-81d0-4447-8a79-e00c06abc133','5896e498-209a-4dbb-91a0-2f4f596274b0',NULL,'6ebfe7e7-52b5-4926-aab7-c53b2714f81d','d6d12d73-a3e2-432a-ade8-6a16601ea669');
/*!40000 ALTER TABLE `account` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `activity`
--

DROP TABLE IF EXISTS `activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `triggeredBy` char(36) DEFAULT NULL,
  `collaborationID` char(36) DEFAULT NULL,
  `resourceID` char(36) DEFAULT NULL,
  `description` varchar(255) NOT NULL,
  `type` varchar(128) NOT NULL,
  `parentID` char(36) DEFAULT NULL,
  `messageID` char(44) DEFAULT NULL,
  `visibility` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0f03c61020ea0dfa0198c60304` (`rowId`)
) ENGINE=InnoDB AUTO_INCREMENT=3113 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity`
--

LOCK TABLES `activity` WRITE;
/*!40000 ALTER TABLE `activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `actor`
--

DROP TABLE IF EXISTS `actor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actor` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `value` text,
  `impact` varchar(255) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `actorGroupId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a2afa3851ea733de932251b3a1` (`authorizationId`),
  KEY `FK_0f9d41ee193d631a5439bb4f404` (`actorGroupId`),
  CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actor`
--

LOCK TABLES `actor` WRITE;
/*!40000 ALTER TABLE `actor` DISABLE KEYS */;
/*!40000 ALTER TABLE `actor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `actor_group`
--

DROP TABLE IF EXISTS `actor_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actor_group` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `authorizationId` char(36) DEFAULT NULL,
  `ecosystemModelId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_bde98d59e8984e7d17034c3b93` (`authorizationId`),
  KEY `FK_cbb1d7afa052a184471723d3297` (`ecosystemModelId`),
  CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actor_group`
--

LOCK TABLES `actor_group` WRITE;
/*!40000 ALTER TABLE `actor_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `actor_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent`
--

DROP TABLE IF EXISTS `agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `parentDisplayID` text,
  `did` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_8ed9d1af584fa62f1ad3405b33` (`authorizationId`),
  CONSTRAINT `FK_8ed9d1af584fa62f1ad3405b33b` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent`
--

LOCK TABLES `agent` WRITE;
/*!40000 ALTER TABLE `agent` DISABLE KEYS */;
INSERT INTO `agent` VALUES ('59a49b11-e4a4-4998-9bcb-ceac65438dc8','2024-07-29 06:56:02.759761','2024-07-29 06:56:02.759761',1,'organization-eco1host','','','2c6fd8fa-5ca1-4450-8493-284504417c16'),('6ebfe7e7-52b5-4926-aab7-c53b2714f81d','2024-07-29 06:56:03.016551','2024-07-29 06:56:03.016551',1,'account-undefined','','','87214510-dc83-4cf1-8290-6e88de204baa'),('8499763d-fd3b-4751-b397-74e6031e8a2c','2024-07-29 07:40:02.588082','2024-07-29 07:40:02.588082',1,'admin@alkem.io','','','dcb74d33-df17-4a5a-88df-0b78920b1a95'),('ed9707f4-965e-4d1b-b6d1-41a20465ff4b','2024-07-29 07:40:04.084748','2024-07-29 07:40:04.084748',1,'notifications@alkem.io','','','dccb51e5-a2a2-4a1b-85c8-4a6297d8806c');
/*!40000 ALTER TABLE `agent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_persona`
--

DROP TABLE IF EXISTS `ai_persona`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_persona` (
  `id` char(36) NOT NULL,
  `aiPersonaServiceID` varchar(128) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `description` text,
  `authorizationId` char(36) DEFAULT NULL,
  `interactionModes` text,
  `dataAccessMode` varchar(64) DEFAULT NULL,
  `bodyOfKnowledge` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_293f0d3ef60cb0ca0006044ecf` (`authorizationId`),
  CONSTRAINT `FK_293f0d3ef60cb0ca0006044ecfd` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_persona`
--

LOCK TABLES `ai_persona` WRITE;
/*!40000 ALTER TABLE `ai_persona` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_persona` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_persona_service`
--

DROP TABLE IF EXISTS `ai_persona_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_persona_service` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `engine` varchar(128) NOT NULL,
  `dataAccessMode` varchar(64) NOT NULL DEFAULT 'space_profile',
  `prompt` text NOT NULL,
  `bodyOfKnowledgeType` varchar(64) DEFAULT NULL,
  `bodyOfKnowledgeID` varchar(255) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `aiServerId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_79206feb0038b1c5597668dc4b` (`authorizationId`),
  KEY `FK_b9f20da98058d7bd474152ed6ce` (`aiServerId`),
  CONSTRAINT `FK_79206feb0038b1c5597668dc4b5` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b9f20da98058d7bd474152ed6ce` FOREIGN KEY (`aiServerId`) REFERENCES `ai_server` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_persona_service`
--

LOCK TABLES `ai_persona_service` WRITE;
/*!40000 ALTER TABLE `ai_persona_service` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_persona_service` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ai_server`
--

DROP TABLE IF EXISTS `ai_server`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_server` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_9d520fa5fed56042918e48fc4b` (`authorizationId`),
  CONSTRAINT `FK_9d520fa5fed56042918e48fc4b5` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_server`
--

LOCK TABLES `ai_server` WRITE;
/*!40000 ALTER TABLE `ai_server` DISABLE KEYS */;
INSERT INTO `ai_server` VALUES ('1250afbf-23cb-4080-b157-2c41120671f3','2024-07-29 06:55:48.576244','2024-07-29 06:55:48.576244',1,'3745cdc8-3300-48a7-a5a1-838ca026a19f');
/*!40000 ALTER TABLE `ai_server` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `lifecycleId` char(36) DEFAULT NULL,
  `userId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_56f5614fff0028d40370499582` (`authorizationId`),
  UNIQUE KEY `REL_7ec2857c7d8d16432ffca1cb3d` (`lifecycleId`),
  KEY `FK_b4ae3fea4a24b4be1a86dacf8a2` (`userId`),
  KEY `FK_500cee6f635849f50e19c7e2b76` (`communityId`),
  CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application`
--

LOCK TABLES `application` WRITE;
/*!40000 ALTER TABLE `application` DISABLE KEYS */;
/*!40000 ALTER TABLE `application` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application_questions`
--

DROP TABLE IF EXISTS `application_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application_questions` (
  `applicationId` char(36) NOT NULL,
  `nvpId` char(36) NOT NULL,
  PRIMARY KEY (`applicationId`,`nvpId`),
  KEY `IDX_8495fae86f13836b0745642baa` (`applicationId`),
  KEY `IDX_fe50118fd82e7fe2f74f986a19` (`nvpId`),
  CONSTRAINT `FK_8495fae86f13836b0745642baa8` FOREIGN KEY (`applicationId`) REFERENCES `application` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_fe50118fd82e7fe2f74f986a195` FOREIGN KEY (`nvpId`) REFERENCES `nvp` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `application_questions`
--

LOCK TABLES `application_questions` WRITE;
/*!40000 ALTER TABLE `application_questions` DISABLE KEYS */;
/*!40000 ALTER TABLE `application_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authorization_policy`
--

DROP TABLE IF EXISTS `authorization_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authorization_policy` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `credentialRules` text NOT NULL,
  `verifiedCredentialRules` text NOT NULL,
  `anonymousReadAccess` tinyint NOT NULL,
  `privilegeRules` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authorization_policy`
--

LOCK TABLES `authorization_policy` WRITE;
/*!40000 ALTER TABLE `authorization_policy` DISABLE KEYS */;
INSERT INTO `authorization_policy` VALUES ('02fa5327-6dbe-42eb-8fb1-465dd136958e','2024-07-29 07:40:04.095453','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('036078f3-351e-4f96-ac9c-9f6c35ba3592','2024-07-29 06:56:02.895897','2024-07-29 06:56:02.895897',1,'','',0,''),('03e1aab2-9e98-48a6-94bd-59462daccab6','2024-07-29 06:56:02.949790','2024-07-29 06:56:02.949790',1,'','',0,''),('07cd84c9-6e71-443a-aeed-dd0ff8fae940','2024-07-29 06:56:02.779794','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,''),('08805537-feb7-45bb-ba68-663b9fa1f172','2024-07-29 06:56:02.768114','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"authorization-reset\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-organizationAuthorizationReset\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,''),('08e9359d-aab4-4a12-8667-efba7bbb7b00','2024-07-29 07:40:02.563562','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('0a5d5825-5ed3-486f-aaca-c5cfc602908e','2024-07-29 06:56:02.695899','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('0acc50f6-b2b0-427b-be5e-86ba19311239','2024-07-29 07:40:02.606276','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('0dc95fe9-8ea2-4eb3-a015-d1a1654c9550','2024-07-29 07:40:02.521096','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('0dda51a2-98c6-4b97-9ee9-ca6c68f36d3c','2024-07-29 07:40:04.126632','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('0df36442-e185-4a0c-88e5-c24023f3de82','2024-07-29 07:40:02.662531','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('0fcbfa6e-a7ea-49ba-a616-7a934673233d','2024-07-29 07:40:02.647899','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('110e459c-ec8d-4a79-b0e6-3276e2697893','2024-07-29 07:40:04.036844','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('135eb9e4-912b-4b22-9bf1-e8c5707d46fd','2024-07-29 06:55:47.328628','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-license-manager\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-licenseManager\"}]','[]',1,''),('13686606-d7a2-4f4d-a162-ba0aa8856315','2024-07-29 07:40:02.593117','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('15580054-7cbe-4faa-9fac-0dcbb7119267','2024-07-29 06:56:02.842707','2024-07-29 06:56:02.842707',1,'','',0,''),('180de984-453a-4b66-87d0-ee8f50565de0','2024-07-29 07:40:04.186306','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('1900663f-1463-46d9-9e97-278a4453a5ea','2024-07-29 07:40:02.637181','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('1b37e151-f678-4196-86f1-db46e5747e78','2024-07-29 06:56:02.923742','2024-07-29 06:56:02.923742',1,'','',0,''),('1bb1a07f-878c-450d-84ef-fb980db46a23','2024-07-29 07:40:04.156135','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('1c2ab720-7a0e-46db-8093-27f1c73dd6e5','2024-07-29 06:56:02.708068','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,''),('1d47f164-f4a0-4690-9d5d-15edad3528e4','2024-07-29 06:56:03.091850','2024-07-29 06:56:03.091850',1,'','',0,''),('23d3a057-378b-4eb4-a563-fee0a2e60485','2024-07-29 07:40:04.203703','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('25c657b4-cf0a-4458-899f-1e472efe8ddd','2024-07-29 07:40:04.129315','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('2838aa21-d014-4a03-960f-39a64c9fec13','2024-07-29 06:56:03.104437','2024-07-29 06:56:03.104437',1,'','',0,''),('28a5cd66-0fc4-4411-b791-305d1c84253b','2024-07-29 07:40:04.139759','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('2a138944-2d10-49b9-b71b-1080817e0877','2024-07-29 06:56:02.747836','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',1,''),('2c124f20-6031-4107-9917-9c925056db2a','2024-07-29 07:40:02.694792','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('2c6fd8fa-5ca1-4450-8493-284504417c16','2024-07-29 06:56:02.758956','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,''),('2c942375-8379-4959-a0be-50efc474bf33','2024-07-29 07:40:04.150839','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('2ea82e5a-2a65-4639-9280-012f625f0c27','2024-07-29 06:56:02.872464','2024-07-29 06:56:02.872464',1,'','',0,''),('2ec80a70-5b22-4a12-8615-fefa6ff0913d','2024-07-29 06:56:02.858506','2024-07-29 06:56:02.858506',1,'','',0,''),('30a9a741-23f6-419d-869d-72de3c320fdf','2024-07-29 07:40:02.621002','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('363a409d-d8c6-4603-8c28-e879df4e2576','2024-07-29 07:40:02.602641','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('3745cdc8-3300-48a7-a5a1-838ca026a19f','2024-07-29 06:55:48.574033','2024-07-29 06:55:48.574033',1,'','',0,''),('37b8bfff-8091-424b-94ad-b86917c872b7','2024-07-29 07:40:04.174587','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('37c7a41f-6a1c-495c-a040-7ff1c06f1a72','2024-07-29 07:40:04.039654','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('3a6c1891-a7ad-48ec-838f-2ace4225e227','2024-07-29 07:40:02.509292','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('40c91ec6-9acf-4904-a4fb-3813a1910649','2024-07-29 06:56:02.995190','2024-07-29 06:56:02.995190',1,'','',0,''),('4360faba-e5d0-48bb-a373-affd0dc73cb2','2024-07-29 07:40:02.613852','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('48466486-6cba-435b-832b-d616a94ffcb5','2024-07-29 07:40:02.645510','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('499d859c-41f9-457d-9e95-8b6ef53c9c54','2024-07-29 06:56:02.908833','2024-07-29 06:56:02.908833',1,'','',0,''),('4dac8516-df12-4bfe-ab88-5e4fb627fc8f','2024-07-29 06:56:02.970161','2024-07-29 06:56:02.970161',1,'','',0,''),('512e53fa-dddd-4137-b7b1-34fd434c9883','2024-07-29 06:56:03.074122','2024-07-29 06:56:03.074122',1,'','',0,''),('516d8429-0b93-4bcf-a860-f3bf56440e11','2024-07-29 07:40:04.107942','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('521fcfee-5ce2-44aa-8f64-95bae8b74cbd','2024-07-29 07:40:02.719220','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"authorization-reset\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-userAuthorizationReset\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"read-user-settings\"],\"name\":\"privilegeRule-readUserSettings\"}]'),('555f09dd-1bf0-4895-a830-f7b7b6e9c3e4','2024-07-29 07:40:02.527663','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('55ac66c3-bd0e-4387-8e08-6c751a117bfd','2024-07-29 07:40:02.639444','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('55d20219-e2d5-45b8-badb-8bdbb9ed503b','2024-07-29 06:55:46.607995','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-license-manager\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-licenseManager\"}]','[]',1,''),('56f60443-a6cd-48ba-89e2-cf054d2a4cc6','2024-07-29 06:55:41.000000','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"grant-global-admins\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformGrantGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-license-manager\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformPlatformAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"authorization-reset\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformPlatformAuthReset\"},{\"grantedPrivileges\":[\"read-users\"],\"criterias\":[{\"type\":\"global-registered\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformReadRegistered\"},{\"grantedPrivileges\":[\"create-space\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"beta-tester\",\"resourceID\":\"\"},{\"type\":\"vc-campaign\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformCreateSpace\"},{\"grantedPrivileges\":[\"create-organization\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"space-admin\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformCreateOrganization\"},{\"grantedPrivileges\":[\"access-interactive-guidance\"],\"criterias\":[{\"type\":\"global-registered\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-platformAccessGuidance\"}]','[]',0,''),('58089601-5a61-4f1c-9edb-bdad36a58527','2024-07-29 07:40:04.203188','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"authorization-reset\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":false,\"name\":\"credentialRuleTypes-userAuthorizationReset\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"read-user-settings\"],\"name\":\"privilegeRule-readUserSettings\"}]'),('587d6901-eb8e-44d3-a06d-4e898a20482b','2024-07-29 07:40:02.658515','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('5e0319b3-eee5-41b3-a5b4-d1f7a652fc7a','2024-07-29 06:55:41.346994','2024-07-29 06:55:41.346994',1,'','',0,''),('5e4e7ce8-3632-41fe-859d-c56321e27b66','2024-07-29 06:56:02.733043','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',1,''),('5ee3b866-f3cf-4677-9516-842bd393f7ff','2024-07-29 07:40:04.123682','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('613fb913-0ce8-43f2-aa9e-83d23c3f89e7','2024-07-29 07:40:04.135273','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('63541aa3-fca4-4e13-94d0-f1b83bb39987','2024-07-29 07:40:02.651629','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('6604bfa8-1232-4fc4-810e-4fae37718c49','2024-07-29 06:56:02.720546','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',1,''),('69aafb53-dc04-4a86-a0b2-67ea28a7550a','2024-07-29 07:40:02.540367','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('6b5a8bc0-341f-47d0-bbc7-e7e54ef1eb50','2024-07-29 06:56:03.068660','2024-07-29 06:56:03.068660',1,'','',0,''),('6e651e69-09d8-4744-887a-7aa9dab1dfc0','2024-07-29 06:56:02.877378','2024-07-29 06:56:02.877378',1,'','',0,''),('70f62c6b-2267-4cef-8c9e-699f9ebb334d','2024-07-29 06:56:02.916846','2024-07-29 06:56:02.916846',1,'','',0,''),('7302637c-05d2-4099-a829-124ca8e79115','2024-07-29 07:40:02.610175','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('772d9c46-9a92-405e-bf6a-05683da1a6f2','2024-07-29 06:56:02.882292','2024-07-29 06:56:02.882292',1,'','',0,''),('7890ec3b-fa8b-4881-813d-bc4b785fd148','2024-07-29 06:56:02.837688','2024-07-29 06:56:02.837688',1,'','',0,''),('7c219403-8431-4306-af33-0e4cf0816955','2024-07-29 07:40:04.119850','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('7d21fc8d-07b8-49d4-8690-b024ead1d8d1','2024-07-29 07:40:02.624116','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('7d7765ab-34c1-4e80-81d0-6bddc7821b62','2024-07-29 07:40:04.020618','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('80c51a35-afcd-4db1-993d-86b9c581f5c2','2024-07-29 07:40:04.033814','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('845c49ad-7093-400f-b9a3-a5b3bb4c36ed','2024-07-29 06:56:03.065521','2024-07-29 06:56:03.065521',1,'','',0,''),('87214510-dc83-4cf1-8290-6e88de204baa','2024-07-29 06:56:03.016065','2024-07-29 06:56:03.016065',1,'','',0,''),('8b422b7e-3449-42aa-a037-75eac054d5c4','2024-07-29 06:56:03.031421','2024-07-29 06:56:03.031421',1,'','',0,''),('8cdf8b9f-ae83-426c-be7f-7544748d9b58','2024-07-29 06:56:02.889079','2024-07-29 06:56:02.889079',1,'','',0,''),('8d2aeb31-143f-4851-b908-39477283b926','2024-07-29 06:56:02.789877','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',0,''),('8dc8f5ad-acb4-4144-997d-209bd9406e08','2024-07-29 06:55:41.344613','2024-07-29 06:55:41.344613',1,'','',0,''),('939ebbfb-3b2b-43a1-ba08-684b25457e1f','2024-07-29 07:40:02.629758','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('9789d911-c21a-4008-9b0e-26b26fc09c7c','2024-07-29 07:40:04.164203','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('980b2b26-ba8c-4b9c-bce7-0e6127ea6813','2024-07-29 07:40:02.689377','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('98497ab4-1ee8-428c-a8de-162f81003987','2024-07-29 07:40:04.142682','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('9b00e4b2-907a-4078-a5a0-390df5ec9a2b','2024-07-29 07:40:04.145373','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('9c66efac-3d8e-4805-b1b2-27828767e161','2024-07-29 07:40:02.599039','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('9d219c2a-04fd-4c6a-becd-3087b600ef28','2024-07-29 07:40:02.719804','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('9fc5dd3f-5117-4fb1-8479-373b5302597f','2024-07-29 06:56:02.931850','2024-07-29 06:56:02.931850',1,'','',0,''),('9fe2a44c-618f-434c-bd82-84c25c36e565','2024-07-29 07:40:02.655473','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('a00dd523-c6c6-4acf-ac97-dc0cc51579ae','2024-07-29 07:40:04.044590','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('a04a94a8-33db-4932-b746-60eef16d2323','2024-07-29 07:40:04.099565','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('a19e35d7-1499-4da8-a271-0e81d09e94d6','2024-07-29 06:56:02.956909','2024-07-29 06:56:02.956909',1,'','',0,''),('a1a5c86f-25b2-49a5-96ea-1ae30959fe89','2024-07-29 07:40:04.110676','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('a51f9a6b-281c-4c57-9fa2-87230aa4718a','2024-07-29 07:40:04.056984','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('a6bb0e9b-572a-4180-a9d0-e65b956b20c3','2024-07-29 06:56:02.849452','2024-07-29 06:56:02.849452',1,'','',0,''),('a79084d7-cee8-4bf7-9ca1-abb0b517329d','2024-07-29 06:55:41.000000','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"}]','[]',1,''),('a90780af-9407-4cc5-9983-22e3a5b7bafa','2024-07-29 06:56:03.000109','2024-07-29 06:56:03.000109',1,'','',0,''),('a9dd23f5-e531-4a79-b66f-3e6626e4090d','2024-07-29 06:56:02.903369','2024-07-29 06:56:02.903369',1,'','',0,''),('ab1be623-87ff-4967-8a36-e19ae114c150','2024-07-29 07:40:04.116242','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('ac394088-b727-44d0-a7c7-4cdaa806c9e6','2024-07-29 06:56:02.755820','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',1,'[{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"update\"],\"name\":\"policyRule-visualUpdate\"}]'),('ad9c93f8-aff7-4be9-a2cc-b1ff843457cd','2024-07-29 06:56:02.938065','2024-07-29 06:56:02.938065',1,'','',0,''),('b0e29a04-35b9-4a58-bc2b-c6728e5b71e9','2024-07-29 06:56:02.911861','2024-07-29 06:56:02.911861',1,'','',0,''),('b1bb3b10-cc9e-412a-9eb4-9024a424ad83','2024-07-29 07:40:02.551929','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,'[{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"update\"],\"name\":\"policyRule-visualUpdate\"}]'),('b73f41a4-f868-41b8-af7b-13ae119a4de1','2024-07-29 06:56:02.772538','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"grant\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdminsAll\"},{\"grantedPrivileges\":[\"read\",\"update\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationVerificationAdmin\"}]','',0,''),('b8293901-aa31-4e39-a614-797cd64c7c2b','2024-07-29 07:40:04.051697','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,'[{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"update\"],\"name\":\"policyRule-visualUpdate\"}]'),('ba647693-1581-49cf-aa79-a36404e40415','2024-07-29 07:40:04.180837','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('bcc7fd2c-52bd-4e82-bfbd-e8fe0bccdc48','2024-07-29 07:40:04.088741','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('be805f78-a9f8-4037-b831-c498f47dabde','2024-07-29 07:40:02.626555','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('c2b6c6d5-aa96-486b-96fc-0d621210d976','2024-07-29 07:40:04.074895','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('c3d29111-03b7-46cf-9f02-b0cf831a984a','2024-07-29 06:56:02.941694','2024-07-29 06:56:02.941694',1,'','',0,''),('c4ec3d49-b72c-4880-80d7-352d4577534c','2024-07-29 07:40:04.025510','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('c55df1f9-f0fe-4a7a-a037-e160cf984c54','2024-07-29 06:56:03.080839','2024-07-29 06:56:03.080839',1,'','',0,''),('c6827987-634c-476f-85a2-cb24edf7fcda','2024-07-29 07:40:02.632068','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('c7e88dfd-a36e-4783-bea4-bfba58893b10','2024-07-29 06:56:02.964586','2024-07-29 06:56:02.964586',1,'','',0,''),('c80c9990-0aab-43b1-81f9-59b080154038','2024-07-29 07:40:02.668158','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('c85346a6-789d-426c-b91a-b962e3a1259b','2024-07-29 07:40:04.104539','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('c88e7d4f-bc1f-4650-94ac-3adbddf37c2d','2024-07-29 07:40:04.092029','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('ca5faba1-7102-4534-9084-56bdbdb3c7b0','2024-07-29 07:40:02.503952','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('cc2dec6b-1a32-45da-9e45-0a0cfc7fdbbb','2024-07-29 07:40:04.028178','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('ccae1722-1b6f-480d-b354-006c3630f889','2024-07-29 07:40:02.532494','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('cf38f696-4eb3-40ca-ac56-b26d17b839b8','2024-07-29 06:56:02.865548','2024-07-29 06:56:02.865548',1,'','',0,''),('d0385eab-8d51-4767-80e6-926bd403a133','2024-07-29 07:40:04.153512','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('d3a6ae66-3223-417f-9217-66050bb28d70','2024-07-29 07:40:02.617183','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('d570cbc2-0c6a-4335-b823-cd6e7285f4e1','2024-07-29 07:40:02.678249','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('d6a7bd09-91ca-45a5-b4e0-03ae824b1826','2024-07-29 07:40:04.159295','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('da3dfff0-26cf-4e7f-8a26-be4fb1f9a4d6','2024-07-29 06:56:02.986977','2024-07-29 06:56:02.986977',1,'','',0,''),('dc732f6a-afd2-47c4-8b24-8bfda9325668','2024-07-29 06:56:02.974657','2024-07-29 06:56:02.974657',1,'','',0,''),('dcb74d33-df17-4a5a-88df-0b78920b1a95','2024-07-29 07:40:02.587310','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('dccb51e5-a2a2-4a1b-85c8-4a6297d8806c','2024-07-29 07:40:04.083949','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('debe4880-558b-4994-aaac-170b511aa76c','2024-07-29 06:56:03.096639','2024-07-29 06:56:03.096639',1,'','',0,''),('df3a160b-9486-4360-8a31-0081900dea89','2024-07-29 07:40:02.673686','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('e001cca7-2f73-474f-9cc2-ff7a42d77d12','2024-07-29 07:40:02.683993','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('e05e321f-69d2-4c4b-bbb6-39c9db58457a','2024-07-29 06:56:02.980485','2024-07-29 06:56:02.980485',1,'','',0,''),('e1dffe0a-1229-469b-a399-7c024a7fb802','2024-07-29 06:56:03.030905','2024-07-29 06:56:03.030905',1,'','',0,''),('e623ebaa-261b-412c-8f97-a51e426dd18e','2024-07-29 07:40:02.634571','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('e99378ed-d99c-4184-9b90-228e8c0caebc','2024-07-29 06:56:03.083719','2024-07-29 06:56:03.083719',1,'','',0,''),('ed38b37d-01ae-4c93-8109-caf4c8c92b45','2024-07-29 07:40:02.576434','2024-07-29 07:40:03.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',1,''),('eda85ea9-6122-4dd9-a7a5-aa04081b7c12','2024-07-29 06:56:02.845801','2024-07-29 06:56:02.845801',1,'','',0,''),('ede79031-920a-4f7b-9b12-6b15da461b8b','2024-07-29 07:40:02.642636','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('ee35f8fa-63b6-4014-93f8-5cd1cbc65b58','2024-07-29 07:40:04.131982','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('ef0ac185-4190-4ec7-9f20-9a9a37097b49','2024-07-29 06:55:41.361143','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"file-upload\",\"read\"],\"criterias\":[{\"type\":\"global-registered\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformFileUploadAnyUser\"}]','[]',1,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('f3a64e07-a388-4851-bfde-658d501d2008','2024-07-29 07:40:04.168683','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('f3b0998a-490e-439a-8337-41d7adf00b37','2024-07-29 07:40:02.488523','2024-07-29 07:40:04.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"8250180d-d3f6-48ae-9347-d9b993cf296d\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('f6d88202-5f79-47b2-b06b-d1ccacc5c73e','2024-07-29 06:56:02.712432','2024-07-29 06:56:02.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalSupportManage\"},{\"grantedPrivileges\":[\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationGlobalAdmins\"},{\"grantedPrivileges\":[\"grant\",\"create\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"}],\"cascade\":true,\"name\":\"credentialRule-organizationAdmin\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-organizationPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"organization-associate\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-admin\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"organization-owner\",\"resourceID\":\"1d2b3361-abb3-4f2f-81b0-50a25d505278\"},{\"type\":\"global-registered\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-organizationRead\"}]','[]',1,'[{\"sourcePrivilege\":\"update\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketUpdaterFileUpload\"},{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"file-upload\"],\"name\":\"policyRule-storageBucketContributorFileUpload\"},{\"sourcePrivilege\":\"delete\",\"grantedPrivileges\":[\"file-delete\"],\"name\":\"policyRule-platformDelete\"}]'),('f8c1415f-7763-4ab4-943a-576f3d42c141','2024-07-29 07:40:04.148327','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('fb30a0f0-ee1f-4761-9213-2b85cd3ea175','2024-07-29 07:40:04.113394','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"platform-admin\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userPlatformAdmin\"},{\"grantedPrivileges\":[\"read\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-userGlobalCommunityRead\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"}],\"cascade\":true,\"name\":\"credentialRule-userSelfAdmin\"},{\"grantedPrivileges\":[\"read\",\"read-user-settings\"],\"criterias\":[{\"type\":\"global-community-read\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userRead\"},{\"grantedPrivileges\":[\"read-user-pii\"],\"criterias\":[{\"type\":\"user-self\",\"resourceID\":\"737044b7-7f58-48c3-9079-f4e8317bdc02\"},{\"type\":\"global-admin\",\"resourceID\":\"\"},{\"type\":\"global-support\",\"resourceID\":\"\"},{\"type\":\"global-community-read\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRule-userReadPii\"}]','[]',0,''),('fb619708-5e02-4449-bafc-b6d2b496e79e','2024-07-29 06:55:41.358745','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"file-upload\",\"read\"],\"criterias\":[{\"type\":\"global-registered\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformFileUploadAnyUser\"}]','[]',1,''),('fbdc8300-eba5-4a67-81bb-64e480b4071f','2024-07-29 07:40:05.431401','2024-07-29 07:40:05.000000',2,'[{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"],\"criterias\":[{\"type\":\"global-admin\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformGlobalAdmins\"},{\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"],\"criterias\":[{\"type\":\"global-support\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"credentialRuleTypes-platformPlatformMgmt\"},{\"grantedPrivileges\":[\"read\",\"contribute\"],\"criterias\":[{\"type\":\"global-registered\",\"resourceID\":\"\"}],\"cascade\":true,\"name\":\"platformReadContributeRegistered\"}]','[]',1,'[{\"sourcePrivilege\":\"contribute\",\"grantedPrivileges\":[\"create-discussion\"],\"name\":\"policyRule-forumContribute\"},{\"sourcePrivilege\":\"create\",\"grantedPrivileges\":[\"create-discussion\"],\"name\":\"policyRule-forumCreate\"}]');
/*!40000 ALTER TABLE `authorization_policy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendar`
--

DROP TABLE IF EXISTS `calendar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_94994efc5eb5936ed70f2c55903` (`authorizationId`),
  UNIQUE KEY `IDX_6e74d59afda096b68d12a69969` (`authorizationId`),
  CONSTRAINT `FK_33355901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar`
--

LOCK TABLES `calendar` WRITE;
/*!40000 ALTER TABLE `calendar` DISABLE KEYS */;
/*!40000 ALTER TABLE `calendar` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `calendar_event`
--

DROP TABLE IF EXISTS `calendar_event`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_event` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `createdBy` char(36) DEFAULT NULL,
  `commentsId` char(36) DEFAULT NULL,
  `startDate` datetime(6) DEFAULT NULL,
  `wholeDay` tinyint DEFAULT NULL,
  `multipleDays` tinyint DEFAULT NULL,
  `durationMinutes` int DEFAULT NULL,
  `durationDays` int DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `nameID` varchar(36) NOT NULL,
  `calendarId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_22222ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `REL_222adf666c59b9eb5ce394714cf` (`commentsId`),
  UNIQUE KEY `REL_a3693e1d3472c5ef8b00e51acfd` (`profileId`),
  UNIQUE KEY `IDX_111838434c7198a323ea6f475fb` (`profileId`),
  UNIQUE KEY `IDX_8ee86afa2808a4ab523b9ee6c5` (`authorizationId`),
  UNIQUE KEY `IDX_9349e137959f3ca5818c2e62b3` (`profileId`),
  UNIQUE KEY `IDX_b5069b11030e9608ee4468f850` (`commentsId`),
  KEY `FK_77755450cf75dc486700ca034c6` (`calendarId`),
  KEY `FK_6a30f26ca267009fcf514e0e726` (`createdBy`),
  CONSTRAINT `FK_111838434c7198a323ea6f475fb` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_157de0ce487e25bb69437e80b13` FOREIGN KEY (`commentsId`) REFERENCES `room` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_22255901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_6a30f26ca267009fcf514e0e726` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_77755450cf75dc486700ca034c6` FOREIGN KEY (`calendarId`) REFERENCES `calendar` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `calendar_event`
--

LOCK TABLES `calendar_event` WRITE;
/*!40000 ALTER TABLE `calendar_event` DISABLE KEYS */;
/*!40000 ALTER TABLE `calendar_event` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout`
--

DROP TABLE IF EXISTS `callout`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) NOT NULL,
  `type` text NOT NULL,
  `visibility` text NOT NULL DEFAULT (_utf8mb4'draft'),
  `authorizationId` char(36) DEFAULT NULL,
  `commentsId` char(36) DEFAULT NULL,
  `collaborationId` char(36) DEFAULT NULL,
  `sortOrder` int NOT NULL,
  `publishedBy` char(36) DEFAULT NULL,
  `publishedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `createdBy` char(36) DEFAULT NULL,
  `framingId` char(36) DEFAULT NULL,
  `contributionPolicyId` char(36) DEFAULT NULL,
  `contributionDefaultsId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_6289dee12effb51320051c6f1f` (`authorizationId`),
  UNIQUE KEY `IDX_1e740008a7e1512966e3b08414` (`contributionPolicyId`),
  UNIQUE KEY `IDX_36b0da55acff774d0845aeb55f` (`contributionDefaultsId`),
  UNIQUE KEY `IDX_cf776244b01436d8ca5cc76284` (`framingId`),
  UNIQUE KEY `IDX_62ed316cda7b75735b20307b47` (`commentsId`),
  KEY `FK_9b1c5ee044611ac78249194ec35` (`collaborationId`),
  CONSTRAINT `FK_1e740008a7e1512966e3b084148` FOREIGN KEY (`contributionPolicyId`) REFERENCES `callout_contribution_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_36b0da55acff774d0845aeb55f2` FOREIGN KEY (`contributionDefaultsId`) REFERENCES `callout_contribution_defaults` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_6289dee12effb51320051c6f1fc` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_62ed316cda7b75735b20307b47e` FOREIGN KEY (`commentsId`) REFERENCES `room` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9b1c5ee044611ac78249194ec35` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_cf776244b01436d8ca5cc762848` FOREIGN KEY (`framingId`) REFERENCES `callout_framing` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout`
--

LOCK TABLES `callout` WRITE;
/*!40000 ALTER TABLE `callout` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout_contribution`
--

DROP TABLE IF EXISTS `callout_contribution`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout_contribution` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `whiteboardId` char(36) DEFAULT NULL,
  `postId` char(36) DEFAULT NULL,
  `linkId` char(36) DEFAULT NULL,
  `calloutId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_dfa86c46f509a61c6510536cd9` (`authorizationId`),
  UNIQUE KEY `REL_97fefc97fb254c30577696e1c0` (`postId`),
  UNIQUE KEY `REL_bdf2d0eced5c95968a85caaaae` (`linkId`),
  UNIQUE KEY `REL_5e34f9a356f6254b8da24f8947` (`whiteboardId`),
  KEY `FK_7370de8eb79ed00b0d403f2299a` (`calloutId`),
  CONSTRAINT `FK_5e34f9a356f6254b8da24f8947b` FOREIGN KEY (`whiteboardId`) REFERENCES `whiteboard` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7370de8eb79ed00b0d403f2299a` FOREIGN KEY (`calloutId`) REFERENCES `callout` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_97fefc97fb254c30577696e1c0a` FOREIGN KEY (`postId`) REFERENCES `post` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_bdf2d0eced5c95968a85caaaaee` FOREIGN KEY (`linkId`) REFERENCES `link` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_dfa86c46f509a61c6510536cd9a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout_contribution`
--

LOCK TABLES `callout_contribution` WRITE;
/*!40000 ALTER TABLE `callout_contribution` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout_contribution` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout_contribution_defaults`
--

DROP TABLE IF EXISTS `callout_contribution_defaults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout_contribution_defaults` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `postDescription` text,
  `whiteboardContent` longtext,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout_contribution_defaults`
--

LOCK TABLES `callout_contribution_defaults` WRITE;
/*!40000 ALTER TABLE `callout_contribution_defaults` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout_contribution_defaults` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout_contribution_policy`
--

DROP TABLE IF EXISTS `callout_contribution_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout_contribution_policy` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `allowedContributionTypes` text NOT NULL,
  `state` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout_contribution_policy`
--

LOCK TABLES `callout_contribution_policy` WRITE;
/*!40000 ALTER TABLE `callout_contribution_policy` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout_contribution_policy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout_framing`
--

DROP TABLE IF EXISTS `callout_framing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout_framing` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `whiteboardId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_c9d7c2c4eb8a1d012ddc6605da` (`authorizationId`),
  UNIQUE KEY `REL_f53e2d266432e58e538a366705` (`profileId`),
  UNIQUE KEY `REL_8bc0e1f40be5816d3a593cbf7f` (`whiteboardId`),
  CONSTRAINT `FK_8bc0e1f40be5816d3a593cbf7fa` FOREIGN KEY (`whiteboardId`) REFERENCES `whiteboard` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_c9d7c2c4eb8a1d012ddc6605da9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_f53e2d266432e58e538a366705d` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout_framing`
--

LOCK TABLES `callout_framing` WRITE;
/*!40000 ALTER TABLE `callout_framing` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout_framing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `callout_template`
--

DROP TABLE IF EXISTS `callout_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `callout_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `framingId` char(36) DEFAULT NULL,
  `contributionDefaultsId` char(36) DEFAULT NULL,
  `contributionPolicyId` char(36) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_6c90723f8f1424e2dd08dddb39` (`authorizationId`),
  UNIQUE KEY `REL_75d5ced6c2e92cbbb5d8d0a913` (`profileId`),
  UNIQUE KEY `REL_b94beb9cefe0a8814dceddd10f` (`framingId`),
  UNIQUE KEY `REL_83bbc10ba2ddee4502bf327f1f` (`contributionDefaultsId`),
  UNIQUE KEY `REL_bffd07760b73be1aad13b6d00c` (`contributionPolicyId`),
  UNIQUE KEY `IDX_479f799f0d86e43c9d8623e827` (`contributionDefaultsId`),
  UNIQUE KEY `IDX_29ff764dc6de1a9dc289cbfb01` (`contributionPolicyId`),
  KEY `FK_7c434491e8e9ee8af12caff7db3` (`templatesSetId`),
  CONSTRAINT `FK_6c90723f8f1424e2dd08dddb393` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_75d5ced6c2e92cbbb5d8d0a913e` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7c434491e8e9ee8af12caff7db3` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`),
  CONSTRAINT `FK_83bbc10ba2ddee4502bf327f1f5` FOREIGN KEY (`contributionDefaultsId`) REFERENCES `callout_contribution_defaults` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b94beb9cefe0a8814dceddd10f6` FOREIGN KEY (`framingId`) REFERENCES `callout_framing` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_bffd07760b73be1aad13b6d00c3` FOREIGN KEY (`contributionPolicyId`) REFERENCES `callout_contribution_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `callout_template`
--

LOCK TABLES `callout_template` WRITE;
/*!40000 ALTER TABLE `callout_template` DISABLE KEYS */;
/*!40000 ALTER TABLE `callout_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challenge`
--

DROP TABLE IF EXISTS `challenge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `challenge` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `contextId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `spaceId` char(36) DEFAULT NULL,
  `collaborationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  `accountId` char(36) DEFAULT NULL,
  `type` varchar(32) NOT NULL DEFAULT (_utf8mb4'challenge'),
  `settingsStr` text NOT NULL,
  `level` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e3b287bbffe59aba827d97d5fa` (`rowId`),
  UNIQUE KEY `IDX_313c12afe69143a9ee3779b4f6` (`rowId`)
) ENGINE=InnoDB AUTO_INCREMENT=164 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challenge`
--

LOCK TABLES `challenge` WRITE;
/*!40000 ALTER TABLE `challenge` DISABLE KEYS */;
/*!40000 ALTER TABLE `challenge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collaboration`
--

DROP TABLE IF EXISTS `collaboration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaboration` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `tagsetTemplateSetId` char(36) DEFAULT NULL,
  `timelineId` char(36) DEFAULT NULL,
  `innovationFlowId` char(36) DEFAULT NULL,
  `groupsStr` text NOT NULL DEFAULT (_utf8mb4'[]'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_262ecf3f5d70b82a4833618425` (`authorizationId`),
  UNIQUE KEY `IDX_b7ece56376ac7ca0b9a56c33b3` (`tagsetTemplateSetId`),
  UNIQUE KEY `IDX_f67a2d25c945269d602c182fbc` (`timelineId`),
  CONSTRAINT `FK_1a135130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_262ecf3f5d70b82a48336184251` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3005ed9ce3f57c250c59d6d5065` FOREIGN KEY (`timelineId`) REFERENCES `timeline` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collaboration`
--

LOCK TABLES `collaboration` WRITE;
/*!40000 ALTER TABLE `collaboration` DISABLE KEYS */;
/*!40000 ALTER TABLE `collaboration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `communication`
--

DROP TABLE IF EXISTS `communication`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `communication` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `spaceID` char(36) NOT NULL,
  `updatesId` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a20c5901817dd09d5906537e08` (`authorizationId`),
  UNIQUE KEY `IDX_eb99e588873c788a68a035478a` (`updatesId`),
  CONSTRAINT `FK_777750fa78a37776ad962cb7643` FOREIGN KEY (`updatesId`) REFERENCES `room` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_a20c5901817dd09d5906537e087` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `communication`
--

LOCK TABLES `communication` WRITE;
/*!40000 ALTER TABLE `communication` DISABLE KEYS */;
INSERT INTO `communication` VALUES ('59982cf6-9306-4248-88f8-984166accc63','2024-07-29 06:56:03.105785','2024-07-29 06:56:03.105785',1,'Default Space','',NULL,'2838aa21-d014-4a03-960f-39a64c9fec13');
/*!40000 ALTER TABLE `communication` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `community`
--

DROP TABLE IF EXISTS `community`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `parentCommunityId` char(36) DEFAULT NULL,
  `communicationId` char(36) DEFAULT NULL,
  `parentID` varchar(36) NOT NULL,
  `policyId` char(36) DEFAULT NULL,
  `applicationFormId` char(36) DEFAULT NULL,
  `guidelinesId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_6e7584bfb417bd0f8e8696ab58` (`authorizationId`),
  UNIQUE KEY `IDX_7fbe50fa78a37776ad962cb764` (`communicationId`),
  UNIQUE KEY `IDX_c9ff67519d26140f98265a542e` (`policyId`),
  UNIQUE KEY `IDX_c7d74dd6b92d4202c705cd3676` (`applicationFormId`),
  UNIQUE KEY `IDX_3823de95920943655430125fa9` (`policyId`),
  UNIQUE KEY `IDX_2e7dd2fa8c829352cfbecb2cc9` (`guidelinesId`),
  UNIQUE KEY `REL_2e7dd2fa8c829352cfbecb2cc9` (`guidelinesId`),
  KEY `FK_8e8283bdacc9e770918fe689333` (`parentCommunityId`),
  CONSTRAINT `FK_25543901817dd09d5906537e088` FOREIGN KEY (`applicationFormId`) REFERENCES `form` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_2e7dd2fa8c829352cfbecb2cc93` FOREIGN KEY (`guidelinesId`) REFERENCES `community_guidelines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_35533901817dd09d5906537e088` FOREIGN KEY (`policyId`) REFERENCES `community_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7fbe50fa78a37776ad962cb7643` FOREIGN KEY (`communicationId`) REFERENCES `communication` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `community`
--

LOCK TABLES `community` WRITE;
/*!40000 ALTER TABLE `community` DISABLE KEYS */;
/*!40000 ALTER TABLE `community` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `community_guidelines`
--

DROP TABLE IF EXISTS `community_guidelines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_guidelines` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_684b272e6f7459439d41d2879e` (`authorizationId`),
  UNIQUE KEY `REL_3d60fe4fa40d54bad7d51bb4bd` (`profileId`),
  CONSTRAINT `FK_3d60fe4fa40d54bad7d51bb4bd1` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_684b272e6f7459439d41d2879ee` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `community_guidelines`
--

LOCK TABLES `community_guidelines` WRITE;
/*!40000 ALTER TABLE `community_guidelines` DISABLE KEYS */;
INSERT INTO `community_guidelines` VALUES ('f0f818e5-3f54-4baa-a000-df821795fcee','2024-07-29 06:56:03.097130','2024-07-29 06:56:03.097130',1,'debe4880-558b-4994-aaac-170b511aa76c','fceeed91-69c5-4c94-a114-4af6deab9594');
/*!40000 ALTER TABLE `community_guidelines` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `community_guidelines_template`
--

DROP TABLE IF EXISTS `community_guidelines_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_guidelines_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `guidelinesId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_eb3f02cf18df8943da1673a25b` (`authorizationId`),
  UNIQUE KEY `REL_25dbe2675edea7b3c4f4aec430` (`profileId`),
  UNIQUE KEY `REL_e1817f55e97bba03a57b928725` (`guidelinesId`),
  KEY `FK_8b2d7f497cccf9cac312dac8b46` (`templatesSetId`),
  CONSTRAINT `FK_25dbe2675edea7b3c4f4aec4300` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_8b2d7f497cccf9cac312dac8b46` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`),
  CONSTRAINT `FK_e1817f55e97bba03a57b9287251` FOREIGN KEY (`guidelinesId`) REFERENCES `community_guidelines` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_eb3f02cf18df8943da1673a25b8` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `community_guidelines_template`
--

LOCK TABLES `community_guidelines_template` WRITE;
/*!40000 ALTER TABLE `community_guidelines_template` DISABLE KEYS */;
/*!40000 ALTER TABLE `community_guidelines_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `community_policy`
--

DROP TABLE IF EXISTS `community_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community_policy` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `member` text,
  `lead` text,
  `admin` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `community_policy`
--

LOCK TABLES `community_policy` WRITE;
/*!40000 ALTER TABLE `community_policy` DISABLE KEYS */;
INSERT INTO `community_policy` VALUES ('44485094-9a2a-4336-b46e-4b6db9418f34','2024-07-29 06:56:03.071558','2024-07-29 06:56:03.071558',1,'{\"enabled\":true,\"credential\":{\"type\":\"space-member\",\"resourceID\":\"\"},\"parentCredentials\":[],\"minOrg\":0,\"maxOrg\":-1,\"minUser\":0,\"maxUser\":-1}','{\"enabled\":true,\"credential\":{\"type\":\"space-lead\",\"resourceID\":\"\"},\"parentCredentials\":[],\"minOrg\":0,\"maxOrg\":2,\"minUser\":0,\"maxUser\":2}','{\"enabled\":true,\"credential\":{\"type\":\"space-admin\",\"resourceID\":\"\"},\"parentCredentials\":[],\"minOrg\":0,\"maxOrg\":0,\"minUser\":0,\"maxUser\":-1}');
/*!40000 ALTER TABLE `community_policy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `context`
--

DROP TABLE IF EXISTS `context`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `context` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `vision` text,
  `impact` text,
  `who` text,
  `authorizationId` char(36) DEFAULT NULL,
  `ecosystemModelId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_5f0dbc3b097ef297bd5f4ddb1a` (`authorizationId`),
  UNIQUE KEY `REL_a03169c3f86480ba3863924f4d` (`ecosystemModelId`),
  CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `context`
--

LOCK TABLES `context` WRITE;
/*!40000 ALTER TABLE `context` DISABLE KEYS */;
/*!40000 ALTER TABLE `context` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credential`
--

DROP TABLE IF EXISTS `credential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credential` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `resourceID` char(36) NOT NULL,
  `type` varchar(255) NOT NULL,
  `agentId` char(36) DEFAULT NULL,
  `issuer` char(36) DEFAULT NULL,
  `expires` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_dbe0929355f82e5995f0b7fd5e2` (`agentId`),
  CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credential`
--

LOCK TABLES `credential` WRITE;
/*!40000 ALTER TABLE `credential` DISABLE KEYS */;
INSERT INTO `credential` VALUES ('0fc46979-d91b-4ed2-84df-8b5975bf2894','2024-07-29 07:40:03.924282','2024-07-29 07:40:03.000000',2,'8250180d-d3f6-48ae-9347-d9b993cf296d','user-self','8499763d-fd3b-4751-b397-74e6031e8a2c',NULL,NULL),('200b27c8-6d20-405e-b158-60b2ed2400a3','2024-07-29 07:40:03.913685','2024-07-29 04:40:03.913000',1,'','global-registered','8499763d-fd3b-4751-b397-74e6031e8a2c',NULL,NULL),('2b310770-ebdc-48ad-8a3a-e57530120593','2024-07-29 07:40:03.895837','2024-07-29 04:40:03.895000',2,'','global-admin','8499763d-fd3b-4751-b397-74e6031e8a2c',NULL,NULL),('469067e3-fa47-4fa7-b499-23947c498bdb','2024-07-29 06:56:03.056950','2024-07-29 06:56:03.000000',2,'7ae636b4-e6c3-4524-811e-dad704b59fb2','account-host','59a49b11-e4a4-4998-9bcb-ceac65438dc8',NULL,NULL),('528c3f6f-6b11-4c4b-9ffc-388a02ecd4c5','2024-07-29 06:56:03.037661','2024-07-29 03:56:03.037000',1,'7ae636b4-e6c3-4524-811e-dad704b59fb2','feature-callout-to-callout-template','6ebfe7e7-52b5-4926-aab7-c53b2714f81d',NULL,NULL),('703bd945-b7df-4812-8c47-02279f722513','2024-07-29 06:56:03.043524','2024-07-29 06:56:03.000000',2,'7ae636b4-e6c3-4524-811e-dad704b59fb2','license-space-free','6ebfe7e7-52b5-4926-aab7-c53b2714f81d',NULL,NULL),('aad9f8a3-8b69-4bba-8d55-aeb7ac67a53d','2024-07-29 07:40:05.352470','2024-07-29 04:40:05.352000',1,'','global-registered','ed9707f4-965e-4d1b-b6d1-41a20465ff4b',NULL,NULL),('b5bcbaf9-62c9-4fac-aebd-06b5378fc982','2024-07-29 07:40:05.333372','2024-07-29 04:40:05.333000',2,'','global-community-read','ed9707f4-965e-4d1b-b6d1-41a20465ff4b',NULL,NULL),('c0723b69-3f1f-4b7d-b7ae-3195fbd1f847','2024-07-29 07:40:05.361097','2024-07-29 07:40:05.000000',2,'737044b7-7f58-48c3-9079-f4e8317bdc02','user-self','ed9707f4-965e-4d1b-b6d1-41a20465ff4b',NULL,NULL);
/*!40000 ALTER TABLE `credential` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `discussion`
--

DROP TABLE IF EXISTS `discussion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `discussion` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `category` text NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `nameID` varchar(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `commentsId` char(36) DEFAULT NULL,
  `privacy` varchar(255) NOT NULL DEFAULT 'authenticated',
  `forumId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_4555dccdda9ba57d8e3a634cd0` (`authorizationId`),
  UNIQUE KEY `IDX_2d8a3ca181c3f0346817685d21` (`profileId`),
  UNIQUE KEY `IDX_5337074c9b818bb63e6f314c80` (`commentsId`),
  KEY `FK_0de78853c1ee793f61bda7eff79` (`forumId`),
  CONSTRAINT `FK_0de78853c1ee793f61bda7eff79` FOREIGN KEY (`forumId`) REFERENCES `forum` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_2d8a3ca181c3f0346817685d21d` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_345655450cf75dc486700ca034c6` FOREIGN KEY (`commentsId`) REFERENCES `room` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_4555dccdda9ba57d8e3a634cd0d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `discussion`
--

LOCK TABLES `discussion` WRITE;
/*!40000 ALTER TABLE `discussion` DISABLE KEYS */;
/*!40000 ALTER TABLE `discussion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `document`
--

DROP TABLE IF EXISTS `document`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `document` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `createdBy` char(36) DEFAULT NULL,
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `storageBucketId` char(36) DEFAULT NULL,
  `displayName` varchar(255) DEFAULT NULL,
  `tagsetId` char(36) DEFAULT NULL,
  `mimeType` varchar(128) DEFAULT NULL,
  `size` int DEFAULT NULL,
  `externalID` varchar(128) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_d9e2dfcccf59233c17cc6bc641` (`authorizationId`),
  UNIQUE KEY `IDX_9fb9257b14ec21daf5bc9aa4c8` (`tagsetId`),
  KEY `FK_3337f26ca267009fcf514e0e726` (`createdBy`),
  KEY `FK_11155450cf75dc486700ca034c6` (`storageBucketId`),
  CONSTRAINT `FK_11155450cf75dc486700ca034c6` FOREIGN KEY (`storageBucketId`) REFERENCES `storage_bucket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_11155901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_222838434c7198a323ea6f475fb` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3337f26ca267009fcf514e0e726` FOREIGN KEY (`createdBy`) REFERENCES `user` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `document`
--

LOCK TABLES `document` WRITE;
/*!40000 ALTER TABLE `document` DISABLE KEYS */;
/*!40000 ALTER TABLE `document` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecosystem_model`
--

DROP TABLE IF EXISTS `ecosystem_model`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ecosystem_model` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_658580aea4e1a892227e27db90` (`authorizationId`),
  CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecosystem_model`
--

LOCK TABLES `ecosystem_model` WRITE;
/*!40000 ALTER TABLE `ecosystem_model` DISABLE KEYS */;
/*!40000 ALTER TABLE `ecosystem_model` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `form`
--

DROP TABLE IF EXISTS `form`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `form` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `description` text,
  `questions` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `form`
--

LOCK TABLES `form` WRITE;
/*!40000 ALTER TABLE `form` DISABLE KEYS */;
INSERT INTO `form` VALUES ('056dcb51-fd2b-40e7-ad16-05435a2d1756','2024-07-29 06:56:03.100543','2024-07-29 06:56:03.100543',1,'','[{\"question\":\"What makes you want to join?\",\"required\":true,\"maxLength\":500,\"explanation\":\"\",\"sortOrder\":1},{\"question\":\"Any particular role or contribution that you have in mind?\",\"required\":false,\"maxLength\":500,\"explanation\":\"\",\"sortOrder\":2},{\"question\":\"Through which user,organization or medium have you become acquainted with this community?\",\"required\":false,\"maxLength\":500,\"explanation\":\"\",\"sortOrder\":3},{\"question\":\"Anything fun you want to tell us about yourself?!\",\"required\":false,\"maxLength\":500,\"explanation\":\"\",\"sortOrder\":4},{\"question\":\"Do you already want to join a Challenge? If so, please provide the name(s).\",\"required\":false,\"maxLength\":500,\"explanation\":\"\",\"sortOrder\":5}]');
/*!40000 ALTER TABLE `form` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum`
--

DROP TABLE IF EXISTS `forum`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `discussionCategories` text NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_3b0c92945f36d06f37de80285d` (`authorizationId`),
  CONSTRAINT `FK_3b0c92945f36d06f37de80285dd` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum`
--

LOCK TABLES `forum` WRITE;
/*!40000 ALTER TABLE `forum` DISABLE KEYS */;
INSERT INTO `forum` VALUES ('c6f1c61b-1158-40be-a05c-b6429b6e13b4','2024-07-29 07:40:05.431883','2024-07-29 07:40:05.431883',1,'releases,platform-functionalities,community-building,challenge-centric,help,other','fbdc8300-eba5-4a67-81bb-64e480b4071f');
/*!40000 ALTER TABLE `forum` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `innovation_flow`
--

DROP TABLE IF EXISTS `innovation_flow`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `innovation_flow` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `states` text NOT NULL DEFAULT (_utf8mb4'[]'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_98a7abc9f297ffcacb53087dc8` (`authorizationId`),
  UNIQUE KEY `IDX_96a8cbe1706f459fd7d883be9b` (`profileId`),
  UNIQUE KEY `IDX_a6e050daa4c7a3ab1e411c3651` (`authorizationId`),
  CONSTRAINT `FK_da1a68698d32f610a5fc1880c7f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_da7368698d32f610a5fc1880c7f` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `innovation_flow`
--

LOCK TABLES `innovation_flow` WRITE;
/*!40000 ALTER TABLE `innovation_flow` DISABLE KEYS */;
/*!40000 ALTER TABLE `innovation_flow` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `innovation_flow_template`
--

DROP TABLE IF EXISTS `innovation_flow_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `innovation_flow_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `states` text NOT NULL DEFAULT (_utf8mb4'[]'),
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_76542ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_3aec561629db1d65a9b2b3a788` (`authorizationId`),
  UNIQUE KEY `IDX_bd591d7403dabe091f6a116975` (`profileId`),
  KEY `FK_76546450cf75dc486700ca034c6` (`templatesSetId`),
  CONSTRAINT `FK_76546450cf75dc486700ca034c6` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_76546901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_79991450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `innovation_flow_template`
--

LOCK TABLES `innovation_flow_template` WRITE;
/*!40000 ALTER TABLE `innovation_flow_template` DISABLE KEYS */;
INSERT INTO `innovation_flow_template` VALUES ('b940bfe6-b637-4c46-b581-61187063716e','2024-07-29 06:56:03.000694','2024-07-29 06:56:03.000000',2,'3e9bc807-81d0-4447-8a79-e00c06abc133','a90780af-9407-4cc5-9983-22e3a5b7bafa','eb1e70dd-2b1a-41be-b894-211da23c6413','[{\"displayName\":\"Key Insights\",\"description\":\"👍 Reviewing essential concepts and discoveries\"},{\"displayName\":\"Brainstorm\",\"description\":\"💡 Organizing ideas and strategies\"},{\"displayName\":\"Notes\",\"description\":\"📝 Capturing thoughts and observations\"},{\"displayName\":\"To Do\",\"description\":\"☑️ Managing tasks and priorities\"},{\"displayName\":\"Other\",\"description\":\"🌟 A flexible space for miscellaneous content\"}]'),('f91071e2-d2d8-4a79-99cf-c1b12b39f33e','2024-07-29 06:56:02.970815','2024-07-29 06:56:03.000000',2,'3e9bc807-81d0-4447-8a79-e00c06abc133','4dac8516-df12-4bfe-ab88-5e4fb627fc8f','41506117-578c-4234-8472-34d9341475b8','[{\"displayName\":\"Explore\",\"description\":\"🔍 A journey of discovery! Gather insights through research and observation.\"},{\"displayName\":\"Define\",\"description\":\"🎯 Sharpen your focus. Define the challenge with precision and set a clear direction.\"},{\"displayName\":\"Brainstorm\",\"description\":\"🎨 Ignite creativity. Generate a constellation of ideas, using concepts from diverse perspectives to get inspired.\"},{\"displayName\":\"Validate\",\"description\":\"🛠️ Test assumptions. Build prototypes, seek feedback, and validate your concepts. Adapt based on real-world insights.\"},{\"displayName\":\"Evaluate\",\"description\":\"✅ Assess impact, feasibility, and alignment to make informed choices.\"}]');
/*!40000 ALTER TABLE `innovation_flow_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `innovation_hub`
--

DROP TABLE IF EXISTS `innovation_hub`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `innovation_hub` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `subdomain` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `spaceVisibilityFilter` varchar(255) DEFAULT NULL,
  `spaceListFilter` text,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `accountId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_8f35d04d098bb6c7c57a9a83ac` (`subdomain`),
  UNIQUE KEY `IDX_1d39dac2c6d2f17286d90c306b` (`nameID`),
  UNIQUE KEY `REL_b411e4f27d77a96eccdabbf4b4` (`authorizationId`),
  UNIQUE KEY `REL_36c8905c2c6c59467c60d94fd8` (`profileId`),
  UNIQUE KEY `IDX_156fd30246eb151b9d17716abf` (`accountId`),
  UNIQUE KEY `REL_156fd30246eb151b9d17716abf` (`accountId`),
  CONSTRAINT `FK_156fd30246eb151b9d17716abf5` FOREIGN KEY (`accountId`) REFERENCES `account` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_36c8905c2c6c59467c60d94fd8a` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b411e4f27d77a96eccdabbf4b45` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `innovation_hub`
--

LOCK TABLES `innovation_hub` WRITE;
/*!40000 ALTER TABLE `innovation_hub` DISABLE KEYS */;
/*!40000 ALTER TABLE `innovation_hub` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `innovation_pack`
--

DROP TABLE IF EXISTS `innovation_pack`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `innovation_pack` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `nameID` varchar(36) NOT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `listedInStore` tinyint NOT NULL,
  `searchVisibility` varchar(36) NOT NULL DEFAULT 'account',
  `accountId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_22222ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `REL_5facd6d188068a5a1c5b6f07fc` (`profileId`),
  UNIQUE KEY `REL_a1441e46c8d36090e1f6477cea` (`templatesSetId`),
  KEY `FK_77777450cf75dc486700ca034c6` (`accountId`),
  CONSTRAINT `FK_22222901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_39991450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_55555901817dd09d5906537e088` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_77777450cf75dc486700ca034c6` FOREIGN KEY (`accountId`) REFERENCES `account` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `innovation_pack`
--

LOCK TABLES `innovation_pack` WRITE;
/*!40000 ALTER TABLE `innovation_pack` DISABLE KEYS */;
/*!40000 ALTER TABLE `innovation_pack` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invitation`
--

DROP TABLE IF EXISTS `invitation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invitation` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `invitedContributor` char(36) DEFAULT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  `welcomeMessage` varchar(512) DEFAULT NULL,
  `invitedToParent` tinyint NOT NULL DEFAULT '0',
  `contributorType` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_b132226941570cb650a4023d49` (`authorizationId`),
  UNIQUE KEY `REL_b0c80ccf319a1c7a7af12b3998` (`lifecycleId`),
  UNIQUE KEY `IDX_b132226941570cb650a4023d49` (`authorizationId`),
  UNIQUE KEY `IDX_b0c80ccf319a1c7a7af12b3998` (`lifecycleId`),
  KEY `FK_339c1fe2a9c5caef5b982303fb0` (`communityId`),
  CONSTRAINT `FK_339c1fe2a9c5caef5b982303fb0` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b0c80ccf319a1c7a7af12b39987` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b132226941570cb650a4023d493` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invitation`
--

LOCK TABLES `invitation` WRITE;
/*!40000 ALTER TABLE `invitation` DISABLE KEYS */;
/*!40000 ALTER TABLE `invitation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `library`
--

DROP TABLE IF EXISTS `library`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `library` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_33333ccdda9ba57d8e3a634cd8` (`authorizationId`),
  CONSTRAINT `FK_33333901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `library`
--

LOCK TABLES `library` WRITE;
/*!40000 ALTER TABLE `library` DISABLE KEYS */;
INSERT INTO `library` VALUES ('299fda41-9a8a-40e5-a3cc-1287859fd1ac','2024-07-29 06:55:41.000000','2024-07-29 06:55:41.000000',1,'a79084d7-cee8-4bf7-9ca1-abb0b517329d');
/*!40000 ALTER TABLE `library` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `license_plan`
--

DROP TABLE IF EXISTS `license_plan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `license_plan` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` text NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `licensingId` char(36) DEFAULT NULL,
  `sortOrder` int NOT NULL DEFAULT (0),
  `pricePerMonth` decimal(10,2) DEFAULT NULL,
  `isFree` tinyint NOT NULL DEFAULT (0),
  `trialEnabled` tinyint NOT NULL DEFAULT (0),
  `requiresPaymentMethod` tinyint NOT NULL DEFAULT (0),
  `requiresContactSupport` tinyint NOT NULL DEFAULT (0),
  `licenseCredential` varchar(255) NOT NULL,
  `assignToNewOrganizationAccounts` tinyint NOT NULL DEFAULT '0',
  `assignToNewUserAccounts` tinyint NOT NULL DEFAULT '0',
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_42becb5fd6dc563f51ecb71abcc` (`licensingId`),
  CONSTRAINT `FK_42becb5fd6dc563f51ecb71abcc` FOREIGN KEY (`licensingId`) REFERENCES `licensing` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `license_plan`
--

LOCK TABLES `license_plan` WRITE;
/*!40000 ALTER TABLE `license_plan` DISABLE KEYS */;
INSERT INTO `license_plan` VALUES ('4844c14a-9c8e-45f7-a230-68d096f7cc3e','2024-07-29 09:55:48.197000','2024-07-29 06:55:49.284034',1,'PLUS',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',20,249.00,0,1,0,0,'license-space-plus',0,0,'space-plan'),('7715810d-91bd-475a-9067-c61ae90d40c2','2024-07-29 06:55:49.246594','2024-07-29 06:55:49.286732',1,'FEATURE_VIRTUAL_CONTRIBUTORS',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',70,0.00,1,0,0,1,'feature-virtual-contributors',0,1,'space-feature-flag'),('8afc4e64-73ae-477f-9db2-1d5f7def2257','2024-07-29 06:55:49.244621','2024-07-29 06:55:49.288429',1,'FEATURE_CALLOUT_TO_CALLOUT_TEMPLATE',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',60,0.00,1,0,0,1,'feature-callout-to-callout-template',1,1,'space-feature-flag'),('c934cdf7-7050-47c7-b2f2-d89bff90b14b','2024-07-29 09:55:48.202000','2024-07-29 06:55:49.290567',1,'ENTERPRISE',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',40,NULL,0,0,0,1,'license-space-enterprise',0,0,'space-plan'),('d1f5fb19-b7af-4044-95aa-c32ceabf405d','2024-07-29 06:55:49.242909','2024-07-29 06:55:49.291879',1,'FEATURE_WHITEBOARD_MULTI_USER',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',50,0.00,1,0,0,1,'feature-whiteboard-multi-user',0,0,'space-feature-flag'),('f20fc26f-875c-4f06-a79b-19bbb6d96322','2024-07-29 09:55:48.195000','2024-07-29 06:55:49.294457',1,'FREE',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',10,0.00,1,0,0,0,'license-space-free',1,1,'space-plan'),('f26c229f-b1b5-40ef-84bb-b2c51f654f89','2024-07-29 09:55:48.200000','2024-07-29 06:55:49.295980',1,'PREMIUM',1,'de54b5f4-d44d-4154-95fe-e11dcecc1ecd',30,749.00,0,0,0,1,'license-space-premium',0,0,'space-plan');
/*!40000 ALTER TABLE `license_plan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `license_policy`
--

DROP TABLE IF EXISTS `license_policy`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `license_policy` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `credentialRulesStr` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_23d4d78ea8db637df031f86f03` (`authorizationId`),
  CONSTRAINT `FK_23d4d78ea8db637df031f86f030` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `license_policy`
--

LOCK TABLES `license_policy` WRITE;
/*!40000 ALTER TABLE `license_policy` DISABLE KEYS */;
INSERT INTO `license_policy` VALUES ('b4cc400c-ae27-451f-9a93-cfb4bb151801','2024-07-29 06:55:46.610317','2024-07-29 06:55:49.259373',1,'55d20219-e2d5-45b8-badb-8bdbb9ed503b','[{\"credentialType\":\"feature-virtual-contributors\",\"grantedPrivileges\":[\"virtual-contributor-access\"],\"name\":\"Virtual Contributors\"},{\"credentialType\":\"feature-whiteboard-multi-user\",\"grantedPrivileges\":[\"whiteboard-multi-user\"],\"name\":\"Multi-user whiteboards\"},{\"credentialType\":\"feature-callout-to-callout-template\",\"grantedPrivileges\":[\"callout-save-as-template\"],\"name\":\"Callout templates\"}]');
/*!40000 ALTER TABLE `license_policy` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `licensing`
--

DROP TABLE IF EXISTS `licensing`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `licensing` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `licensePolicyId` char(36) DEFAULT NULL,
  `basePlanId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_1ddac8984c93ca18a23edb30fc` (`authorizationId`),
  UNIQUE KEY `REL_65ca04c85acdd5dad63f557609` (`licensePolicyId`),
  CONSTRAINT `FK_1ddac8984c93ca18a23edb30fc9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_65ca04c85acdd5dad63f5576094` FOREIGN KEY (`licensePolicyId`) REFERENCES `license_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `licensing`
--

LOCK TABLES `licensing` WRITE;
/*!40000 ALTER TABLE `licensing` DISABLE KEYS */;
INSERT INTO `licensing` VALUES ('de54b5f4-d44d-4154-95fe-e11dcecc1ecd','2024-07-29 06:55:47.332786','2024-07-29 06:55:48.248953',1,'135eb9e4-912b-4b22-9bf1-e8c5707d46fd','b4cc400c-ae27-451f-9a93-cfb4bb151801','f20fc26f-875c-4f06-a79b-19bbb6d96322');
/*!40000 ALTER TABLE `licensing` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lifecycle`
--

DROP TABLE IF EXISTS `lifecycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lifecycle` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `machineState` text,
  `machineDef` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lifecycle`
--

LOCK TABLES `lifecycle` WRITE;
/*!40000 ALTER TABLE `lifecycle` DISABLE KEYS */;
INSERT INTO `lifecycle` VALUES ('e45d303d-bd75-453b-bc03-e9e3f6c005f9','2024-07-29 06:56:02.775579','2024-07-29 06:56:02.775579',1,NULL,'{\"id\":\"organization-verification\",\"context\":{\"parentID\":\"a765bae9-8f69-4580-a278-0d2fe86ac76f\"},\"initial\":\"notVerified\",\"states\":{\"notVerified\":{\"on\":{\"VERIFICATION_REQUEST\":{\"target\":\"verificationPending\",\"cond\":\"organizationVerificationUpdateAuthorized\"}}},\"verificationPending\":{\"on\":{\"MANUALLY_VERIFY\":{\"target\":\"manuallyVerified\",\"cond\":\"organizationVerificationGrantAuthorized\"},\"REJECT\":\"rejected\"}},\"manuallyVerified\":{\"entry\":[\"organizationManuallyVerified\"],\"data\":{},\"on\":{\"RESET\":{\"target\":\"notVerified\",\"cond\":\"organizationVerificationGrantAuthorized\"}}},\"rejected\":{\"on\":{\"REOPEN\":\"notVerified\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}');
/*!40000 ALTER TABLE `lifecycle` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `link`
--

DROP TABLE IF EXISTS `link`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `link` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `uri` text NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_07f249ac87502495710a62c5c0` (`authorizationId`),
  UNIQUE KEY `REL_3bfc8c1aaec1395cc148268d3c` (`profileId`),
  CONSTRAINT `FK_07f249ac87502495710a62c5c01` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3bfc8c1aaec1395cc148268d3cd` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `link`
--

LOCK TABLES `link` WRITE;
/*!40000 ALTER TABLE `link` DISABLE KEYS */;
/*!40000 ALTER TABLE `link` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `location`
--

DROP TABLE IF EXISTS `location`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `location` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `city` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `addressLine1` varchar(128) NOT NULL DEFAULT '',
  `addressLine2` varchar(128) NOT NULL DEFAULT '',
  `stateOrProvince` varchar(128) NOT NULL DEFAULT '',
  `postalCode` varchar(128) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `location`
--

LOCK TABLES `location` WRITE;
/*!40000 ALTER TABLE `location` DISABLE KEYS */;
INSERT INTO `location` VALUES ('443d84e0-9174-447d-9e42-aec335a48ff9','2024-07-29 06:56:02.914180','2024-07-29 06:56:02.914180',1,'','','','','',''),('50920f61-9d61-44fc-b88a-4d116f288161','2024-07-29 06:56:02.977208','2024-07-29 06:56:02.977208',1,'','','','','',''),('5bc8adb2-5409-4208-9dbf-9489d17fa2a1','2024-07-29 06:56:03.077136','2024-07-29 06:56:03.077136',1,'','','','','',''),('6262a666-f99f-450d-9984-31a1a1ce817d','2024-07-29 06:56:02.885190','2024-07-29 06:56:02.885190',1,'','','','','',''),('b507a9ea-d87c-4e75-aee9-6b7059a9abcf','2024-07-29 06:56:02.853187','2024-07-29 06:56:02.853187',1,'','','','','',''),('c48455fb-4c0f-486d-967d-a3685af0c4b4','2024-07-29 06:56:02.715833','2024-07-29 06:56:02.715833',1,'','','','','',''),('d8438ade-e254-443e-8897-4d35180aa1b9','2024-07-29 07:40:04.031302','2024-07-29 07:40:04.031302',1,'','','','','',''),('e38d66fd-22d1-4426-979d-b154f651c8b2','2024-07-29 07:40:02.514919','2024-07-29 07:40:02.514919',1,'','','','','',''),('fa0ba2cd-d010-4b20-884f-075bff867f29','2024-07-29 06:56:02.945090','2024-07-29 06:56:02.945090',1,'','','','','','');
/*!40000 ALTER TABLE `location` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `migrations_typeorm`
--

DROP TABLE IF EXISTS `migrations_typeorm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations_typeorm` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` bigint NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations_typeorm`
--

LOCK TABLES `migrations_typeorm` WRITE;
/*!40000 ALTER TABLE `migrations_typeorm` DISABLE KEYS */;
INSERT INTO `migrations_typeorm` VALUES (1,1705618345186,'schemaSetup1705618345186'),(2,1705843901852,'addConstraints1705843901852'),(3,1707155838075,'linkProfile1707155838075'),(4,1707304590364,'linkEntity1707304590364'),(5,1708354354175,'whiteboardToRt1708354354175'),(6,1708769388221,'flowStates1708769388221'),(7,1709970166009,'account1709970166009'),(8,1710272553085,'calloutGroups1710272553085'),(9,1710305801060,'AddMissingRelationOnCallout1710305801060'),(10,1710670020390,'communityGuidelines1710670020390'),(11,1710843986344,'AddReleaseForumCategory1710843986344'),(12,1710843986354,'spaceSettings1710843986354'),(13,1711017129997,'AddMissingStorageBuckets1711017129997'),(14,1711636518883,'UpdateCommunityGuidelinesProfileRelationOptions1711636518883'),(15,1711636518886,'communityGuideliness1711636518886'),(16,1711636518888,'subspaces1711636518888'),(17,1712213355890,'virtual1712213355890'),(18,1712596874894,'addCommunicationIDToVirtualContributor1712596874894'),(19,1712597102891,'makePersonaIdNonUniqueVirtualContributor1712597102891'),(20,1712649061199,'journeyMerge1712649061199'),(21,1713255211876,'fixVcFeatureFlags1713255211876'),(22,1713264430226,'allCalloutsInRightColumn1713264430226'),(23,1713526131435,'SetDefaultAllowedMimeTypesAndMaxFileSize1713526131435'),(24,1714040354734,'moveCalloutsHome1714040354734'),(25,1714401683721,'accountHost1714401683721'),(26,1714410262128,'licensePolicy1714410262128'),(27,1715169195439,'fixSubspaceCalloutsGroupName1715169195439'),(28,1715169195500,'globalRoles1715169195500'),(29,1715575211966,'subspaceCredentials1715575211966'),(30,1715618480443,'communityGuidelinesTemplate1715618480443'),(31,1715661558908,'subspaceAdmin1715661558908'),(32,1715780931509,'fixPersonaEngines1715780931509'),(33,1715874015062,'subspaceInvitations1715874015062'),(34,1715936821326,'accountInnovationHub1715936821326'),(35,1715957704292,'agentAccount1715957704292'),(36,1716108478921,'licensing1716108478921'),(37,1716199897459,'updateVirtualPersona11716199897459'),(38,1716202782049,'updateVirtualContributor1716202782049'),(39,1716209492183,'updateVirtualPersonaEngineAndPlatform1716209492183'),(40,1716293512214,'plansTableColumns1716293512214'),(41,1716805934325,'communitPolicyParentCred1716805934325'),(42,1716810317354,'removeUserAccountHost1716810317354'),(43,1716831433146,'licensePlanAssignment1716831433146'),(44,1717058223813,'revertVirtualPersonaPrompt1717058223813'),(45,1717079559696,'optionalBodyOfKnowledge1717079559696'),(46,1717573360692,'increasePdfSize1717573360692'),(47,1717750717135,'extendMimeTypes1717750717135'),(48,1717751497484,'updateDocumentMimeTypeLength1717751497484'),(49,1718174556242,'invitationContributor1718174556242'),(50,1718174556250,'discussionPrivacy1718174556250'),(51,1718860939735,'aiServerSetup1718860939735'),(52,1719032308707,'forum1719032308707'),(53,1719038314268,'featureFlagsCredentials1719038314268'),(54,1719225622768,'licensePlanType1719225622768'),(55,1719225623900,'spaceTypeKnowledgeType1719225623900'),(56,1719225624444,'aiPersonaFields1719225624444'),(57,1719410254726,'generateFeatureFlagCredentials1719410254726'),(58,1719431685862,'platformInvitations1719431685862'),(59,1719487568442,'contributorCommunicationID1719487568442'),(60,1719550326418,'accountStorage1719550326418'),(61,1719859107990,'communityType1719859107990'),(62,1720510767439,'createInteraction1720510767439'),(63,1721140750386,'aiPersonaFields1721140750386'),(64,1721373372024,'genderUser1721373372024'),(65,1721649196399,'InnovationPacksAccount1721649196399'),(66,1721767553604,'VcStorage1721767553604'),(67,1721803817721,'LevelZeroSpaceID1721803817721'),(68,1721830892863,'SpaceVisibility1721830892863'),(69,1721897303394,'FixPhantomVCInvitations1721897303394');
/*!40000 ALTER TABLE `migrations_typeorm` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nvp`
--

DROP TABLE IF EXISTS `nvp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nvp` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `value` varchar(512) DEFAULT NULL,
  `sortOrder` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nvp`
--

LOCK TABLES `nvp` WRITE;
/*!40000 ALTER TABLE `nvp` DISABLE KEYS */;
/*!40000 ALTER TABLE `nvp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `opportunity`
--

DROP TABLE IF EXISTS `opportunity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `opportunity` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `contextId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `challengeId` char(36) DEFAULT NULL,
  `collaborationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  `accountId` char(36) DEFAULT NULL,
  `type` varchar(32) NOT NULL DEFAULT (_utf8mb4'opportunity'),
  `settingsStr` text NOT NULL,
  `level` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_e3b287bbffe59aba827d97d5fa` (`rowId`)
) ENGINE=InnoDB AUTO_INCREMENT=101 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity`
--

LOCK TABLES `opportunity` WRITE;
/*!40000 ALTER TABLE `opportunity` DISABLE KEYS */;
/*!40000 ALTER TABLE `opportunity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization`
--

DROP TABLE IF EXISTS `organization`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `legalEntityName` varchar(255) NOT NULL,
  `domain` varchar(255) NOT NULL,
  `website` varchar(255) NOT NULL,
  `contactEmail` varchar(255) NOT NULL,
  `verificationId` char(36) DEFAULT NULL,
  `preferenceSetId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  `communicationID` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_266bc44a18601f893566962df7` (`rowId`),
  UNIQUE KEY `IDX_9fdd8f0bfe04a676822c7265e1` (`rowId`),
  UNIQUE KEY `REL_badc07674ce4e44801e5a5f36c` (`authorizationId`),
  UNIQUE KEY `REL_037ba4b170844c039e74aa22ec` (`profileId`),
  UNIQUE KEY `REL_7671a7e33f6665764f4534a596` (`agentId`),
  UNIQUE KEY `IDX_95bbac07221e98072beafa6173` (`verificationId`),
  UNIQUE KEY `REL_95bbac07221e98072beafa6173` (`verificationId`),
  UNIQUE KEY `IDX_58fd47c4a6ac8df9fe2bcaed87` (`preferenceSetId`),
  UNIQUE KEY `IDX_e0e150e4f11d906b931b46a2d8` (`authorizationId`),
  UNIQUE KEY `IDX_d2cb77c14644156ec8e865608e` (`profileId`),
  UNIQUE KEY `IDX_7f1bec8979b57ed7ebd392a2ca` (`agentId`),
  UNIQUE KEY `IDX_5a72d5b37312bac2e0a0115718` (`verificationId`),
  UNIQUE KEY `IDX_395aa74996a1f978b4969d114b` (`storageAggregatorId`),
  KEY `FK_3334d59c0b805c9c1ecb0070e16` (`storageAggregatorId`),
  CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3334d59c0b805c9c1ecb0070e16` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7671a7e33f6665764f4534a5967` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_95bbac07221e98072beafa61732` FOREIGN KEY (`verificationId`) REFERENCES `organization_verification` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_c07b5b4c96fa89cb80215827668` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization`
--

LOCK TABLES `organization` WRITE;
/*!40000 ALTER TABLE `organization` DISABLE KEYS */;
INSERT INTO `organization` VALUES (72,'1d2b3361-abb3-4f2f-81b0-50a25d505278','2024-07-29 06:56:02.768809','2024-07-29 06:56:02.000000',2,'eco1host','08805537-feb7-45bb-ba68-663b9fa1f172','afb470a0-49ab-4136-9c6f-950d92b8e65f','59a49b11-e4a4-4998-9bcb-ceac65438dc8','','','','','a765bae9-8f69-4580-a278-0d2fe86ac76f','bbb3a409-833d-4c84-9c57-ad9e277dc4e6','3ab59d68-51b1-4e49-a536-f7fec038ebde','');
/*!40000 ALTER TABLE `organization` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organization_verification`
--

DROP TABLE IF EXISTS `organization_verification`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organization_verification` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `organizationID` char(36) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'not-verified',
  `authorizationId` char(36) DEFAULT NULL,
  `lifecycleId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_3795f9dd15ef3ef2dd1d27e309` (`authorizationId`),
  UNIQUE KEY `REL_22be0d440df7972d9b3a94aa6d` (`lifecycleId`),
  UNIQUE KEY `IDX_c66eddab0caacb1ef8d46bcafd` (`authorizationId`),
  UNIQUE KEY `IDX_1cc3b275fc2a9d9d9b0ae33b31` (`lifecycleId`),
  CONSTRAINT `FK_22be0d440df7972d9b3a94aa6d5` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3795f9dd15ef3ef2dd1d27e309c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organization_verification`
--

LOCK TABLES `organization_verification` WRITE;
/*!40000 ALTER TABLE `organization_verification` DISABLE KEYS */;
INSERT INTO `organization_verification` VALUES ('a765bae9-8f69-4580-a278-0d2fe86ac76f','2024-07-29 06:56:02.773170','2024-07-29 06:56:02.000000',2,'1d2b3361-abb3-4f2f-81b0-50a25d505278','not-verified','b73f41a4-f868-41b8-af7b-13ae119a4de1','e45d303d-bd75-453b-bc03-e9e3f6c005f9');
/*!40000 ALTER TABLE `organization_verification` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform`
--

DROP TABLE IF EXISTS `platform`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `libraryId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  `licensingId` char(36) DEFAULT NULL,
  `forumId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_44333ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `REL_f516dd9a46616999c7e9a6adc1` (`storageAggregatorId`),
  UNIQUE KEY `REL_ca469f5ec53a7719d155d60aca` (`libraryId`),
  UNIQUE KEY `IDX_1282e7fa19848d4b4bc3a4829d` (`licensingId`),
  UNIQUE KEY `REL_1282e7fa19848d4b4bc3a4829d` (`licensingId`),
  UNIQUE KEY `IDX_dd88d373c64b04e24705d575c9` (`forumId`),
  UNIQUE KEY `REL_dd88d373c64b04e24705d575c9` (`forumId`),
  CONSTRAINT `FK_1282e7fa19848d4b4bc3a4829db` FOREIGN KEY (`licensingId`) REFERENCES `licensing` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_44333901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_5554d59c0b805c9c1ecb0070e16` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ca469f5ec53a7719d155d60aca1` FOREIGN KEY (`libraryId`) REFERENCES `library` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_dd88d373c64b04e24705d575c99` FOREIGN KEY (`forumId`) REFERENCES `forum` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform`
--

LOCK TABLES `platform` WRITE;
/*!40000 ALTER TABLE `platform` DISABLE KEYS */;
INSERT INTO `platform` VALUES ('61ca1944-048d-4f94-975b-1acd33a25b62','2024-07-29 06:55:41.000000','2024-07-29 07:40:05.000000',2,'56f60443-a6cd-48ba-89e2-cf054d2a4cc6','299fda41-9a8a-40e5-a3cc-1287859fd1ac','24ff826e-64ed-4619-8d47-d9a9ea2e257c','de54b5f4-d44d-4154-95fe-e11dcecc1ecd','c6f1c61b-1158-40be-a05c-b6429b6e13b4');
/*!40000 ALTER TABLE `platform` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `platform_invitation`
--

DROP TABLE IF EXISTS `platform_invitation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `platform_invitation` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `firstName` varchar(255) DEFAULT NULL,
  `lastName` varchar(255) DEFAULT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `welcomeMessage` varchar(512) DEFAULT NULL,
  `profileCreated` tinyint NOT NULL DEFAULT '0',
  `authorizationId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  `communityInvitedToParent` tinyint NOT NULL DEFAULT '0',
  `platformId` char(36) DEFAULT NULL,
  `platformRole` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_42a7abc9f297ffcacb53087da8` (`authorizationId`),
  KEY `FK_2a985f774bd4de2a9aead6bd5b1` (`communityId`),
  KEY `FK_809c1e6cf3ef6be03a0a1db3f70` (`platformId`),
  CONSTRAINT `FK_2a985f774bd4de2a9aead6bd5b1` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_42a7abc9f297ffcacb53087da88` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_809c1e6cf3ef6be03a0a1db3f70` FOREIGN KEY (`platformId`) REFERENCES `platform` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `platform_invitation`
--

LOCK TABLES `platform_invitation` WRITE;
/*!40000 ALTER TABLE `platform_invitation` DISABLE KEYS */;
/*!40000 ALTER TABLE `platform_invitation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post`
--

DROP TABLE IF EXISTS `post`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `type` varchar(255) NOT NULL,
  `nameID` varchar(36) NOT NULL,
  `commentsId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_c52470717008d58ec6d76b12ff` (`authorizationId`),
  UNIQUE KEY `IDX_c4fb636888fc391cf1d7406e89` (`commentsId`),
  UNIQUE KEY `REL_c4fb636888fc391cf1d7406e89` (`commentsId`),
  UNIQUE KEY `IDX_67663901817dd09d5906537e088` (`profileId`),
  UNIQUE KEY `IDX_390343b22abec869bf80041933` (`authorizationId`),
  UNIQUE KEY `IDX_970844fcd10c2b6df7c1b49eac` (`profileId`),
  UNIQUE KEY `IDX_042b9825d770d6b3009ae206c2` (`commentsId`),
  KEY `FK_67663901817dd09d5906537e088` (`profileId`),
  CONSTRAINT `FK_00a8c330495ef844bfc6975ec89` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_67663901817dd09d5906537e088` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_c4fb636888fc391cf1d7406e891` FOREIGN KEY (`commentsId`) REFERENCES `room` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post`
--

LOCK TABLES `post` WRITE;
/*!40000 ALTER TABLE `post` DISABLE KEYS */;
/*!40000 ALTER TABLE `post` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `post_template`
--

DROP TABLE IF EXISTS `post_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `post_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `type` text NOT NULL,
  `defaultDescription` text NOT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_44447ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_c3bdb693adb031b6613edcef4f` (`authorizationId`),
  UNIQUE KEY `IDX_4a9c8cefc6c7e33aa728d22a90` (`profileId`),
  KEY `FK_66666450cf75dc486700ca034c6` (`templatesSetId`),
  KEY `FK_59991450cf75dc486700ca034c6` (`profileId`),
  CONSTRAINT `FK_44446901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_59991450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_66666450cf75dc486700ca034c6` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `post_template`
--

LOCK TABLES `post_template` WRITE;
/*!40000 ALTER TABLE `post_template` DISABLE KEYS */;
INSERT INTO `post_template` VALUES ('33f7f07d-d541-46a3-8149-833f07522692','2024-07-29 06:56:02.877919','2024-07-29 06:56:03.000000',2,'3e9bc807-81d0-4447-8a79-e00c06abc133','6e651e69-09d8-4744-887a-7aa9dab1dfc0','Meeting Notes','## 💭 Your meeting insights\n\n📅 **Date:**\n\n*Lets note the date of your interaction for context.*\n\n👥 **Present:**\n\n*Mention who attended or participated in the community activity.*\n\n📝 **Notes:**\n\n*Capture your observations or key takeaways from the community interaction.*\n\n🔁 **Next steps:**\n\n*Describe the specific actions or initiatives you plan to take based on the insights gained during the community interaction, propelling the community forward!*\n','bb3994ef-0195-4087-bbc6-248b491adaae'),('dae43ea3-8139-4124-8d8d-a8a15ea3f026','2024-07-29 06:56:02.909291','2024-07-29 06:56:03.000000',2,'3e9bc807-81d0-4447-8a79-e00c06abc133','499d859c-41f9-457d-9e95-8b6ef53c9c54','Related Initiative','👀 **Name of the related initiative**:\n\n*Name/title*\n\n🤝 **Description of the related initiative:**\n\n*Description*\n\n🗻 **Describe the relevane of the related initiative:**\n\n*Explore how these initiatives align with this initiative*\n\n✏️ **Additional information**\n\n*Provide any extra information or context relevant to the initiative*\n','f91992dc-9913-4014-b5bf-e080f1f3b757'),('fe2a2b9a-422c-495f-a30d-141a787a27f0','2024-07-29 06:56:02.938668','2024-07-29 06:56:03.000000',2,'3e9bc807-81d0-4447-8a79-e00c06abc133','ad9c93f8-aff7-4be9-a2cc-b1ff843457cd','Community Needs 👥','💬**What is blocking this space at the moment?**\n\n*Uncover the current challenges and obstacles that hinder progress in this space. What barriers are present, and how do they impact the community?*\n\n📢 **Describe your call to action**:\n\n*What steps can we take to address these challenges, and how can we overcome these obstacles?*\n\n📚 **Type of knowledge, expertise, and resources:**\n\n*Specify the types of knowledge, expertise, and resources needed to navigate and overcome the identified challenges*\n\n✏️ **Additional context:**\n\n*providing additional context*\n\nTogether, lets transform challenges into pportunities and propel this space forward! 🚀💪\n','f33193d1-19b4-437c-ad0e-de48a2bd56fa');
/*!40000 ALTER TABLE `post_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `preference`
--

DROP TABLE IF EXISTS `preference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preference` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `value` varchar(16) NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `preferenceDefinitionId` char(36) DEFAULT NULL,
  `preferenceSetId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_49030bc57aa0f319cee7996fca` (`authorizationId`),
  UNIQUE KEY `IDX_b4cf0f96bf08cf396f68355522` (`authorizationId`),
  KEY `FK_650fb4e564a8b4b4ac344270744` (`preferenceDefinitionId`),
  KEY `FK_88881fbd1fef95a0540f7e7d1e2` (`preferenceSetId`),
  CONSTRAINT `FK_49030bc57aa0f319cee7996fca1` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_650fb4e564a8b4b4ac344270744` FOREIGN KEY (`preferenceDefinitionId`) REFERENCES `preference_definition` (`id`),
  CONSTRAINT `FK_88881fbd1fef95a0540f7e7d1e2` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `preference`
--

LOCK TABLES `preference` WRITE;
/*!40000 ALTER TABLE `preference` DISABLE KEYS */;
INSERT INTO `preference` VALUES ('050091cc-eec8-48b6-b6e6-7cde4ed4a96e','2024-07-29 07:40:02.593675','2024-07-29 07:40:02.000000',2,'true','13686606-d7a2-4f4d-a162-ba0aa8856315','0055585c-1767-424b-9161-f20de51d6d36','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('0709f042-e406-4426-a05d-0ed6e1d5614d','2024-07-29 07:40:04.101021','2024-07-29 07:40:04.000000',2,'true','a04a94a8-33db-4932-b746-60eef16d2323','06c9686c-f22f-4263-8c71-84df259500c8','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('08d4b935-cd5f-4612-9c6d-fc5be3da662a','2024-07-29 07:40:04.148913','2024-07-29 07:40:04.000000',2,'false','f8c1415f-7763-4ab4-943a-576f3d42c141','b43709d0-5338-4fbc-af0a-81d85cb0e33d','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('08ecd8ef-5751-430b-9846-3073a7d3b0bd','2024-07-29 07:40:02.635187','2024-07-29 07:40:02.000000',2,'true','e623ebaa-261b-412c-8f97-a51e426dd18e','89a5e342-4069-41ec-b4ee-3d026790f6c4','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('099a27ce-38c3-4df7-94a3-06f69c3395f0','2024-07-29 07:40:02.632620','2024-07-29 07:40:02.000000',2,'false','c6827987-634c-476f-85a2-cb24edf7fcda','7bff48d9-2302-4ebf-a5f2-6f6a4bbed08a','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('0e40e590-3d3d-4f11-8745-450c3e9c6cb3','2024-07-29 07:40:02.656138','2024-07-29 07:40:02.000000',2,'true','9fe2a44c-618f-434c-bd82-84c25c36e565','b4da5f43-654a-499a-8587-387e344e297f','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('1304714c-0db6-4ee3-9036-4c9362ea7960','2024-07-29 07:40:04.176557','2024-07-29 07:40:04.000000',2,'true','37b8bfff-8091-424b-94ad-b86917c872b7','db06b4c3-6c7b-47c7-b99f-426be65c0d03','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('15712107-9adb-4f63-b7c8-8b740ed80cf7','2024-07-29 07:40:04.156812','2024-07-29 07:40:04.000000',2,'false','1bb1a07f-878c-450d-84ef-fb980db46a23','bb823dbd-cd0b-4713-9c72-5a30f6c4cb1d','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('17d2ec0a-edec-4bbf-8849-592d3049d715','2024-07-29 07:40:02.659557','2024-07-29 07:40:02.000000',2,'true','587d6901-eb8e-44d3-a06d-4e898a20482b','b8254407-3a17-4e7a-ad0a-d7909fde13b5','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('1ad4f8dd-f903-42d7-9d63-fdb523e6bec1','2024-07-29 07:40:02.685548','2024-07-29 07:40:02.000000',2,'true','e001cca7-2f73-474f-9cc2-ff7a42d77d12','db06b4c3-6c7b-47c7-b99f-426be65c0d03','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('1d4962ad-35c4-4351-974f-4a3a21af9e08','2024-07-29 07:40:04.136180','2024-07-29 07:40:04.000000',2,'true','613fb913-0ce8-43f2-aa9e-83d23c3f89e7','91c12f33-ebc0-43fa-8678-44be3a4b7921','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('3e4dc7d2-5bbd-456c-9398-e12729adbe50','2024-07-29 07:40:04.132793','2024-07-29 07:40:04.000000',2,'true','ee35f8fa-63b6-4014-93f8-5cd1cbc65b58','8fb0521f-7739-4cb6-a2dc-95b9cf3d12f2','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('3e79b7ee-f5ef-496d-a3f3-5ad1bcd53a7d','2024-07-29 07:40:04.165757','2024-07-29 07:40:04.000000',2,'true','9789d911-c21a-4008-9b0e-26b26fc09c7c','ce572724-86c3-4899-8a10-2414eb721c18','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('405523aa-5d91-401a-ac06-921344ea7b1a','2024-07-29 07:40:02.669973','2024-07-29 07:40:02.000000',2,'true','c80c9990-0aab-43b1-81f9-59b080154038','c10d6ebb-08e8-4fcf-80f8-105171db9a15','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('482a17ca-84d0-42ca-9acb-db99a07ded78','2024-07-29 07:40:02.639906','2024-07-29 07:40:02.000000',2,'true','55ac66c3-bd0e-4387-8e08-6c751a117bfd','91c12f33-ebc0-43fa-8678-44be3a4b7921','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('4b7e13ac-5dec-4353-9204-bb8cce8e84da','2024-07-29 07:40:02.679846','2024-07-29 07:40:02.000000',2,'true','d570cbc2-0c6a-4335-b823-cd6e7285f4e1','d394d1ac-b76f-43c1-9e39-e3c141c8fd96','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('5665cf20-dfbe-4f60-93f7-71be8ec77453','2024-07-29 07:40:04.124454','2024-07-29 07:40:04.000000',2,'false','5ee3b866-f3cf-4677-9516-842bd393f7ff','79040528-873e-481c-8ae4-0b2efe0c7819','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('58bc737c-ea5d-40f9-b650-c7740976423d','2024-07-29 07:40:04.092864','2024-07-29 07:40:04.000000',2,'true','c88e7d4f-bc1f-4650-94ac-3adbddf37c2d','01f0bd5a-7087-470a-ae59-ecbadd6822c0','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('61305906-f1eb-4c3d-8849-c5801d9d0249','2024-07-29 07:40:04.096317','2024-07-29 07:40:04.000000',2,'true','02fa5327-6dbe-42eb-8fb1-465dd136958e','02b56edf-5050-49fd-822c-e5b51347d0a3','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('618a1e8e-af4c-4ed5-be61-897643c51350','2024-07-29 07:40:04.127297','2024-07-29 07:40:04.000000',2,'false','0dda51a2-98c6-4b97-9ee9-ca6c68f36d3c','7bff48d9-2302-4ebf-a5f2-6f6a4bbed08a','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('626bfb80-91a7-4711-adb9-1060b318f2b8','2024-07-29 07:40:02.617992','2024-07-29 07:40:02.000000',2,'true','d3a6ae66-3223-417f-9217-66050bb28d70','69962f3d-fb3f-418b-a8ee-276c28ac09ce','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('62a5f5a5-887c-4872-bd48-2971e4d2104c','2024-07-29 07:40:02.646003','2024-07-29 07:40:02.000000',2,'true','48466486-6cba-435b-832b-d616a94ffcb5','9de2fa3b-3c0b-42c4-86fc-408349114f9d','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('6395e840-e1e3-42ff-8611-c478b47e9298','2024-07-29 07:40:04.129929','2024-07-29 07:40:04.000000',2,'true','25c657b4-cf0a-4458-899f-1e472efe8ddd','89a5e342-4069-41ec-b4ee-3d026790f6c4','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('7bbc0e35-5c55-43ff-8d35-b5cc7b374740','2024-07-29 07:40:04.140544','2024-07-29 07:40:04.000000',2,'false','28a5cd66-0fc4-4411-b791-305d1c84253b','9a3d5f92-b1f6-4800-8b71-51912831251a','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('7c4ba543-d664-45be-a52b-e08f3a2f4bfe','2024-07-29 07:40:04.114099','2024-07-29 07:40:04.000000',2,'false','fb30a0f0-ee1f-4761-9213-2b85cd3ea175','69dd6af1-cd9f-49bd-b743-4157feb0872f','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('82caa259-36fb-4ac8-b7a3-9eb8829a928a','2024-07-29 07:40:02.599636','2024-07-29 07:40:02.000000',2,'true','9c66efac-3d8e-4805-b1b2-27828767e161','01f0bd5a-7087-470a-ae59-ecbadd6822c0','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('834f5842-ec98-4866-aaee-5e7a2a839261','2024-07-29 07:40:02.690778','2024-07-29 07:40:02.000000',2,'false','980b2b26-ba8c-4b9c-bce7-0e6127ea6813','ed7df179-303c-4609-9036-afab2f8abfa5','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('84ef5683-1f66-43df-b7df-dc63f44c81fd','2024-07-29 07:40:02.630316','2024-07-29 07:40:02.000000',2,'false','939ebbfb-3b2b-43a1-ba08-684b25457e1f','79040528-873e-481c-8ae4-0b2efe0c7819','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('95f7000b-9e45-4f68-90b8-d154db3c74d9','2024-07-29 07:40:02.614566','2024-07-29 07:40:02.000000',2,'true','4360faba-e5d0-48bb-a373-affd0dc73cb2','56d173b9-a9f6-4d1e-a263-858b0a175013','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('aeb39fd2-e59b-4a21-969f-bf96a5ec04e5','2024-07-29 07:40:02.652308','2024-07-29 07:40:02.000000',2,'false','63541aa3-fca4-4e13-94d0-f1b83bb39987','b43709d0-5338-4fbc-af0a-81d85cb0e33d','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('afde0dae-ef38-4d4d-b834-708d3f76d920','2024-07-29 07:40:04.188277','2024-07-29 07:40:04.000000',2,'true','180de984-453a-4b66-87d0-ee8f50565de0','f348973e-7a29-4239-b840-5c1948a98446','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('aff5d0aa-4782-49aa-9792-536a3fc4a314','2024-07-29 07:40:02.696559','2024-07-29 07:40:02.000000',2,'true','2c124f20-6031-4107-9917-9c925056db2a','f348973e-7a29-4239-b840-5c1948a98446','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('b23d41ce-b071-49cd-845f-6caf753959ae','2024-07-29 07:40:04.111270','2024-07-29 07:40:04.000000',2,'true','a1a5c86f-25b2-49a5-96ea-1ae30959fe89','69962f3d-fb3f-418b-a8ee-276c28ac09ce','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('b64abf60-7f83-4a53-8bdd-ec015f5035c5','2024-07-29 07:40:04.117152','2024-07-29 07:40:04.000000',2,'true','ab1be623-87ff-4967-8a36-e19ae114c150','767d856c-f154-4474-9143-150e291880a9','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('b77b2737-eef5-4842-bda3-6a4e7cd87175','2024-07-29 07:40:04.160378','2024-07-29 07:40:04.000000',2,'true','d6a7bd09-91ca-45a5-b4e0-03ae824b1826','c10d6ebb-08e8-4fcf-80f8-105171db9a15','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('b86c6515-2a25-474b-8c82-8ace45050fa3','2024-07-29 06:56:02.780354','2024-07-29 06:56:02.000000',2,'false','07cd84c9-6e71-443a-aeed-dd0ff8fae940','9923d612-00e2-417b-ab19-6392fde7d45c','bbb3a409-833d-4c84-9c57-ad9e277dc4e6'),('b88fd0c0-b121-4549-bcf3-41e51d4f9871','2024-07-29 07:40:02.621967','2024-07-29 07:40:02.000000',2,'false','30a9a741-23f6-419d-869d-72de3c320fdf','69dd6af1-cd9f-49bd-b743-4157feb0872f','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('bb11fb9e-fdb0-49ca-ba78-c7433e6d7947','2024-07-29 07:40:02.627052','2024-07-29 07:40:02.000000',2,'false','be805f78-a9f8-4037-b831-c498f47dabde','76abb26c-4eea-43d5-b261-cc072df5efda','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('bca765c3-4c43-440c-b9dd-5a89942812e0','2024-07-29 07:40:04.151527','2024-07-29 07:40:04.000000',2,'true','2c942375-8379-4959-a0be-50efc474bf33','b4da5f43-654a-499a-8587-387e344e297f','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('bd484fe3-d2ac-476b-8a8a-df44d2cefca5','2024-07-29 07:40:04.170082','2024-07-29 07:40:04.000000',2,'true','f3a64e07-a388-4851-bfde-658d501d2008','d394d1ac-b76f-43c1-9e39-e3c141c8fd96','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('c6be10e2-9ab6-4fe0-bfbc-5374e61a24dd','2024-07-29 07:40:04.105329','2024-07-29 07:40:04.000000',2,'true','c85346a6-789d-426c-b91a-b962e3a1259b','38910487-290b-457f-a1eb-f355dd6923fb','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('c753e914-c6ed-41af-8de5-811cd19da000','2024-07-29 07:40:02.603251','2024-07-29 07:40:02.000000',2,'true','363a409d-d8c6-4603-8c28-e879df4e2576','02b56edf-5050-49fd-822c-e5b51347d0a3','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('c9d79527-eacd-4c58-9fc0-c499a8bafc59','2024-07-29 07:40:04.182400','2024-07-29 07:40:04.000000',2,'false','ba647693-1581-49cf-aa79-a36404e40415','ed7df179-303c-4609-9036-afab2f8abfa5','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('cb5bcb4b-f832-4784-a883-5a60c1f5fab2','2024-07-29 07:40:04.143339','2024-07-29 07:40:04.000000',2,'true','98497ab4-1ee8-428c-a8de-162f81003987','9de2fa3b-3c0b-42c4-86fc-408349114f9d','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('cbc08458-d00c-4dc6-a5ea-755507b8c1a7','2024-07-29 07:40:02.606828','2024-07-29 07:40:02.000000',2,'true','0acc50f6-b2b0-427b-be5e-86ba19311239','06c9686c-f22f-4263-8c71-84df259500c8','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('cc48cc21-fc59-4cd6-bb75-d55d6ac479b5','2024-07-29 07:40:04.089619','2024-07-29 07:40:04.000000',2,'true','bcc7fd2c-52bd-4e82-bfbd-e8fe0bccdc48','0055585c-1767-424b-9161-f20de51d6d36','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('d2a01072-15bb-46ca-81a6-324d0d16aa7f','2024-07-29 07:40:02.648413','2024-07-29 07:40:02.000000',2,'true','0fcbfa6e-a7ea-49ba-a616-7a934673233d','a41235a3-6e02-4ac1-967b-bda171c4e562','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('d3ca071a-76a6-4c2a-946f-896fb85e3fd6','2024-07-29 07:40:02.624676','2024-07-29 07:40:02.000000',2,'true','7d21fc8d-07b8-49d4-8690-b024ead1d8d1','767d856c-f154-4474-9143-150e291880a9','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('d96027bf-bf80-43a6-b593-6560573a6ad8','2024-07-29 07:40:02.674962','2024-07-29 07:40:02.000000',2,'true','df3a160b-9486-4360-8a31-0081900dea89','ce572724-86c3-4899-8a10-2414eb721c18','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('e2a54f58-d3b2-43fe-a40f-2bd63fa7e98f','2024-07-29 07:40:04.145954','2024-07-29 07:40:04.000000',2,'true','9b00e4b2-907a-4078-a5a0-390df5ec9a2b','a41235a3-6e02-4ac1-967b-bda171c4e562','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('e7592560-ee97-4379-8724-7376a6b49152','2024-07-29 07:40:02.663913','2024-07-29 07:40:02.000000',2,'false','0df36442-e185-4a0c-88e5-c24023f3de82','bb823dbd-cd0b-4713-9c72-5a30f6c4cb1d','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('e77ddd52-afe3-43ec-937f-212c2cd2162b','2024-07-29 07:40:02.637666','2024-07-29 07:40:02.000000',2,'true','1900663f-1463-46d9-9e97-278a4453a5ea','8fb0521f-7739-4cb6-a2dc-95b9cf3d12f2','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('ea766ada-38b1-49f8-a095-c2eda814b304','2024-07-29 07:40:04.108643','2024-07-29 07:40:04.000000',2,'true','516d8429-0b93-4bcf-a860-f3bf56440e11','56d173b9-a9f6-4d1e-a263-858b0a175013','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('f9f33be5-d3a8-447c-8f6e-fec10ab8e1ae','2024-07-29 07:40:02.611100','2024-07-29 07:40:02.000000',2,'true','7302637c-05d2-4099-a829-124ca8e79115','38910487-290b-457f-a1eb-f355dd6923fb','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('fb5ff12d-6c50-4489-b5ea-6df1f33a4680','2024-07-29 07:40:02.643208','2024-07-29 07:40:02.000000',2,'false','ede79031-920a-4f7b-9b12-6b15da461b8b','9a3d5f92-b1f6-4800-8b71-51912831251a','45bdf3c6-7599-448f-bc68-f54c645ec0d5'),('fbfecefc-38e9-49ac-a795-e0bfd4f6012c','2024-07-29 07:40:04.154096','2024-07-29 07:40:04.000000',2,'true','d0385eab-8d51-4767-80e6-926bd403a133','b8254407-3a17-4e7a-ad0a-d7909fde13b5','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080'),('ff003c31-5180-4806-8e07-3890c4862f58','2024-07-29 07:40:04.120845','2024-07-29 07:40:04.000000',2,'false','7c219403-8431-4306-af33-0e4cf0816955','76abb26c-4eea-43d5-b261-cc072df5efda','7e0a3bc5-3249-4b97-a2db-19b6f6bb5080');
/*!40000 ALTER TABLE `preference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `preference_definition`
--

DROP TABLE IF EXISTS `preference_definition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preference_definition` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `groupName` varchar(128) NOT NULL,
  `displayName` varchar(128) NOT NULL,
  `description` varchar(255) NOT NULL,
  `valueType` varchar(16) NOT NULL,
  `type` varchar(128) NOT NULL,
  `definitionSet` varchar(128) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `preference_definition`
--

LOCK TABLES `preference_definition` WRITE;
/*!40000 ALTER TABLE `preference_definition` DISABLE KEYS */;
INSERT INTO `preference_definition` VALUES ('0055585c-1767-424b-9161-f20de51d6d36','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Invitations to a community','Receive a notification when someone invites you to join a community','boolean','NotificationCommunityInvitationUser','user'),('01f0bd5a-7087-470a-ae59-ecbadd6822c0','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunication','Allow direct messages from other users','Receive a notification when a user wants to directly send you a message or shares with you','boolean','NotificationCommunicationMessage','user'),('02b56edf-5050-49fd-822c-e5b51347d0a3','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','New Whiteboard created','Receive a notification when a Whiteboard is created in a community I am a member of','boolean','NotificationWhiteboardCreated','user'),('06c9686c-f22f-4263-8c71-84df259500c8','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','New comment on my Post','Receive notification when a comment is created on my Post','boolean','NotificationPostCommentCreated','user'),('38910487-290b-457f-a1eb-f355dd6923fb','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Comment replies','Receive a notification when someone replies to your comment','boolean','NotificationCommentReply','user'),('56d173b9-a9f6-4d1e-a263-858b0a175013','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationOrganizationAdmin','Mentions or tags of an organization you manage','Receive a notification when the organization you are admin of is mentioned','boolean','NotificationOrganizationMention','user'),('69962f3d-fb3f-418b-a8ee-276c28ac09ce','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] New opportunity collaboration interest','Receive notification when a user submits collaboration interest for an opportunity community I am administrator of','boolean','NotificationCommunityCollaborationInterestAdmin','user'),('69dd6af1-cd9f-49bd-b743-4157feb0872f','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationGlobalAdmin','[Admin] User profile deleted','Receive a notification when a user profile is removed','boolean','NotificationUserRemoved','user'),('767d856c-f154-4474-9143-150e291880a9','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] Community Updates','Receive notification when a new update is shared with a community for which I am an administrator','boolean','NotificationCommunityUpdateSentAdmin','user'),('76abb26c-4eea-43d5-b261-cc072df5efda','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Community review submitted','Receive notification when you submit a new community review','boolean','NotificationCommunityReviewSubmitted','user'),('79040528-873e-481c-8ae4-0b2efe0c7819','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','New comment on Discssion','Receive a notification when a new comment is added to a Discussion in a community I am a member of','boolean','NotificationDiscussionCommentCreated','user'),('7bff48d9-2302-4ebf-a5f2-6f6a4bbed08a','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationForum','Receive a notification when a new Discussion is created in the Forum','Receive a notification when a new Discussion is created in the Forum','boolean','NotificationForumDiscussionCreated','user'),('89a5e342-4069-41ec-b4ee-3d026790f6c4','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] Community Applications','Receive notification when a new application is received for a community for which I am an administrator','boolean','NotificationApplicationReceived','user'),('8fb0521f-7739-4cb6-a2dc-95b9cf3d12f2','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationForum','Receive a notification when a new comment is added to a Discussion I created in the Forum','Receive a notification when a new comment is added to a Discussion I created in the Forum','boolean','NotificationForumDiscussionComment','user'),('91c12f33-ebc0-43fa-8678-44be3a4b7921','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] Community Discussion Created','Receive notification when a new discussion is created for a community for which I am an administrator','boolean','NotificationCommunityDiscussionCreatedAdmin','user'),('9923d612-00e2-417b-ab19-6392fde7d45c','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'AuthorizationOrganization','Domain based membership','Automatically add new users with emails matching the domain of the Organization','boolean','AuthorizationOrganizationMatchDomain','organization'),('9a3d5f92-b1f6-4800-8b71-51912831251a','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] Community review submitted','Receive notification when a new community review is submitted by a member','boolean','NotificationCommunityReviewSubmittedAdmin','user'),('9de2fa3b-3c0b-42c4-86fc-408349114f9d','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','New Callout published','Receive a notification when a Callout is published in a community I am a member of','boolean','NotificationCalloutPublished','user'),('a41235a3-6e02-4ac1-967b-bda171c4e562','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Community Updates','Receive notification when a new update is shared with a community I am a member of','boolean','NotificationCommunityUpdates','user'),('b43709d0-5338-4fbc-af0a-81d85cb0e33d','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Community new member','Receiver notification when I join a community','boolean','NotificationCommunityNewMember','user'),('b4da5f43-654a-499a-8587-387e344e297f','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','New Post created','Receive notification when an Post is created in community i am a member of','boolean','NotificationPostCreated','user'),('b8254407-3a17-4e7a-ad0a-d7909fde13b5','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] New Post created','Receive notification when an Post is created in a community I am administrator of','boolean','NotificationPostCreatedAdmin','user'),('bb823dbd-cd0b-4713-9c72-5a30f6c4cb1d','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunityAdmin','[Admin] Community new member','Receiver notification when a new user joins a community for which I am an administrator','boolean','NotificationCommunityNewMemberAdmin','user'),('c10d6ebb-08e8-4fcf-80f8-105171db9a15','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Community Application','Receive notification when I apply to join a community','boolean','NotificationApplicationSubmitted','user'),('ce572724-86c3-4899-8a10-2414eb721c18','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Community Discussion created','Receive notification when a new discussion is created on a community I am a member of','boolean','NotificationCommunityDiscussionCreated','user'),('d394d1ac-b76f-43c1-9e39-e3c141c8fd96','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationOrganizationAdmin','Allow direct messages to organizations you manage','Receive notification when the organization you are admin of is messaged','boolean','NotificationOrganizationMessage','user'),('db06b4c3-6c7b-47c7-b99f-426be65c0d03','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'Notification','Opportunity collaboration interest confirmation','User receives confirmation email when submits interest for collaboration on an opportunity.','boolean','NotificationCommunityCollaborationInterestUser','user'),('ed7df179-303c-4609-9036-afab2f8abfa5','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationGlobalAdmin','[Admin] New user sign up','Receive notification when a new user signs up','boolean','NotificationUserSignUp','user'),('f348973e-7a29-4239-b840-5c1948a98446','2024-07-29 06:55:41.413009','2024-07-29 06:55:41.413009',1,'NotificationCommunication','Mentions or tags of you in posts or comments','Receive a notification when a user tags you in a post or a comment','boolean','NotificationCommunicationMention','user');
/*!40000 ALTER TABLE `preference_definition` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `preference_set`
--

DROP TABLE IF EXISTS `preference_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preference_set` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_8888dccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_8e76dcf171c45875c44febb1d8` (`authorizationId`),
  CONSTRAINT `FK_88885901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `preference_set`
--

LOCK TABLES `preference_set` WRITE;
/*!40000 ALTER TABLE `preference_set` DISABLE KEYS */;
INSERT INTO `preference_set` VALUES ('45bdf3c6-7599-448f-bc68-f54c645ec0d5','2024-07-29 07:40:02.720308','2024-07-29 07:40:02.720308',1,'9d219c2a-04fd-4c6a-becd-3087b600ef28'),('7e0a3bc5-3249-4b97-a2db-19b6f6bb5080','2024-07-29 07:40:04.204119','2024-07-29 07:40:04.204119',1,'23d3a057-378b-4eb4-a563-fee0a2e60485'),('bbb3a409-833d-4c84-9c57-ad9e277dc4e6','2024-07-29 06:56:02.790547','2024-07-29 06:56:02.790547',1,'8d2aeb31-143f-4851-b908-39477283b926');
/*!40000 ALTER TABLE `preference_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile`
--

DROP TABLE IF EXISTS `profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `description` text,
  `authorizationId` char(36) DEFAULT NULL,
  `locationId` char(36) DEFAULT NULL,
  `displayName` text NOT NULL,
  `tagline` varchar(255) DEFAULT NULL,
  `storageBucketId` char(36) DEFAULT NULL,
  `type` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a96475631aba7dce41db03cc8b` (`authorizationId`),
  UNIQUE KEY `IDX_77777ca8ac212b8357637794d6` (`locationId`),
  UNIQUE KEY `IDX_4a1c74fd2a61b32d9d9500e065` (`storageBucketId`),
  UNIQUE KEY `REL_4a1c74fd2a61b32d9d9500e065` (`storageBucketId`),
  UNIQUE KEY `IDX_432056041df0e4337b17ff7b09` (`locationId`),
  CONSTRAINT `FK_4a1c74fd2a61b32d9d9500e0650` FOREIGN KEY (`storageBucketId`) REFERENCES `storage_bucket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_77777ca8ac212b8357637794d6f` FOREIGN KEY (`locationId`) REFERENCES `location` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile`
--

LOCK TABLES `profile` WRITE;
/*!40000 ALTER TABLE `profile` DISABLE KEYS */;
INSERT INTO `profile` VALUES ('08fc3de3-a979-4ed6-8e33-f0ad43b9de66','2024-07-29 07:40:02.541039','2024-07-29 07:40:02.541039',1,'','69aafb53-dc04-4a86-a0b2-67ea28a7550a','e38d66fd-22d1-4426-979d-b154f651c8b2','admin alkemio','','3a0ec190-bef3-4b5a-a4f3-a4371df08961','user'),('41506117-578c-4234-8472-34d9341475b8','2024-07-29 06:56:02.950480','2024-07-29 06:56:02.950480',1,'Default innovationFlow','03e1aab2-9e98-48a6-94bd-59462daccab6','fa0ba2cd-d010-4b20-884f-075bff867f29','Default innovationFlow','','185fe8c2-2881-43ca-9aa6-58bf45d6a1ba','innovation-flow-template'),('55056e74-7096-4d1b-bf27-2c6db2c7fc28','2024-07-29 07:40:04.045284','2024-07-29 07:40:04.045284',1,'','a00dd523-c6c6-4acf-ac97-dc0cc51579ae','d8438ade-e254-443e-8897-4d35180aa1b9','notifications admin','','8886c371-c79e-43ad-adf8-5e2a81a83ccb','user'),('afb470a0-49ab-4136-9c6f-950d92b8e65f','2024-07-29 06:56:02.721292','2024-07-29 06:56:02.721292',1,'','6604bfa8-1232-4fc4-810e-4fae37718c49','c48455fb-4c0f-486d-967d-a3685af0c4b4','Eco1 Host','','80971340-0bd5-4253-ae6f-e6728dec6bc8','organization'),('bb3994ef-0195-4087-bbc6-248b491adaae','2024-07-29 06:56:02.859332','2024-07-29 06:56:02.859332',1,'A sample post template for capturing the **results of meetings** is a structured format designed to efficiently document key outcomes, decisions, and 👉 action items from a meeting. This template provides a systematic approach to ensure that important information is recorded comprehensively and can be easily referenced later. 📝\n','2ec80a70-5b22-4a12-8615-fefa6ff0913d','b507a9ea-d87c-4e75-aee9-6b7059a9abcf','📝 Meeting Notes','','265d801b-3224-4594-9e0a-d4d96cfce6b2','post-template'),('eb1e70dd-2b1a-41be-b894-211da23c6413','2024-07-29 06:56:02.981142','2024-07-29 06:56:02.981142',1,'This flow helps you to quickly structure your Challenge when using it for Coordination purposes','e05e321f-69d2-4c4b-bbb6-39c9db58457a','50920f61-9d61-44fc-b88a-4d116f288161','Coordination Flow','','f918d774-1310-4fa0-b14f-82b1db772ab2','innovation-flow-template'),('f33193d1-19b4-437c-ad0e-de48a2bd56fa','2024-07-29 06:56:02.917329','2024-07-29 06:56:02.917329',1,'Progress needs people and so do we! Gather the knowledge, activities or other blockers that are needed to start making impact by using this template. Ask people if they are you someone that can help you or if they know someone who can !💬\n\nTogether, transform challenges into opportunities and propel your space forward! 🚀💪\n','70f62c6b-2267-4cef-8c9e-699f9ebb334d','443d84e0-9174-447d-9e42-aec335a48ff9','Community Needs 👥','','d1aa51c8-3b1e-4802-acee-1f09e2c3ad55','post-template'),('f91992dc-9913-4014-b5bf-e080f1f3b757','2024-07-29 06:56:02.889825','2024-07-29 06:56:02.889825',1,'Utilize this template to collect information about other **relevant initiatives**. Whether they are similar in nature, provide support, or simply need to be acknowledged, this template helps you keep track of them.\n','8cdf8b9f-ae83-426c-be7f-7544748d9b58','6262a666-f99f-450d-9984-31a1a1ce817d','👀 Related Initiative','','6ef1ee92-ce55-4793-8434-260f702faefe','post-template'),('fceeed91-69c5-4c94-a114-4af6deab9594','2024-07-29 06:56:03.081452','2024-07-29 06:56:03.081452',1,'','c55df1f9-f0fe-4a7a-a037-e160cf984c54','5bc8adb2-5409-4208-9dbf-9489d17fa2a1','Default Space','','c68ea459-90cf-40d1-9ef5-4e40e0c1b3a8','community-guidelines');
/*!40000 ALTER TABLE `profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `query-result-cache`
--

DROP TABLE IF EXISTS `query-result-cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `query-result-cache` (
  `id` int NOT NULL AUTO_INCREMENT,
  `identifier` varchar(255) DEFAULT NULL,
  `time` bigint NOT NULL,
  `duration` int NOT NULL,
  `query` text NOT NULL,
  `result` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `query-result-cache`
--

LOCK TABLES `query-result-cache` WRITE;
/*!40000 ALTER TABLE `query-result-cache` DISABLE KEYS */;
/*!40000 ALTER TABLE `query-result-cache` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reference`
--

DROP TABLE IF EXISTS `reference`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reference` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `uri` text NOT NULL,
  `description` text,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_73e8ae665a49366ca7e2866a45` (`authorizationId`),
  KEY `FK_2f46c698fc4c19a8cc233c5f255` (`profileId`),
  CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reference`
--

LOCK TABLES `reference` WRITE;
/*!40000 ALTER TABLE `reference` DISABLE KEYS */;
INSERT INTO `reference` VALUES ('0f23a240-d6af-48a3-8f73-e2007564ebf2','2024-07-29 07:40:04.034525','2024-07-29 07:40:04.000000',2,'linkedin','','User profile on LinkedIn','80c51a35-afcd-4db1-993d-86b9c581f5c2','55056e74-7096-4d1b-bf27-2c6db2c7fc28'),('3dc23a36-334b-4085-b7f4-6a4cd02fa602','2024-07-29 07:40:02.529132','2024-07-29 07:40:02.000000',2,'github','','User profile on GitSpace','555f09dd-1bf0-4895-a830-f7b7b6e9c3e4','08fc3de3-a979-4ed6-8e33-f0ad43b9de66'),('49d027c7-a6fd-409f-9690-9dc9028bd9fa','2024-07-29 07:40:02.522932','2024-07-29 07:40:02.000000',2,'linkedin','','User profile on LinkedIn','0dc95fe9-8ea2-4eb3-a015-d1a1654c9550','08fc3de3-a979-4ed6-8e33-f0ad43b9de66'),('658e003d-75b2-4813-8c7f-11a631c79231','2024-07-29 07:40:04.040391','2024-07-29 07:40:04.000000',2,'twitter','','User profile on Twitter','37c7a41f-6a1c-495c-a040-7ff1c06f1a72','55056e74-7096-4d1b-bf27-2c6db2c7fc28'),('71af524f-4465-49e5-b11f-efee8a03dbea','2024-07-29 07:40:04.037511','2024-07-29 07:40:04.000000',2,'github','','User profile on GitSpace','110e459c-ec8d-4a79-b0e6-3276e2697893','55056e74-7096-4d1b-bf27-2c6db2c7fc28'),('cc29bbe2-f997-418d-8a24-d416bba22c1f','2024-07-29 07:40:02.533779','2024-07-29 07:40:02.000000',2,'twitter','','User profile on Twitter','ccae1722-1b6f-480d-b354-006c3630f889','08fc3de3-a979-4ed6-8e33-f0ad43b9de66');
/*!40000 ALTER TABLE `reference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relation`
--

DROP TABLE IF EXISTS `relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `relation` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `type` varchar(255) NOT NULL,
  `actorName` varchar(255) NOT NULL,
  `actorType` varchar(255) NOT NULL,
  `actorRole` varchar(255) NOT NULL,
  `description` text,
  `authorizationId` char(36) DEFAULT NULL,
  `collaborationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_53fccd56207915b969b91834e0` (`authorizationId`),
  KEY `FK_701a6f8e3e1da76354571767c3f` (`collaborationId`),
  CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_701a6f8e3e1da76354571767c3f` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relation`
--

LOCK TABLES `relation` WRITE;
/*!40000 ALTER TABLE `relation` DISABLE KEYS */;
/*!40000 ALTER TABLE `relation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `room`
--

DROP TABLE IF EXISTS `room`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `room` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `externalRoomID` varchar(255) NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `messagesCount` int NOT NULL,
  `type` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_7777dccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_d1d94dd8e0c417b4188a05ccbc` (`authorizationId`),
  CONSTRAINT `FK_77775901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `room`
--

LOCK TABLES `room` WRITE;
/*!40000 ALTER TABLE `room` DISABLE KEYS */;
/*!40000 ALTER TABLE `room` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `space`
--

DROP TABLE IF EXISTS `space`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `space` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `contextId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `collaborationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  `accountId` char(36) DEFAULT NULL,
  `type` varchar(32) NOT NULL DEFAULT (_utf8mb4'space'),
  `settingsStr` text NOT NULL,
  `level` int NOT NULL,
  `parentSpaceId` char(36) DEFAULT NULL,
  `levelZeroSpaceID` char(36) DEFAULT NULL,
  `visibility` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_0f03c61020ea0dfa0198c60304` (`rowId`),
  UNIQUE KEY `REL_17a161eef37c9f07186532ab75` (`authorizationId`),
  UNIQUE KEY `REL_6db8627abbf00b1b986e359054` (`contextId`),
  UNIQUE KEY `REL_f5ad15bcb06a95c2a109fbcce2` (`communityId`),
  UNIQUE KEY `REL_b0c3f360534db92017e36a00bb` (`agentId`),
  UNIQUE KEY `IDX_6325f4ef25c4e07e723a96ed37` (`collaborationId`),
  UNIQUE KEY `IDX_8d03fd2c8e8411ec9192c79cd9` (`authorizationId`),
  UNIQUE KEY `IDX_b4250035291aac1329d59224a9` (`profileId`),
  UNIQUE KEY `IDX_ea06eb8894469a0f262d929bf0` (`collaborationId`),
  UNIQUE KEY `IDX_cc0b08eb9679d3daa95153c2af` (`contextId`),
  UNIQUE KEY `IDX_68fa2c2b00cc1ed77e7c225e8b` (`communityId`),
  UNIQUE KEY `IDX_9c664d684f987a735678b0ba82` (`agentId`),
  UNIQUE KEY `IDX_980c4643d7d9de1b97bc39f518` (`storageAggregatorId`),
  KEY `FK_71231450cf75dc486700ca034c6` (`profileId`),
  KEY `FK_1114d59c0b805c9c1ecb0070e16` (`storageAggregatorId`),
  CONSTRAINT `FK_1114d59c0b805c9c1ecb0070e16` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_6325f4ef25c4e07e723a96ed37c` FOREIGN KEY (`collaborationId`) REFERENCES `collaboration` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_71231450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_b0c3f360534db92017e36a00bb2` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=93 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `space`
--

LOCK TABLES `space` WRITE;
/*!40000 ALTER TABLE `space` DISABLE KEYS */;
/*!40000 ALTER TABLE `space` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `space_defaults`
--

DROP TABLE IF EXISTS `space_defaults`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `space_defaults` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `innovationFlowTemplateId` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_413ba75964e5a534e4bfa54846` (`authorizationId`),
  UNIQUE KEY `IDX_413ba75964e5a534e4bfa54846` (`authorizationId`),
  KEY `IDX_666ba75964e5a534e4bfa54846` (`innovationFlowTemplateId`),
  CONSTRAINT `FK_413ba75964e5a534e4bfa54846e` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `space_defaults`
--

LOCK TABLES `space_defaults` WRITE;
/*!40000 ALTER TABLE `space_defaults` DISABLE KEYS */;
INSERT INTO `space_defaults` VALUES ('5896e498-209a-4dbb-91a0-2f4f596274b0','2024-07-29 06:56:03.031876','2024-07-29 06:56:03.031876',1,'f91071e2-d2d8-4a79-99cf-c1b12b39f33e','8b422b7e-3449-42aa-a037-75eac054d5c4');
/*!40000 ALTER TABLE `space_defaults` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storage_aggregator`
--

DROP TABLE IF EXISTS `storage_aggregator`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_aggregator` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `parentStorageAggregatorId` char(36) DEFAULT NULL,
  `directStorageId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_f3b4d59c0b805c9c1ecb0070e1` (`authorizationId`),
  UNIQUE KEY `REL_0647707288c243e60091c8d862` (`directStorageId`),
  KEY `FK_b80c28f5335ab5442f63c644d94` (`parentStorageAggregatorId`),
  CONSTRAINT `FK_0647707288c243e60091c8d8620` FOREIGN KEY (`directStorageId`) REFERENCES `storage_bucket` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b80c28f5335ab5442f63c644d94` FOREIGN KEY (`parentStorageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_f3b4d59c0b805c9c1ecb0070e16` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storage_aggregator`
--

LOCK TABLES `storage_aggregator` WRITE;
/*!40000 ALTER TABLE `storage_aggregator` DISABLE KEYS */;
INSERT INTO `storage_aggregator` VALUES ('24ff826e-64ed-4619-8d47-d9a9ea2e257c','2024-07-29 06:55:41.365993','2024-07-29 06:55:41.365993',1,'fb619708-5e02-4449-bafc-b6d2b496e79e',NULL,'10435fb3-c307-4662-a7ec-2104802ad97e'),('2bf37ff0-c0e1-4c0f-89e0-00a52539d37d','2024-07-29 06:56:03.069204','2024-07-29 06:56:03.069204',1,'6b5a8bc0-341f-47d0-bbc7-e7e54ef1eb50','d6d12d73-a3e2-432a-ade8-6a16601ea669','984e071d-4deb-4d31-a862-29754edc5b3d'),('3ab59d68-51b1-4e49-a536-f7fec038ebde','2024-07-29 06:56:02.709282','2024-07-29 06:56:02.709282',1,'1c2ab720-7a0e-46db-8093-27f1c73dd6e5',NULL,'2bcae264-32d1-4f2e-92e7-04c709d93862'),('3e78edd1-0a1b-4df4-b0ed-0e853e7c1af0','2024-07-29 07:40:02.505295','2024-07-29 07:40:02.505295',1,'ca5faba1-7102-4534-9084-56bdbdb3c7b0',NULL,'7c57c6a5-d586-48ac-9002-ad4a62512ac6'),('9a787487-fa97-4b3b-b23b-dbf3ffc1ee26','2024-07-29 06:55:41.351082','2024-07-29 06:55:41.351082',1,'8dc8f5ad-acb4-4144-997d-209bd9406e08',NULL,'0009572d-0d38-4d2c-838f-a95653a1db0d'),('a0ac81af-f2a1-4e4f-855b-41f92e113493','2024-07-29 07:40:04.026136','2024-07-29 07:40:04.026136',1,'c4ec3d49-b72c-4880-80d7-352d4577534c',NULL,'f22e3cab-4214-407f-80c5-a40ae74658e3'),('d6d12d73-a3e2-432a-ade8-6a16601ea669','2024-07-29 06:56:02.843463','2024-07-29 06:56:02.843463',1,'15580054-7cbe-4faa-9fac-0dcbb7119267',NULL,'b42bdfc7-f447-4e4e-87ec-1776fd42b50d');
/*!40000 ALTER TABLE `storage_aggregator` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `storage_bucket`
--

DROP TABLE IF EXISTS `storage_bucket`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `storage_bucket` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `allowedMimeTypes` text,
  `maxFileSize` int DEFAULT '5242880',
  `storageAggregatorId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_77994efc5eb5936ed70f2c55903` (`authorizationId`),
  UNIQUE KEY `IDX_f2f48b57269987b13b415a0058` (`authorizationId`),
  KEY `FK_11d0ed50a26da5513f7e4347847` (`storageAggregatorId`),
  CONSTRAINT `FK_11d0ed50a26da5513f7e4347847` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_77755901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `storage_bucket`
--

LOCK TABLES `storage_bucket` WRITE;
/*!40000 ALTER TABLE `storage_bucket` DISABLE KEYS */;
INSERT INTO `storage_bucket` VALUES ('0009572d-0d38-4d2c-838f-a95653a1db0d','2024-07-29 06:55:41.349507','2024-07-29 06:55:48.390898',1,'5e0319b3-eee5-41b3-a5b4-d1f7a652fc7a','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'9a787487-fa97-4b3b-b23b-dbf3ffc1ee26'),('10435fb3-c307-4662-a7ec-2104802ad97e','2024-07-29 06:55:41.363247','2024-07-29 06:55:48.390898',1,'ef0ac185-4190-4ec7-9f20-9a9a37097b49','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'24ff826e-64ed-4619-8d47-d9a9ea2e257c'),('185fe8c2-2881-43ca-9aa6-58bf45d6a1ba','2024-07-29 06:56:02.942299','2024-07-29 06:56:02.942299',1,'c3d29111-03b7-46cf-9f02-b0cf831a984a','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'d6d12d73-a3e2-432a-ade8-6a16601ea669'),('265d801b-3224-4594-9e0a-d4d96cfce6b2','2024-07-29 06:56:02.850156','2024-07-29 06:56:02.850156',1,'a6bb0e9b-572a-4180-a9d0-e65b956b20c3','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'d6d12d73-a3e2-432a-ade8-6a16601ea669'),('2bcae264-32d1-4f2e-92e7-04c709d93862','2024-07-29 06:56:02.698811','2024-07-29 06:56:02.698811',1,'0a5d5825-5ed3-486f-aaca-c5cfc602908e','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,NULL),('3a0ec190-bef3-4b5a-a4f3-a4371df08961','2024-07-29 07:40:02.510417','2024-07-29 07:40:02.510417',1,'3a6c1891-a7ad-48ec-838f-2ace4225e227','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'3e78edd1-0a1b-4df4-b0ed-0e853e7c1af0'),('6ef1ee92-ce55-4793-8434-260f702faefe','2024-07-29 06:56:02.882887','2024-07-29 06:56:02.882887',1,'772d9c46-9a92-405e-bf6a-05683da1a6f2','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'d6d12d73-a3e2-432a-ade8-6a16601ea669'),('7c57c6a5-d586-48ac-9002-ad4a62512ac6','2024-07-29 07:40:02.492123','2024-07-29 07:40:02.492123',1,'f3b0998a-490e-439a-8337-41d7adf00b37','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,NULL),('80971340-0bd5-4253-ae6f-e6728dec6bc8','2024-07-29 06:56:02.713357','2024-07-29 06:56:02.713357',1,'f6d88202-5f79-47b2-b06b-d1ccacc5c73e','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'3ab59d68-51b1-4e49-a536-f7fec038ebde'),('8886c371-c79e-43ad-adf8-5e2a81a83ccb','2024-07-29 07:40:04.028785','2024-07-29 07:40:04.028785',1,'cc2dec6b-1a32-45da-9e45-0a0cfc7fdbbb','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'a0ac81af-f2a1-4e4f-855b-41f92e113493'),('984e071d-4deb-4d31-a862-29754edc5b3d','2024-07-29 06:56:03.066103','2024-07-29 06:56:03.066103',1,'845c49ad-7093-400f-b9a3-a5b3bb4c36ed','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,NULL),('b42bdfc7-f447-4e4e-87ec-1776fd42b50d','2024-07-29 06:56:02.838487','2024-07-29 06:56:02.838487',1,'7890ec3b-fa8b-4881-813d-bc4b785fd148','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,NULL),('c68ea459-90cf-40d1-9ef5-4e40e0c1b3a8','2024-07-29 06:56:03.074796','2024-07-29 06:56:03.074796',1,'512e53fa-dddd-4137-b7b1-34fd434c9883','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'2bf37ff0-c0e1-4c0f-89e0-00a52539d37d'),('d1aa51c8-3b1e-4802-acee-1f09e2c3ad55','2024-07-29 06:56:02.912354','2024-07-29 06:56:02.912354',1,'b0e29a04-35b9-4a58-bc2b-c6728e5b71e9','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'d6d12d73-a3e2-432a-ade8-6a16601ea669'),('f22e3cab-4214-407f-80c5-a40ae74658e3','2024-07-29 07:40:04.021372','2024-07-29 07:40:04.021372',1,'7d7765ab-34c1-4e80-81d0-6bddc7821b62','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,NULL),('f918d774-1310-4fa0-b14f-82b1db772ab2','2024-07-29 06:56:02.975190','2024-07-29 06:56:02.975190',1,'dc732f6a-afd2-47c4-8b24-8bfda9325668','application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,image/bmp,image/jpg,image/jpeg,image/x-png,image/png,image/gif,image/webp,image/svg+xml,image/avif',15728640,'d6d12d73-a3e2-432a-ade8-6a16601ea669');
/*!40000 ALTER TABLE `storage_bucket` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tagset`
--

DROP TABLE IF EXISTS `tagset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tagset` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'default',
  `tags` text NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `tagsetTemplateId` char(36) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_eb59b98ee6ef26c993d0d75c83` (`authorizationId`),
  KEY `FK_81fc213b2d9ad0cddeab1a9ce64` (`profileId`),
  KEY `FK_7ab35130cde781b69259eec7d85` (`tagsetTemplateId`),
  CONSTRAINT `FK_7ab35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateId`) REFERENCES `tagset_template` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tagset`
--

LOCK TABLES `tagset` WRITE;
/*!40000 ALTER TABLE `tagset` DISABLE KEYS */;
INSERT INTO `tagset` VALUES ('2bca6c2b-df40-46ae-afe5-701137cee801','2024-07-29 06:56:03.084321','2024-07-29 06:56:03.000000',2,'default','','e99378ed-d99c-4184-9b90-228e8c0caebc','fceeed91-69c5-4c94-a114-4af6deab9594',NULL,'freeform'),('2f64714f-601c-4b10-b2a0-962e6548639c','2024-07-29 07:40:02.564418','2024-07-29 07:40:02.000000',2,'skills','','08e9359d-aab4-4a12-8667-efba7bbb7b00','08fc3de3-a979-4ed6-8e33-f0ad43b9de66',NULL,'freeform'),('3429a2f6-0ed0-430f-b0a3-bfd75b0d45ac','2024-07-29 06:56:02.733897','2024-07-29 06:56:02.000000',2,'keywords','','5e4e7ce8-3632-41fe-859d-c56321e27b66','afb470a0-49ab-4136-9c6f-950d92b8e65f',NULL,'freeform'),('55614b3d-2932-48f3-a057-882fc953ef5c','2024-07-29 06:56:02.924713','2024-07-29 06:56:02.000000',2,'default','','1b37e151-f678-4196-86f1-db46e5747e78','f33193d1-19b4-437c-ad0e-de48a2bd56fa',NULL,'freeform'),('7c6b5eec-45ab-4e71-9c6e-5112effd2adc','2024-07-29 07:40:04.075548','2024-07-29 07:40:04.000000',2,'keywords','','c2b6c6d5-aa96-486b-96fc-0d621210d976','55056e74-7096-4d1b-bf27-2c6db2c7fc28',NULL,'freeform'),('935a898d-7b0d-4520-92e4-b91a2eaa9f30','2024-07-29 07:40:02.577019','2024-07-29 07:40:02.000000',2,'keywords','','ed38b37d-01ae-4c93-8109-caf4c8c92b45','08fc3de3-a979-4ed6-8e33-f0ad43b9de66',NULL,'freeform'),('974e2a41-40f2-4bbf-8c1a-34649727d940','2024-07-29 06:56:02.866197','2024-07-29 06:56:02.000000',2,'default','','cf38f696-4eb3-40ca-ac56-b26d17b839b8','bb3994ef-0195-4087-bbc6-248b491adaae',NULL,'freeform'),('be31b270-136a-4f0e-8c8e-c2593c553f7f','2024-07-29 07:40:04.057641','2024-07-29 07:40:04.000000',2,'skills','','a51f9a6b-281c-4c57-9fa2-87230aa4718a','55056e74-7096-4d1b-bf27-2c6db2c7fc28',NULL,'freeform'),('e0542e1d-5bb8-4f01-89c5-f7bee9585a54','2024-07-29 06:56:02.957468','2024-07-29 06:56:02.000000',2,'default','','a19e35d7-1499-4da8-a271-0e81d09e94d6','41506117-578c-4234-8472-34d9341475b8',NULL,'freeform'),('e729e64a-6474-4875-a77a-1d781e264662','2024-07-29 06:56:02.748521','2024-07-29 06:56:02.000000',2,'capabilities','','2a138944-2d10-49b9-b71b-1080817e0877','afb470a0-49ab-4136-9c6f-950d92b8e65f',NULL,'freeform'),('ea75275e-f2e4-4f3e-aefb-c39a79d9a81d','2024-07-29 06:56:02.987624','2024-07-29 06:56:02.000000',2,'default','','da3dfff0-26cf-4e7f-8a26-be4fb1f9a4d6','eb1e70dd-2b1a-41be-b894-211da23c6413',NULL,'freeform'),('f48b3b08-969e-49a0-9d88-0ec388df7dc0','2024-07-29 06:56:02.896473','2024-07-29 06:56:02.000000',2,'default','','036078f3-351e-4f96-ac9c-9f6c35ba3592','f91992dc-9913-4014-b5bf-e080f1f3b757',NULL,'freeform');
/*!40000 ALTER TABLE `tagset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tagset_template`
--

DROP TABLE IF EXISTS `tagset_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tagset_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `type` varchar(255) DEFAULT NULL,
  `allowedValues` text,
  `defaultSelectedValue` varchar(255) DEFAULT NULL,
  `tagsetTemplateSetId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_9ad35130cde781b69259eec7d85` (`tagsetTemplateSetId`),
  CONSTRAINT `FK_9ad35130cde781b69259eec7d85` FOREIGN KEY (`tagsetTemplateSetId`) REFERENCES `tagset_template_set` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tagset_template`
--

LOCK TABLES `tagset_template` WRITE;
/*!40000 ALTER TABLE `tagset_template` DISABLE KEYS */;
/*!40000 ALTER TABLE `tagset_template` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tagset_template_set`
--

DROP TABLE IF EXISTS `tagset_template_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tagset_template_set` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tagset_template_set`
--

LOCK TABLES `tagset_template_set` WRITE;
/*!40000 ALTER TABLE `tagset_template_set` DISABLE KEYS */;
/*!40000 ALTER TABLE `tagset_template_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates_set`
--

DROP TABLE IF EXISTS `templates_set`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates_set` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_66666ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_eb0176ef4b98c143322aa6f809` (`authorizationId`),
  CONSTRAINT `FK_66666901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates_set`
--

LOCK TABLES `templates_set` WRITE;
/*!40000 ALTER TABLE `templates_set` DISABLE KEYS */;
INSERT INTO `templates_set` VALUES ('3e9bc807-81d0-4447-8a79-e00c06abc133','2024-07-29 06:56:02.846455','2024-07-29 06:56:02.846455',1,'eda85ea9-6122-4dd9-a7a5-aa04081b7c12');
/*!40000 ALTER TABLE `templates_set` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timeline`
--

DROP TABLE IF EXISTS `timeline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timeline` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `calendarId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_e6203bc09ec8b93debeb3a44cb9` (`authorizationId`),
  UNIQUE KEY `REL_10ed346b16ca044cd84fb1c4034` (`calendarId`),
  UNIQUE KEY `IDX_5fe58ece01b48496aebc04733d` (`authorizationId`),
  UNIQUE KEY `IDX_56aae15a664b2889a1a11c2cf8` (`calendarId`),
  CONSTRAINT `FK_22443901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_66355901817dd09d5906537e088` FOREIGN KEY (`calendarId`) REFERENCES `calendar` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timeline`
--

LOCK TABLES `timeline` WRITE;
/*!40000 ALTER TABLE `timeline` DISABLE KEYS */;
/*!40000 ALTER TABLE `timeline` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `rowId` int NOT NULL AUTO_INCREMENT,
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(36) NOT NULL,
  `accountUpn` varchar(255) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `communicationID` varchar(255) NOT NULL,
  `serviceProfile` tinyint NOT NULL,
  `preferenceSetId` char(36) DEFAULT NULL,
  `storageAggregatorId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_266bc44a18601f893566962df6` (`rowId`),
  UNIQUE KEY `REL_09f909622aa177a097256b7cc2` (`authorizationId`),
  UNIQUE KEY `REL_9466682df91534dd95e4dbaa61` (`profileId`),
  UNIQUE KEY `REL_b61c694cacfab25533bd23d9ad` (`agentId`),
  UNIQUE KEY `IDX_88880355b4e9bd6b02c66507aa` (`preferenceSetId`),
  UNIQUE KEY `IDX_028322b763dc94242dc9f638f9` (`preferenceSetId`),
  UNIQUE KEY `IDX_10458c50c10436b6d589b40e5c` (`storageAggregatorId`),
  KEY `FK_4444d59c0b805c9c1ecb0070e16` (`storageAggregatorId`),
  CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_4444d59c0b805c9c1ecb0070e16` FOREIGN KEY (`storageAggregatorId`) REFERENCES `storage_aggregator` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_5ea996d22fbd9d522a59a39b74e` FOREIGN KEY (`preferenceSetId`) REFERENCES `preference_set` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=139 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (138,'737044b7-7f58-48c3-9079-f4e8317bdc02','2024-07-29 07:40:04.204643','2024-07-29 07:40:05.000000',2,'notifications-admin','notifications@alkem.io','notifications','admin','notifications@alkem.io','','58089601-5a61-4f1c-9edb-bdad36a58527','55056e74-7096-4d1b-bf27-2c6db2c7fc28','ed9707f4-965e-4d1b-b6d1-41a20465ff4b','@notifications=alkem.io:matrix.alkem.io',0,'7e0a3bc5-3249-4b97-a2db-19b6f6bb5080','a0ac81af-f2a1-4e4f-855b-41f92e113493'),(137,'8250180d-d3f6-48ae-9347-d9b993cf296d','2024-07-29 07:40:02.721317','2024-07-29 07:40:02.000000',2,'admin-alkemio','admin@alkem.io','admin','alkemio','admin@alkem.io','','521fcfee-5ce2-44aa-8f64-95bae8b74cbd','08fc3de3-a979-4ed6-8e33-f0ad43b9de66','8499763d-fd3b-4751-b397-74e6031e8a2c','@admin=alkem.io:matrix.alkem.io',0,'45bdf3c6-7599-448f-bc68-f54c645ec0d5','3e78edd1-0a1b-4df4-b0ed-0e853e7c1af0');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_group`
--

DROP TABLE IF EXISTS `user_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_group` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `organizationId` char(36) DEFAULT NULL,
  `communityId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_e8e32f1e59c349b406a4752e54` (`authorizationId`),
  UNIQUE KEY `REL_9912e4cfc1e09848a392a65151` (`profileId`),
  KEY `FK_9fcc131f256e969d773327f07cb` (`communityId`),
  KEY `FK_2b8381df8c3a1680f50e4bc2351` (`organizationId`),
  CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organizationId`) REFERENCES `organization` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_group`
--

LOCK TABLES `user_group` WRITE;
/*!40000 ALTER TABLE `user_group` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vc_interaction`
--

DROP TABLE IF EXISTS `vc_interaction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vc_interaction` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `threadID` varchar(128) NOT NULL,
  `virtualContributorID` char(36) NOT NULL,
  `roomId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_1ba25e7d3dc29fa02b88e17fca0` (`roomId`),
  CONSTRAINT `FK_1ba25e7d3dc29fa02b88e17fca0` FOREIGN KEY (`roomId`) REFERENCES `room` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vc_interaction`
--

LOCK TABLES `vc_interaction` WRITE;
/*!40000 ALTER TABLE `vc_interaction` DISABLE KEYS */;
/*!40000 ALTER TABLE `vc_interaction` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `virtual_contributor`
--

DROP TABLE IF EXISTS `virtual_contributor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `virtual_contributor` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `agentId` char(36) DEFAULT NULL,
  `communicationID` varchar(255) NOT NULL,
  `accountId` char(36) DEFAULT NULL,
  `listedInStore` tinyint NOT NULL,
  `searchVisibility` varchar(36) NOT NULL DEFAULT 'account',
  `aiPersonaId` char(36) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_55b8101bdf4f566645e928c26e` (`aiPersonaId`),
  UNIQUE KEY `REL_55b8101bdf4f566645e928c26e` (`aiPersonaId`),
  UNIQUE KEY `IDX_e2eaa2213ac4454039cd8abc07` (`authorizationId`),
  UNIQUE KEY `IDX_4504c37764f6962ccbd165a21d` (`profileId`),
  UNIQUE KEY `IDX_a8890dcd65b8c3ee6e160d33f3` (`agentId`),
  UNIQUE KEY `REL_e2eaa2213ac4454039cd8abc07` (`authorizationId`),
  UNIQUE KEY `REL_4504c37764f6962ccbd165a21d` (`profileId`),
  UNIQUE KEY `REL_a8890dcd65b8c3ee6e160d33f3` (`agentId`),
  KEY `FK_7a962c9b04b0d197bc3c93262a7` (`accountId`),
  CONSTRAINT `FK_4504c37764f6962ccbd165a21de` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_55b8101bdf4f566645e928c26e3` FOREIGN KEY (`aiPersonaId`) REFERENCES `ai_persona` (`id`),
  CONSTRAINT `FK_7a962c9b04b0d197bc3c93262a7` FOREIGN KEY (`accountId`) REFERENCES `account` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_a8890dcd65b8c3ee6e160d33f3a` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_e2eaa2213ac4454039cd8abc07d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `virtual_contributor`
--

LOCK TABLES `virtual_contributor` WRITE;
/*!40000 ALTER TABLE `virtual_contributor` DISABLE KEYS */;
/*!40000 ALTER TABLE `virtual_contributor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `visual`
--

DROP TABLE IF EXISTS `visual`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `visual` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `uri` text NOT NULL,
  `minWidth` int NOT NULL,
  `maxWidth` int NOT NULL,
  `minHeight` int NOT NULL,
  `maxHeight` int NOT NULL,
  `aspectRatio` float DEFAULT NULL,
  `allowedTypes` text NOT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `alternativeText` varchar(120) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_439d0b187986492b58178a82c3` (`authorizationId`),
  UNIQUE KEY `IDX_4fbd109f9bb84f58b7a3c60649` (`authorizationId`),
  KEY `FK_77771450cf75dc486700ca034c6` (`profileId`),
  CONSTRAINT `FK_439d0b187986492b58178a82c3f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_77771450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `visual`
--

LOCK TABLES `visual` WRITE;
/*!40000 ALTER TABLE `visual` DISABLE KEYS */;
INSERT INTO `visual` VALUES ('484b4f1a-f11a-4426-bf05-e8c9ece89cce','2024-07-29 06:56:02.932481','2024-07-29 06:56:02.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','9fc5dd3f-5117-4fb1-8479-373b5302597f','f33193d1-19b4-437c-ad0e-de48a2bd56fa',NULL),('4d25f08a-aeb6-4a99-9ec9-75c0497b4069','2024-07-29 07:40:02.553058','2024-07-29 07:40:02.000000',2,'avatar','https://eu.ui-avatars.com/api/?name=admin+alkemio&background=719d6&color=ffffff',190,410,190,410,1,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','b1bb3b10-cc9e-412a-9eb4-9024a424ad83','08fc3de3-a979-4ed6-8e33-f0ad43b9de66',NULL),('4d3f56d4-c789-41f5-8223-a39e5dc7ce54','2024-07-29 06:56:02.756478','2024-07-29 06:56:02.000000',2,'avatar','https://eu.ui-avatars.com/api/?name=Eco1 Host+&background=b5dfa9&color=ffffff',190,410,190,410,1,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','ac394088-b727-44d0-a7c7-4cdaa806c9e6','afb470a0-49ab-4136-9c6f-950d92b8e65f',NULL),('51f39eeb-0224-4e23-a6ef-edb960f7bf26','2024-07-29 06:56:02.965158','2024-07-29 06:56:02.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','c7e88dfd-a36e-4783-bea4-bfba58893b10','41506117-578c-4234-8472-34d9341475b8',NULL),('59301adb-07f3-471b-9560-f1256f604a19','2024-07-29 06:56:02.872989','2024-07-29 06:56:02.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','2ea82e5a-2a65-4639-9280-012f625f0c27','bb3994ef-0195-4087-bbc6-248b491adaae',NULL),('6bb21d04-f10e-451a-ae56-90433794832b','2024-07-29 07:40:04.052243','2024-07-29 07:40:04.000000',2,'avatar','https://eu.ui-avatars.com/api/?name=notifications+admin&background=f99722&color=ffffff',190,410,190,410,1,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','b8293901-aa31-4e39-a614-797cd64c7c2b','55056e74-7096-4d1b-bf27-2c6db2c7fc28',NULL),('6f363a19-ec9c-4b1c-8a55-c37c5331dc51','2024-07-29 06:56:02.903891','2024-07-29 06:56:02.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','a9dd23f5-e531-4a79-b66f-3e6626e4090d','f91992dc-9913-4014-b5bf-e080f1f3b757',NULL),('91eccefb-8302-41fc-9509-50de8d4049c8','2024-07-29 06:56:02.995753','2024-07-29 06:56:03.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','40c91ec6-9acf-4904-a4fb-3813a1910649','eb1e70dd-2b1a-41be-b894-211da23c6413',NULL),('9bf1e79c-e3a4-475a-8453-913583fa40a6','2024-07-29 06:56:03.092572','2024-07-29 06:56:03.000000',2,'card','',307,410,192,256,1.6,'image/png,image/jpeg,image/jpg,image/svg+xml,image/webp','1d47f164-f4a0-4690-9d5d-15edad3528e4','fceeed91-69c5-4c94-a114-4af6deab9594',NULL);
/*!40000 ALTER TABLE `visual` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whiteboard`
--

DROP TABLE IF EXISTS `whiteboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whiteboard` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `content` longtext NOT NULL,
  `createdBy` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `profileId` char(36) DEFAULT NULL,
  `contentUpdatePolicy` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_60e34af57347a7d391bc598568` (`authorizationId`),
  UNIQUE KEY `REL_9dd2273a4105bd6ed536fe4913` (`profileId`),
  CONSTRAINT `FK_60e34af57347a7d391bc5985681` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9dd2273a4105bd6ed536fe49138` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whiteboard`
--

LOCK TABLES `whiteboard` WRITE;
/*!40000 ALTER TABLE `whiteboard` DISABLE KEYS */;
/*!40000 ALTER TABLE `whiteboard` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whiteboard_template`
--

DROP TABLE IF EXISTS `whiteboard_template`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whiteboard_template` (
  `id` char(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `templatesSetId` char(36) DEFAULT NULL,
  `authorizationId` char(36) DEFAULT NULL,
  `content` longtext NOT NULL,
  `profileId` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_88888ccdda9ba57d8e3a634cd8` (`authorizationId`),
  UNIQUE KEY `IDX_cc2faf30ce52648db9299d7072` (`authorizationId`),
  UNIQUE KEY `IDX_5b4948db27c348e65055187d5e` (`profileId`),
  KEY `FK_65556450cf75dc486700ca034c6` (`templatesSetId`),
  KEY `FK_69991450cf75dc486700ca034c6` (`profileId`),
  CONSTRAINT `FK_45556901817dd09d5906537e088` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_policy` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_65556450cf75dc486700ca034c6` FOREIGN KEY (`templatesSetId`) REFERENCES `templates_set` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_69991450cf75dc486700ca034c6` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whiteboard_template`
--

LOCK TABLES `whiteboard_template` WRITE;
/*!40000 ALTER TABLE `whiteboard_template` DISABLE KEYS */;
/*!40000 ALTER TABLE `whiteboard_template` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2024-07-29  8:25:55
