-- MySQL dump 10.13  Distrib 8.0.22, for Linux (x86_64)
--
-- Host: localhost    Database: cherrytwist
-- ------------------------------------------------------
-- Server version	8.0.23

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `actor`
--

DROP TABLE IF EXISTS `actor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `actor` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `value` text,
  `impact` varchar(255) DEFAULT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `actorGroupId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a2afa3851ea733de932251b3a1` (`authorizationId`),
  KEY `FK_0f9d41ee193d631a5439bb4f404` (`actorGroupId`),
  CONSTRAINT `FK_0f9d41ee193d631a5439bb4f404` FOREIGN KEY (`actorGroupId`) REFERENCES `actor_group` (`id`),
  CONSTRAINT `FK_a2afa3851ea733de932251b3a1f` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
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
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  `ecosystemModelId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_bde98d59e8984e7d17034c3b93` (`authorizationId`),
  KEY `FK_cbb1d7afa052a184471723d3297` (`ecosystemModelId`),
  CONSTRAINT `FK_bde98d59e8984e7d17034c3b937` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_cbb1d7afa052a184471723d3297` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `actor_group`
--

LOCK TABLES `actor_group` WRITE;
/*!40000 ALTER TABLE `actor_group` DISABLE KEYS */;
INSERT INTO `actor_group` VALUES ('02d140e9-e421-4037-a37d-7a8a2f2039a7','2021-06-04 13:06:43.375689','2021-06-04 13:06:43.000000',2,'KeyUsers','Key Users','e0c4f726-0f56-4fde-ad9f-0281497e1697','4fc6f66e-7870-4408-8c8f-8e5f22bf04f7'),('426183f6-4762-45d0-8686-d781344bcd90','2021-06-04 13:06:44.048149','2021-06-04 13:06:44.000000',2,'Stakeholders','Stakeholders','32418b1a-3c4a-4e06-a425-7c93517a3bfb','4fc6f66e-7870-4408-8c8f-8e5f22bf04f7'),('9ad66e8c-0d60-44a0-b2d3-019061e38f63','2021-06-04 13:06:45.523601','2021-06-04 13:06:45.000000',2,'Stakeholders','Stakeholders','e9832d9d-c63c-43c7-951c-3922e0535320','d6624753-0eef-4ee0-a63b-18dd762af882'),('b1bfc6a6-c4c7-4251-86cc-14ad096e9192','2021-06-04 13:06:44.816389','2021-06-04 13:06:44.000000',2,'KeyUsers','Key Users','fa5ff066-34a9-4a3b-82e7-38b39529528b','d6624753-0eef-4ee0-a63b-18dd762af882');
/*!40000 ALTER TABLE `actor_group` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agent`
--

DROP TABLE IF EXISTS `agent`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agent` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `parentDisplayID` text,
  `did` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agent`
--

LOCK TABLES `agent` WRITE;
/*!40000 ALTER TABLE `agent` DISABLE KEYS */;
INSERT INTO `agent` VALUES ('0a7604f3-b135-4472-91c6-72b4ca5608c0','2021-06-04 13:07:21.644778','2021-06-04 13:07:21.644778',1,'Alisha@Rutha.com',NULL),('0ad864e7-f103-4187-9c3c-11819e2e7cc9','2021-06-04 13:07:18.062423','2021-06-04 13:07:18.062423',1,'Madalyn@Jerold.com',NULL),('0c41211f-698e-4f76-9ffe-da3215d3982b','2021-06-04 13:07:03.714171','2021-06-04 13:07:03.714171',1,'Ebonie@Almeda.com',NULL),('174e6141-3af9-4beb-aabc-82fd2ee5b252','2021-06-04 11:54:08.740955','2021-06-04 11:54:08.740955',1,'admin@cherrytwist.org',NULL),('434f747a-5c67-4790-becc-68a3e2e73715','2021-06-04 11:54:10.239237','2021-06-04 11:54:10.239237',1,'non.ecoverse@cherrytwist.org',NULL),('4c3766dd-909c-4f93-9c77-331c72fa170b','2021-06-04 13:07:14.523900','2021-06-04 13:07:14.523900',1,'Elijah@Kena.com',NULL),('4d22d3e8-06a0-4265-ad1b-4c2296f72b42','2021-06-04 13:07:26.410316','2021-06-04 13:07:26.410316',1,'Luvenia@Kena.com',NULL),('68549595-c718-4c85-a820-e384b0c69def','2021-06-04 11:54:09.339898','2021-06-04 11:54:09.339898',1,'ecoverse.admin@cherrytwist.org',NULL),('81fa4741-e66d-4c28-8f76-dcdae1e6936d','2021-06-04 13:07:11.486845','2021-06-04 13:07:11.486845',1,'Kathern@Keira.com',NULL),('8623b0c2-ea7c-42d6-b1a1-333436e72231','2021-06-04 11:54:09.052570','2021-06-04 11:54:09.052570',1,'community.admin@cherrytwist.org',NULL),('8ebb8338-2630-4751-98fc-cf8307692e22','2021-06-04 13:07:07.357060','2021-06-04 13:07:07.357060',1,'Lilliam@Sonny.com',NULL),('afc806b6-d154-489d-84ec-cb4cbced8201','2021-06-04 13:06:56.137763','2021-06-04 13:06:56.137763',1,'Lilliam@Cathie.com',NULL),('e4554d72-cb34-4b73-8bcf-0d00554674b4','2021-06-04 11:54:10.005924','2021-06-04 11:54:10.005924',1,'qa.user@cherrytwist.org',NULL),('e5b827f6-71f9-495a-b958-578578a9c812','2021-06-04 13:06:59.825766','2021-06-04 13:06:59.825766',1,'Dorcas@Christinia.com',NULL),('f42e4b0f-556b-4afe-ab24-93edf12ef8ce','2021-06-04 11:54:09.747418','2021-06-04 11:54:09.747418',1,'ecoverse.member@cherrytwist.org',NULL);
/*!40000 ALTER TABLE `agent` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agreement`
--

DROP TABLE IF EXISTS `agreement`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agreement` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `projectId` varchar(36) DEFAULT NULL,
  `tagsetId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_22348b89c2f802a3d75d52fbd5` (`tagsetId`),
  KEY `FK_8785b5a8510cabcc25d0f196783` (`projectId`),
  CONSTRAINT `FK_22348b89c2f802a3d75d52fbd57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`),
  CONSTRAINT `FK_8785b5a8510cabcc25d0f196783` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agreement`
--

LOCK TABLES `agreement` WRITE;
/*!40000 ALTER TABLE `agreement` DISABLE KEYS */;
/*!40000 ALTER TABLE `agreement` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `application`
--

DROP TABLE IF EXISTS `application`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `application` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `userId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_56f5614fff0028d40370499582` (`authorizationId`),
  UNIQUE KEY `REL_7ec2857c7d8d16432ffca1cb3d` (`lifecycleId`),
  KEY `FK_b4ae3fea4a24b4be1a86dacf8a2` (`userId`),
  KEY `FK_500cee6f635849f50e19c7e2b76` (`communityId`),
  CONSTRAINT `FK_500cee6f635849f50e19c7e2b76` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_56f5614fff0028d403704995822` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_7ec2857c7d8d16432ffca1cb3d9` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`),
  CONSTRAINT `FK_b4ae3fea4a24b4be1a86dacf8a2` FOREIGN KEY (`userId`) REFERENCES `user` (`id`)
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
  `applicationId` varchar(36) NOT NULL,
  `nvpId` varchar(36) NOT NULL,
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
-- Table structure for table `aspect`
--

DROP TABLE IF EXISTS `aspect`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aspect` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `framing` text NOT NULL,
  `explanation` text NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `contextId` varchar(36) DEFAULT NULL,
  `projectId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_c52470717008d58ec6d76b12ff` (`authorizationId`),
  KEY `FK_6c57bb50b3b6fb4943c807c83ce` (`contextId`),
  KEY `FK_37bfa2f3da493204ddc6e773e5a` (`projectId`),
  CONSTRAINT `FK_37bfa2f3da493204ddc6e773e5a` FOREIGN KEY (`projectId`) REFERENCES `project` (`id`),
  CONSTRAINT `FK_6c57bb50b3b6fb4943c807c83ce` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`),
  CONSTRAINT `FK_c52470717008d58ec6d76b12ffa` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aspect`
--

LOCK TABLES `aspect` WRITE;
/*!40000 ALTER TABLE `aspect` DISABLE KEYS */;
INSERT INTO `aspect` VALUES ('0b340c34-d465-4853-b9a6-30e3ebdce936','2021-06-04 13:06:52.333095','2021-06-04 13:06:52.000000',2,'Title 1','Framing 1','Explanation 1','d0fa7865-aaf5-43d4-afc3-55591c0514a5','03a01c54-966c-40c6-9703-f8c5d2a20848',NULL);
/*!40000 ALTER TABLE `aspect` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `authorization_definition`
--

DROP TABLE IF EXISTS `authorization_definition`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `authorization_definition` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `credentialRules` text NOT NULL,
  `anonymousReadAccess` tinyint NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `authorization_definition`
--

LOCK TABLES `authorization_definition` WRITE;
/*!40000 ALTER TABLE `authorization_definition` DISABLE KEYS */;
INSERT INTO `authorization_definition` VALUES ('020d7aac-981d-4017-b687-a0d699ab282e','2021-06-04 13:06:23.822852','2021-06-04 13:06:23.822852',1,'',0),('020eff13-e6f6-42a8-a7e5-17808a4c0de8','2021-06-04 13:06:28.304227','2021-06-04 13:06:29.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"read\"]}]',1),('09f03308-3092-49a2-b7db-dd00e37d99fe','2021-06-04 13:06:53.839479','2021-06-04 13:06:53.839479',1,'',0),('0a16bee0-a7a7-4c0e-ac48-45e74a6b00ab','2021-06-04 13:06:53.133994','2021-06-04 13:06:53.133994',1,'',0),('123cd4d8-fe3f-47d3-8b2d-496fe1db9e83','2021-06-04 11:54:09.018651','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"49a053e1-3c44-4abf-9f33-f59f945226f4\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('1a830a31-e0ee-4b9b-bc14-8e250ea443e8','2021-06-04 11:54:10.219688','2021-06-04 11:54:10.219688',1,'',0),('1e0cfa79-8c25-47c8-8370-2d9c813a7087','2021-06-04 13:06:23.520610','2021-06-04 13:06:23.520610',1,'',0),('1e857201-18ac-4e9a-806e-f01a11ed8f89','2021-06-04 13:07:18.093894','2021-06-04 13:07:18.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"3ce314f8-7169-4936-a246-5d5f5ad9eb86\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('1ecc4666-da97-47e1-ae81-f98af99c7d29','2021-06-04 13:06:23.303057','2021-06-04 13:06:23.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"fed1b4d7-24a4-4fa0-bb27-6986f75b4584\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"fed1b4d7-24a4-4fa0-bb27-6986f75b4584\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('1f746c14-e6c1-4255-baa1-c6eaa39939ba','2021-06-04 13:07:07.437090','2021-06-04 13:07:07.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"be6bca67-f4a0-41a7-a96a-61ee7af830c1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('20a9eda6-e8a2-4983-ac3a-a68b4f3c615d','2021-06-04 13:07:07.276445','2021-06-04 13:07:07.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"be6bca67-f4a0-41a7-a96a-61ee7af830c1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('226378e4-6fb0-4257-a857-35a0f7f8070e','2021-06-04 11:54:10.199904','2021-06-04 11:54:10.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"e49e6efd-ffd5-4b72-90ba-9898bd3c004e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('23ba0bad-0a24-4c13-a6a9-94fccc412be9','2021-06-04 13:06:35.262169','2021-06-04 13:06:36.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('23e117f1-35f5-478b-9c5c-e37b5ae9c002','2021-06-04 11:54:07.822597','2021-06-04 11:54:08.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]}]',1),('27c09992-2da5-43e5-b925-277a1418b00a','2021-06-04 11:54:10.025780','2021-06-04 11:54:10.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"cfe79dfb-59bd-472a-8a63-24ee0f5b4fbd\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('2b750136-bef4-4c7b-9373-1e7b72053211','2021-06-04 13:06:24.129443','2021-06-04 13:06:24.129443',1,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"ac88e57d-f44b-4415-9e40-c74bb7d7ba9d\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"ac88e57d-f44b-4415-9e40-c74bb7d7ba9d\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('2cc8a335-da3a-418e-8fe7-047d5ed29435','2021-06-04 13:06:39.690677','2021-06-04 13:06:41.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('2def7116-175b-4ba9-a32f-db0f2f7e8873','2021-06-04 13:06:59.877767','2021-06-04 13:07:00.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"8385b8de-df8e-4fd4-b814-7bf2fb985fe5\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('2e96eb39-0ef2-47e9-9865-610e7c28a8e1','2021-06-04 13:06:30.386022','2021-06-04 13:06:31.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('2efc4c30-1a51-4cac-a44b-37d3ca68d3f9','2021-06-04 13:07:18.017100','2021-06-04 13:07:18.017100',1,'',0),('2f7cc002-e0ee-49a1-b3eb-c41030c80b26','2021-06-04 13:07:11.522607','2021-06-04 13:07:11.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"d2d42dc9-6c72-495f-8436-2d20f3c09325\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('31fd69dd-56b4-4ca8-805d-6c835d309358','2021-06-04 11:54:09.685889','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"5aa8ae9c-a6f8-4566-85bc-f122abe27cb3\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('320c02ff-aa39-4076-861b-179237665214','2021-06-04 13:06:26.196274','2021-06-04 13:06:27.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('32418b1a-3c4a-4e06-a425-7c93517a3bfb','2021-06-04 13:06:44.044150','2021-06-04 13:06:44.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('36de6943-5bb3-42e2-bb12-85a8c3d0d6c9','2021-06-04 13:06:32.467448','2021-06-04 13:06:33.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('39fd3768-6d79-4ed6-914f-ccc4291432b3','2021-06-04 13:07:03.603407','2021-06-04 13:07:04.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"862abbd2-d02c-460f-bcd3-0c5838faa6c9\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('3efab4c2-7cf1-460f-8348-9e84bc50b59a','2021-06-04 13:06:28.354318','2021-06-04 13:06:29.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"read\"]}]',1),('43874633-fcf9-4952-95ab-73b49f200b1d','2021-06-04 11:54:07.831391','2021-06-04 11:54:08.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]}]',1),('45bf94e8-83ab-4282-bfcc-0353eaa6335d','2021-06-04 13:07:17.947442','2021-06-04 13:07:18.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"3ce314f8-7169-4936-a246-5d5f5ad9eb86\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('46ad63f1-0755-475d-bf6f-f0f169fbdbc8','2021-06-04 13:06:41.757433','2021-06-04 13:06:42.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('485f858f-f6c2-43b0-b72f-952a1962f546','2021-06-04 13:06:39.642096','2021-06-04 13:06:41.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('4c6df328-c462-4ef8-ab67-3af03b6cdc14','2021-06-04 13:06:59.763487','2021-06-04 13:07:00.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"8385b8de-df8e-4fd4-b814-7bf2fb985fe5\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('4ca31cb1-0889-4cba-b335-4591729b55dd','2021-06-04 13:06:53.112628','2021-06-04 13:06:53.112628',1,'',0),('4dec3fa4-31e9-4f9a-8c31-786dd5ad2250','2021-06-04 13:06:56.058402','2021-06-04 13:06:56.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"eb5f8f58-25ef-4c3d-9a2e-f3efcfc9593c\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('4f9af8c0-3f69-4feb-8913-85eb72499abb','2021-06-04 13:06:51.613247','2021-06-04 13:06:51.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('53be2c10-afdc-453e-afa1-1d462c6abb72','2021-06-04 13:06:22.384815','2021-06-04 13:06:22.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('53de0bdd-7172-4243-8808-d10cb151ba03','2021-06-04 11:54:10.256435','2021-06-04 11:54:10.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"e49e6efd-ffd5-4b72-90ba-9898bd3c004e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('53e70505-a8c1-477d-89ce-eb3a341ab1af','2021-06-04 13:07:21.625134','2021-06-04 13:07:21.625134',1,'',0),('53f3339b-7571-4475-944e-8ab3d8a0ac4b','2021-06-04 11:54:09.071193','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"49a053e1-3c44-4abf-9f33-f59f945226f4\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('55483b10-0320-4590-a69d-39c4726c1549','2021-06-04 13:06:30.436334','2021-06-04 13:06:31.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('55c74fa7-e164-4f3a-8123-9d6cd0acf0fd','2021-06-04 13:06:41.731672','2021-06-04 13:06:42.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('59608125-fffa-42a5-972a-7306655395fc','2021-06-04 13:07:03.781879','2021-06-04 13:07:04.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"862abbd2-d02c-460f-bcd3-0c5838faa6c9\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('5b102308-4955-44b0-9e9d-6b43733a397c','2021-06-04 13:06:23.585627','2021-06-04 13:06:23.585627',1,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"fed1b4d7-24a4-4fa0-bb27-6986f75b4584\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"fed1b4d7-24a4-4fa0-bb27-6986f75b4584\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('5b7402aa-a383-470b-acc0-ca9ae68b550b','2021-06-04 13:06:24.717621','2021-06-04 13:06:24.717621',1,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"dcaa60ea-64cd-45c4-8129-1370e3b757f4\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"dcaa60ea-64cd-45c4-8129-1370e3b757f4\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('6143e5bd-f448-40ce-8622-0e2935887189','2021-06-04 13:06:55.762809','2021-06-04 13:06:55.762809',1,'',0),('639e4737-3d92-4f28-b3b9-5dd6629a0b6a','2021-06-04 13:06:30.453958','2021-06-04 13:06:31.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('6418fb04-61fb-46ff-bbee-7ea7f24b9de4','2021-06-04 13:06:23.373243','2021-06-04 13:06:23.373243',1,'',0),('644d9fa0-293c-410d-875f-f04da90f42b0','2021-06-04 11:54:09.723704','2021-06-04 11:54:09.723704',1,'',0),('68de8d83-2f2e-4cad-a0c2-32a697f556d9','2021-06-04 13:06:22.955684','2021-06-04 13:06:22.955684',1,'',0),('69311923-e1c8-4beb-9568-95c5a2c94992','2021-06-04 13:06:54.647046','2021-06-04 13:06:54.647046',1,'',0),('693961a7-f820-4550-b439-951862b9bfec','2021-06-04 13:06:35.235499','2021-06-04 13:06:36.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('6a23b5aa-9052-4f9e-9862-a646cd8ed98f','2021-06-04 11:54:09.788365','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"5aa8ae9c-a6f8-4566-85bc-f122abe27cb3\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('6b8ebcb9-9cf9-408c-8970-eb786f4b0b80','2021-06-04 13:06:35.258021','2021-06-04 13:06:36.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('6deb0178-de01-4e44-b370-655a193d74a9','2021-06-04 13:06:24.648571','2021-06-04 13:06:24.648571',1,'',0),('70f039d4-960e-4a92-85f5-1359306a0560','2021-06-04 11:54:07.627934','2021-06-04 11:54:08.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]}]',1),('729f43e0-52d0-4f3e-a4a0-8a1b3448c664','2021-06-04 13:06:53.808167','2021-06-04 13:06:53.808167',1,'',0),('7405d9bc-f50a-4188-83bd-e13f97551c5b','2021-06-04 11:54:07.607830','2021-06-04 11:54:08.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('761784c8-8c82-4bdb-93b7-0ce3ce544180','2021-06-04 13:06:54.623441','2021-06-04 13:06:54.623441',1,'',0),('7b5acf5b-aaef-4267-b597-be1caf63241a','2021-06-04 13:06:48.111871','2021-06-04 13:06:48.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('7baf62c7-f2e5-4e84-b446-68af9c44ee24','2021-06-04 13:07:14.469759','2021-06-04 13:07:14.469759',1,'',0),('7cda2535-da57-49b7-bff8-e59768409432','2021-06-04 11:54:08.767292','2021-06-04 11:54:08.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"a84bbdc3-6ad2-4e95-9cb4-c3664cf84a42\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('7cf9c641-79c7-4d8c-b3a6-11a88dacd068','2021-06-04 13:06:49.762543','2021-06-04 13:06:49.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('81499c4c-dbbb-42a2-9f97-c86227e01d01','2021-06-04 13:06:35.213907','2021-06-04 13:06:36.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('8d8dddc0-e8ad-4c58-82e3-e53a51fa8591','2021-06-04 13:06:22.474198','2021-06-04 13:06:22.474198',1,'',0),('8f660f54-71dc-47be-b1da-7a47d0552ada','2021-06-04 13:06:28.363697','2021-06-04 13:06:29.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"read\"]}]',1),('8f7b8958-458b-47df-b6a3-943656fdba44','2021-06-04 13:06:39.594082','2021-06-04 13:06:40.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('94878b98-73eb-46b9-b73f-afc7216b1de6','2021-06-04 13:06:55.685698','2021-06-04 13:06:55.685698',1,'',0),('97bf2d9c-5c3a-4ef5-b0df-59cfab98c57f','2021-06-04 13:06:49.013636','2021-06-04 13:06:49.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('9833094e-43c1-4ee1-b72f-aa17f1d3e785','2021-06-04 13:06:23.050592','2021-06-04 13:06:23.050592',1,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"f1cfeb00-2f6c-4604-97c4-d991cf1e4526\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"f1cfeb00-2f6c-4604-97c4-d991cf1e4526\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('99a1a836-947e-4f9e-a182-90fa456afc00','2021-06-04 11:54:09.382027','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"3185ddde-5a48-4c59-83f0-77e80f283728\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('9acfab27-46d1-4977-a06f-1ddef317fb82','2021-06-04 11:54:09.978952','2021-06-04 11:54:10.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"cfe79dfb-59bd-472a-8a63-24ee0f5b4fbd\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('9bd962f0-11e6-48e0-ae96-03bf5fa724b6','2021-06-04 13:06:22.560592','2021-06-04 13:06:22.560592',1,'',0),('9e49d789-0d3c-4151-a687-7341f7cfc532','2021-06-04 13:06:36.807415','2021-06-04 13:06:37.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('9e7a1186-85bc-4442-a556-8a438e8787de','2021-06-04 13:07:21.683441','2021-06-04 13:07:21.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"a58592e0-9e27-4a9e-bd86-3f72e407ba3d\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('a1e6d3ec-0a26-4630-9221-c87d7631ce48','2021-06-04 11:54:09.035356','2021-06-04 11:54:09.035356',1,'',0),('a2452277-4ff7-4ae8-8c57-61eb4b2a8cde','2021-06-04 13:06:24.572016','2021-06-04 13:06:24.572016',1,'',0),('a7cac348-ea88-4e43-a1e9-25af836cb613','2021-06-04 13:07:07.303509','2021-06-04 13:07:07.303509',1,'',0),('a9f90ace-96e1-43d7-a548-a20f025626ef','2021-06-04 13:06:53.163498','2021-06-04 13:06:53.163498',1,'',0),('abbdb46b-2bf0-4ef9-b673-fd52f77b41e6','2021-06-04 13:06:47.363125','2021-06-04 13:06:47.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('ae815d09-2ec3-4fc1-83e5-21532dc6c5e7','2021-06-04 13:06:50.608581','2021-06-04 13:06:50.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('b570710f-6cc9-4f3b-a965-81330beef393','2021-06-04 13:06:32.423931','2021-06-04 13:06:33.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('b78374e2-80ff-4387-8445-247091e1f832','2021-06-04 13:06:23.913373','2021-06-04 13:06:23.913373',1,'',0),('c17ad694-5a6a-4a3f-8d8b-5e71bc819da2','2021-06-04 13:06:36.825536','2021-06-04 13:06:37.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('c39b4370-e96d-4576-afa4-c81466445b45','2021-06-04 13:06:56.171368','2021-06-04 13:06:56.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"eb5f8f58-25ef-4c3d-9a2e-f3efcfc9593c\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('c59cd2d5-225b-440f-a201-d16cb3cc3913','2021-06-04 11:54:08.718561','2021-06-04 11:54:08.718561',1,'',0),('c89f1b34-4d27-4e4c-a84d-6a12a278e0c9','2021-06-04 13:07:11.367191','2021-06-04 13:07:11.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"d2d42dc9-6c72-495f-8436-2d20f3c09325\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('c8c2c973-46b3-44fa-99b1-49d1861df1d4','2021-06-04 13:06:28.274996','2021-06-04 13:06:29.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('c91c1338-be98-4449-ab5f-f2fb02bec221','2021-06-04 11:54:09.992276','2021-06-04 11:54:09.992276',1,'',0),('cca2c1ca-731a-4607-851c-b4a5a68ea11e','2021-06-04 13:06:30.359743','2021-06-04 13:06:31.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('ccbd0265-e746-4c10-a1fe-e017f34870f8','2021-06-04 13:06:56.110553','2021-06-04 13:06:56.110553',1,'',0),('d0fa7865-aaf5-43d4-afc3-55591c0514a5','2021-06-04 13:06:52.316587','2021-06-04 13:06:52.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('d2049d9f-c582-42e6-8c43-73774c77793e','2021-06-04 13:07:11.409972','2021-06-04 13:07:11.409972',1,'',0),('d2ab6c4a-34eb-498a-af8f-abbba7fd8859','2021-06-04 13:07:14.554379','2021-06-04 13:07:14.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"00b5ad7f-0ec8-4308-8024-45db47a1d845\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('d352bed6-6f42-453c-a1ea-0f1b88961f83','2021-06-04 13:07:26.381397','2021-06-04 13:07:26.381397',1,'',0),('d38bb8f2-bc94-4ada-8c6a-bf2b314aed57','2021-06-04 11:54:07.737213','2021-06-04 11:54:07.737213',1,'',0),('d728c7e2-bc64-43a1-9015-f6be8c70e5ca','2021-06-04 13:06:24.540407','2021-06-04 13:06:24.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"dcaa60ea-64cd-45c4-8129-1370e3b757f4\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"dcaa60ea-64cd-45c4-8129-1370e3b757f4\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('d7fa1216-9134-43b7-a44d-f8ee809164fe','2021-06-04 13:07:26.473229','2021-06-04 13:07:26.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"5e5c6d81-ef9f-4c36-b745-f80bc2e0df40\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('d80c5cf4-de90-4ce8-bf89-84cd983dc61e','2021-06-04 13:06:39.694645','2021-06-04 13:06:41.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\",\"grantedPrivileges\":[\"read\"]}]',1),('d896adb1-3bc2-45e7-8bd1-1448bbfcb04d','2021-06-04 13:06:22.893881','2021-06-04 13:06:22.893881',1,'',0),('d935f4c2-e57e-4311-959a-ae2b8b4dc5a5','2021-06-04 13:06:55.659174','2021-06-04 13:06:55.659174',1,'',0),('d9920c53-3984-4728-ba14-dee74f9e6624','2021-06-04 13:06:59.786427','2021-06-04 13:06:59.786427',1,'',0),('da10526f-17fd-48e7-b2a7-13efec35e2de','2021-06-04 11:54:08.701784','2021-06-04 11:54:08.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"a84bbdc3-6ad2-4e95-9cb4-c3664cf84a42\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('ddfa890e-4bfc-4bd4-8685-06816fd106f9','2021-06-04 13:06:41.710220','2021-06-04 13:06:42.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('e0c4f726-0f56-4fde-ad9f-0281497e1697','2021-06-04 13:06:43.370812','2021-06-04 13:06:43.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('e2bae747-a695-4b55-b5db-db9a7b74b6ac','2021-06-04 11:54:09.327752','2021-06-04 11:54:09.327752',1,'',0),('e4963418-6eb6-4699-ba1d-a161d2f28bfc','2021-06-04 13:07:26.352982','2021-06-04 13:07:26.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"5e5c6d81-ef9f-4c36-b745-f80bc2e0df40\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('e56a2b8c-8d0a-4b35-a22e-e0bd4ec75118','2021-06-04 13:06:26.155586','2021-06-04 13:06:27.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('e829ff39-b0a8-4ce2-8fb9-ea2472ff3114','2021-06-04 13:06:36.767324','2021-06-04 13:06:37.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('e8cb6d94-db87-4b27-a8fc-716b8e118bd8','2021-06-04 13:06:26.242549','2021-06-04 13:06:27.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('e9832d9d-c63c-43c7-951c-3922e0535320','2021-06-04 13:06:45.519973','2021-06-04 13:06:45.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('ea63dc11-8d36-47ba-b307-ec2fc46c6f61','2021-06-04 13:07:21.598987','2021-06-04 13:07:21.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"a58592e0-9e27-4a9e-bd86-3f72e407ba3d\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('eaeab23e-eb60-4aad-a9d1-bf892f6fad0b','2021-06-04 13:06:36.823360','2021-06-04 13:06:37.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('eb0b5ea8-9481-4461-9434-48c6ce595974','2021-06-04 11:54:09.313753','2021-06-04 11:54:09.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"3185ddde-5a48-4c59-83f0-77e80f283728\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0),('ebd07e3e-ebef-42d9-b7fa-6d33c835388c','2021-06-04 13:06:54.684163','2021-06-04 13:06:54.684163',1,'',0),('eea09c3a-4797-4b68-b594-d1b727fe7413','2021-06-04 13:06:46.545969','2021-06-04 13:06:46.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('efc6f44d-865b-45ed-93ee-ba39cecc869d','2021-06-04 13:06:32.471329','2021-06-04 13:06:33.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('f11758e3-0bcb-47da-a3c4-10d0f885c99a','2021-06-04 13:06:22.608716','2021-06-04 13:06:22.608716',1,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('f2158d7d-8a47-4988-b9d7-ad2229879f74','2021-06-04 13:06:22.843017','2021-06-04 13:06:23.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"f1cfeb00-2f6c-4604-97c4-d991cf1e4526\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"f1cfeb00-2f6c-4604-97c4-d991cf1e4526\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('f24d10bf-a3bb-4a92-9f56-798857859905','2021-06-04 13:06:41.760697','2021-06-04 13:06:42.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]}]',1),('f5df02ca-54d4-460a-b9e2-7b3a8e82e850','2021-06-04 13:06:53.880636','2021-06-04 13:06:53.880636',1,'',0),('f6305ad6-eb50-4426-9139-285731b13c6f','2021-06-04 13:07:03.659722','2021-06-04 13:07:03.659722',1,'',0),('f8450e4e-a29a-474a-9bdd-4b31d4d07e30','2021-06-04 13:06:32.368937','2021-06-04 13:06:33.000000',3,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]}]',0),('f8c4fd59-65b1-4615-8b37-cc5bec5a0f5a','2021-06-04 13:06:26.238347','2021-06-04 13:06:27.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('f97080d4-2e70-41ea-8590-35d66ad834f3','2021-06-04 13:06:23.756184','2021-06-04 13:06:24.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-admin\",\"resourceID\":\"ac88e57d-f44b-4415-9e40-c74bb7d7ba9d\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"organisation-member\",\"resourceID\":\"ac88e57d-f44b-4415-9e40-c74bb7d7ba9d\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"update\"]}]',0),('fa5ff066-34a9-4a3b-82e7-38b39529528b','2021-06-04 13:06:44.809463','2021-06-04 13:06:44.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"ecoverse-admin\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\",\"grant\"]},{\"type\":\"ecoverse-member\",\"resourceID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\",\"grantedPrivileges\":[\"read\"]},{\"type\":\"challenge-admin\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"challenge-member\",\"resourceID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\",\"grantedPrivileges\":[\"read\"]}]',1),('fa72f746-f47d-4afc-9aa8-e71a0d693d0f','2021-06-04 11:54:07.694040','2021-06-04 11:54:07.694040',1,'',0),('fd309476-e527-4fa8-8bb1-9fb1ad96d41b','2021-06-04 11:54:07.662590','2021-06-04 11:54:07.662590',1,'',0),('fe334d17-03e7-405b-a2f0-4e424b051f2c','2021-06-04 13:07:14.440096','2021-06-04 13:07:14.000000',2,'[{\"type\":\"global-admin\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"\",\"grantedPrivileges\":[\"create\",\"read\",\"update\",\"delete\"]},{\"type\":\"user-self\",\"resourceID\":\"00b5ad7f-0ec8-4308-8024-45db47a1d845\",\"grantedPrivileges\":[\"create\",\"read\",\"update\"]},{\"type\":\"global-admin-community\",\"resourceID\":\"global-admin-community\",\"grantedPrivileges\":[\"delete\"]}]',0);
/*!40000 ALTER TABLE `authorization_definition` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challenge`
--

DROP TABLE IF EXISTS `challenge`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `challenge` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `contextId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `tagsetId` varchar(36) DEFAULT NULL,
  `parentChallengeId` varchar(36) DEFAULT NULL,
  `parentEcoverseId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_178fa41e46fd331f3501a62f6b` (`authorizationId`),
  UNIQUE KEY `REL_1deebaabfc620e881858333b0d` (`contextId`),
  UNIQUE KEY `REL_aa9668dd2340c2d794b414577b` (`communityId`),
  UNIQUE KEY `REL_3c535130cde781b69259eec7d8` (`lifecycleId`),
  UNIQUE KEY `REL_6b1bcaf365212806d8cc1f87b5` (`tagsetId`),
  KEY `FK_7d2b222d54b900071b0959f03ef` (`parentChallengeId`),
  KEY `FK_494b27cb13b59128fb24b365ca6` (`parentEcoverseId`),
  CONSTRAINT `FK_178fa41e46fd331f3501a62f6bf` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_1deebaabfc620e881858333b0d0` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_3c535130cde781b69259eec7d85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`),
  CONSTRAINT `FK_494b27cb13b59128fb24b365ca6` FOREIGN KEY (`parentEcoverseId`) REFERENCES `ecoverse` (`id`),
  CONSTRAINT `FK_6b1bcaf365212806d8cc1f87b54` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`),
  CONSTRAINT `FK_7d2b222d54b900071b0959f03ef` FOREIGN KEY (`parentChallengeId`) REFERENCES `challenge` (`id`),
  CONSTRAINT `FK_aa9668dd2340c2d794b414577b6` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challenge`
--

LOCK TABLES `challenge` WRITE;
/*!40000 ALTER TABLE `challenge` DISABLE KEYS */;
INSERT INTO `challenge` VALUES ('329f4710-8057-4a3a-bb70-aab0c4bad68e','2021-06-04 13:06:28.431760','2021-06-04 13:06:28.000000',3,'energy','energy','07d43394-d117-4118-8ce1-d53c4357cb57','3efab4c2-7cf1-460f-8348-9e84bc50b59a','52aa46a4-749a-4cda-9709-ee1aac76808c','79ed4e8c-f8a4-47a7-975e-fc8eb3801991','ccd04458-b446-4621-bc2f-a7b80b88d0ec','1ee81288-74f8-4367-9d1b-25aa218b707d',NULL,'07d43394-d117-4118-8ce1-d53c4357cb57'),('49fba4c8-d7b1-48f6-a688-b3562bb3c543','2021-06-04 13:06:32.536091','2021-06-04 13:06:32.000000',3,'climate','climate','07d43394-d117-4118-8ce1-d53c4357cb57','36de6943-5bb3-42e2-bb12-85a8c3d0d6c9','d212d140-fca0-43e5-98aa-6696e5b99b42','7c977d11-64b9-49ac-9fbf-bdf8060b40c0','7847adbc-7d3c-43dd-97a6-26f8f7b3e563','751789b3-fe9f-46c7-8fad-3b9c6ab24b80',NULL,'07d43394-d117-4118-8ce1-d53c4357cb57'),('d542fb53-0df0-4043-b4c4-6a42dededed1','2021-06-04 13:06:30.488091','2021-06-04 13:06:30.000000',3,'water','water','07d43394-d117-4118-8ce1-d53c4357cb57','55483b10-0320-4590-a69d-39c4726c1549','c61f1756-425c-40eb-b922-d08361520dbd','e793f12f-8997-4615-a143-0451966aca0f','0af14d98-1891-4f71-b764-1ba656609e3c','0f6f09f2-1f69-41a9-99b6-a9d2171af0c8',NULL,'07d43394-d117-4118-8ce1-d53c4357cb57'),('e5a0d778-7fb5-46a9-aac5-05320df7db52','2021-06-04 13:06:26.274642','2021-06-04 13:06:26.000000',3,'Food','food','07d43394-d117-4118-8ce1-d53c4357cb57','f8c4fd59-65b1-4615-8b37-cc5bec5a0f5a','35eef056-ddae-4a16-880f-8601a705a1d5','e2a7c52d-5713-46e0-be0f-941514093513','3349ab03-14cc-420d-a559-4cf9e1984383','a09ceff0-9c35-4aa1-a48a-7202c8534a6f',NULL,'07d43394-d117-4118-8ce1-d53c4357cb57');
/*!40000 ALTER TABLE `challenge` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `challenge_lead`
--

DROP TABLE IF EXISTS `challenge_lead`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `challenge_lead` (
  `challengeId` varchar(36) NOT NULL,
  `organisationId` varchar(36) NOT NULL,
  PRIMARY KEY (`challengeId`,`organisationId`),
  KEY `IDX_f457c1ae9eea70a87435cac56d` (`challengeId`),
  KEY `IDX_617eb0632402d30eb93e9a5f9e` (`organisationId`),
  CONSTRAINT `FK_617eb0632402d30eb93e9a5f9e2` FOREIGN KEY (`organisationId`) REFERENCES `organisation` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_f457c1ae9eea70a87435cac56d6` FOREIGN KEY (`challengeId`) REFERENCES `challenge` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `challenge_lead`
--

LOCK TABLES `challenge_lead` WRITE;
/*!40000 ALTER TABLE `challenge_lead` DISABLE KEYS */;
INSERT INTO `challenge_lead` VALUES ('329f4710-8057-4a3a-bb70-aab0c4bad68e','fed1b4d7-24a4-4fa0-bb27-6986f75b4584'),('49fba4c8-d7b1-48f6-a688-b3562bb3c543','dcaa60ea-64cd-45c4-8129-1370e3b757f4'),('d542fb53-0df0-4043-b4c4-6a42dededed1','ac88e57d-f44b-4415-9e40-c74bb7d7ba9d'),('e5a0d778-7fb5-46a9-aac5-05320df7db52','fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1');
/*!40000 ALTER TABLE `challenge_lead` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `community`
--

DROP TABLE IF EXISTS `community`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `community` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `credentialId` varchar(36) DEFAULT NULL,
  `parentCommunityId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_6e7584bfb417bd0f8e8696ab58` (`authorizationId`),
  UNIQUE KEY `REL_973fe78e64b8a79056d58ead43` (`credentialId`),
  KEY `FK_8e8283bdacc9e770918fe689333` (`parentCommunityId`),
  CONSTRAINT `FK_6e7584bfb417bd0f8e8696ab585` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_8e8283bdacc9e770918fe689333` FOREIGN KEY (`parentCommunityId`) REFERENCES `community` (`id`),
  CONSTRAINT `FK_973fe78e64b8a79056d58ead433` FOREIGN KEY (`credentialId`) REFERENCES `credential` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `community`
--

LOCK TABLES `community` WRITE;
/*!40000 ALTER TABLE `community` DISABLE KEYS */;
INSERT INTO `community` VALUES ('085d495d-5430-445c-b4d2-edf0ad0c9f6e','2021-06-04 13:06:39.597080','2021-06-04 13:06:39.000000',4,'Water and sanitation','07d43394-d117-4118-8ce1-d53c4357cb57','8f7b8958-458b-47df-b6a3-943656fdba44','6c9ffde9-1067-425c-a01e-2984d7b037f6','e793f12f-8997-4615-a143-0451966aca0f'),('13700d87-cc14-47ed-9be5-94599ab946b1','2021-06-04 13:06:36.780417','2021-06-04 13:06:36.000000',4,'Food security and nutrition and sustainable agriculture','07d43394-d117-4118-8ce1-d53c4357cb57','e829ff39-b0a8-4ce2-8fb9-ea2472ff3114','80e9529e-b971-4d63-9237-66e91acf4ac5','e2a7c52d-5713-46e0-be0f-941514093513'),('5d88ef7f-e07c-464e-b6d8-a81fcb554258','2021-06-04 11:54:07.613431','2021-06-04 11:54:07.000000',2,'Empty ecoverse','07d43394-d117-4118-8ce1-d53c4357cb57','7405d9bc-f50a-4188-83bd-e13f97551c5b','e344d4e3-d7c0-424f-980a-5e7e2d1dd017',NULL),('79ed4e8c-f8a4-47a7-975e-fc8eb3801991','2021-06-04 13:06:28.278519','2021-06-04 13:06:28.000000',3,'energy','07d43394-d117-4118-8ce1-d53c4357cb57','c8c2c973-46b3-44fa-99b1-49d1861df1d4','13f7918e-f1fe-44f7-a261-9c48ac05d291',NULL),('7c977d11-64b9-49ac-9fbf-bdf8060b40c0','2021-06-04 13:06:32.375493','2021-06-04 13:06:32.000000',3,'climate','07d43394-d117-4118-8ce1-d53c4357cb57','f8450e4e-a29a-474a-9bdd-4b31d4d07e30','72b4afe3-7c9f-4a8a-9030-1140c5e8f4b9',NULL),('85284503-bbf9-47ed-a718-b143ade1ca4b','2021-06-04 13:06:35.218032','2021-06-04 13:06:35.000000',4,'Rural Development','07d43394-d117-4118-8ce1-d53c4357cb57','81499c4c-dbbb-42a2-9f97-c86227e01d01','ae27e918-a6b2-413f-89d4-e9a376785736','e2a7c52d-5713-46e0-be0f-941514093513'),('d142e3de-2f35-4b3d-b9fe-a3b9d534f413','2021-06-04 13:06:41.714905','2021-06-04 13:06:41.000000',4,'Atmosphere','07d43394-d117-4118-8ce1-d53c4357cb57','ddfa890e-4bfc-4bd4-8685-06816fd106f9','2a2ed12f-176a-495f-99ac-31cebd3c712d','7c977d11-64b9-49ac-9fbf-bdf8060b40c0'),('e2a7c52d-5713-46e0-be0f-941514093513','2021-06-04 13:06:26.179676','2021-06-04 13:06:26.000000',3,'Food','07d43394-d117-4118-8ce1-d53c4357cb57','e56a2b8c-8d0a-4b35-a22e-e0bd4ec75118','23bf34e4-71fc-4008-a45b-773f58201df4',NULL),('e793f12f-8997-4615-a143-0451966aca0f','2021-06-04 13:06:30.369649','2021-06-04 13:06:30.000000',3,'water','07d43394-d117-4118-8ce1-d53c4357cb57','cca2c1ca-731a-4607-851c-b4a5a68ea11e','8e723b21-b8bf-4365-9825-1679b3eee274',NULL);
/*!40000 ALTER TABLE `community` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `context`
--

DROP TABLE IF EXISTS `context`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `context` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `tagline` varchar(255) DEFAULT NULL,
  `background` text,
  `vision` text,
  `impact` text,
  `who` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  `ecosystemModelId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_5f0dbc3b097ef297bd5f4ddb1a` (`authorizationId`),
  UNIQUE KEY `REL_a03169c3f86480ba3863924f4d` (`ecosystemModelId`),
  CONSTRAINT `FK_5f0dbc3b097ef297bd5f4ddb1a9` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_a03169c3f86480ba3863924f4d7` FOREIGN KEY (`ecosystemModelId`) REFERENCES `ecosystem_model` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `context`
--

LOCK TABLES `context` WRITE;
/*!40000 ALTER TABLE `context` DISABLE KEYS */;
INSERT INTO `context` VALUES ('03a01c54-966c-40c6-9703-f8c5d2a20848','2021-06-04 13:06:35.266708','2021-06-04 13:06:35.266708',1,'In case of meaningful opportunity title, no point of taglineFoodö','As the United Nations Secretary-General, Mr Ban Ki – Moon noted in the Millennium Development Goals Report 2015, “disparities between rural and urban areas remain pronounced” and big gaps persist in different sectors:\n\\n\\n\n\\n\\n It is estimated that in 2015 still roughly 2.8 billion people worldwide lack access to modern energy services and more than 1 billion do not have access to electricity. For the most part this grave development burden falls on rural areas, where a lack of access to modern energy services negatively affects productivity, educational attainment and even health and ultimately exacerbates the poverty trap.\n\\n\\n In rural areas, only 56 per cent of births are attended by skilled health personnel, compared with 87 per cent in urban areas.\n\\n\\n\\n About 16 per cent of the rural population do not use improved drinking water sources, compared to 4 per cent of the urban population.\n\\n\\n About 50 per cent of people living in rural areas lack improved sanitation facilities, compared to only 18 per cent of people in urban areas.','Sustainable Development Goal (SDG) 2 of the Post-2015 Development Agenda calls to “end hunger, achieve food security and improved nutrition and promote sustainable agriculture”. \\n\\nIn particular, target 2.a devotes a specific attention to “Increase investment, including through enhanced international cooperation, in rural infrastructure, agricultural research and extension services, technology development and plant and livestock gene banks in order to enhance agricultural productive capacity in developing countries, in particular least developed countries\".','2.a Increase investment, including through enhanced international cooperation, in rural infrastructure, agricultural research and extension services, technology development and plant and livestock gene banks in order to enhance agricultural productive capacity in developing countries, in particular least developed countries\n\\n\n\\n- 2.a.1 The agriculture orientation index for government expenditures\n\\n- 2.a.2 Total official flows (official development assistance plus other official flows) to the agriculture sector','Food and Agriculture Organization of the\nUnited Nations (FAO)','23ba0bad-0a24-4c13-a6a9-94fccc412be9','4fc6f66e-7870-4408-8c8f-8e5f22bf04f7'),('17b76ccd-ba5d-4c81-b520-c98d63691d0e','2021-06-04 11:54:07.839827','2021-06-04 11:54:07.839827',1,'An empty ecoverse to be populated','','','','','43874633-fcf9-4952-95ab-73b49f200b1d','0a6163dd-2b93-4adb-a128-fc8d0304ee96'),('35eef056-ddae-4a16-880f-8601a705a1d5','2021-06-04 13:06:26.247530','2021-06-04 13:06:26.247530',1,'End hunger, achieve food security and improved nutrition and promote sustainable agriculture','The total number of persons suffering from severe food insecurity has been on the rise since 2015, and there are still millions of malnourished children. The economic slowdown and the disruption of food value chains caused by the pandemic are exacerbating hunger and food insecurity. In addition, the upsurge in desert locusts remains alarming in East Africa and Yemen, where 35 million persons already experience acute food insecurity. Owing to the pandemic, some 370 million schoolchildren are missing the free school meals that they rely on. Measures to strengthen food production and distribution systems must be taken immediately to mitigate and minimize the impacts of the pandemic.\n\\n\\n\nAn estimated 26.4 per cent of the world population, about 2 billion persons, were affected by moderate or severe food insecurity in 2018, an increase from 23.2 per cent in 2014, owing mainly to increases in food insecurity in sub-Saharan Africa and Latin America. Slightly more than 700 million persons, or 9.2 per cent of the world population, experienced severe food insecurity in 2018, implying reductions in the quantity of food consumed to the extent that they possibly experienced hunger.\n\\n\\n\nThe proportion of children under 5 years of age suffering from chronic undernutrition, as well as stunting (being too short for one’s age), decreased, from 23.1 per cent in 2015 to 21.3 per cent in 2019. Globally, 144 million children under 5 years of age were still affected by stunting in 2019. Three quarters of them lived in Central and Southern Asia or sub-Saharan Africa.\n\\n\\n\nGlobally, 47 million children under 5 years of age, or 6.9 per cent, were affected by acute undernutrition or wasting (low weight for one’s height) in 2019 conditions generally caused by limited nutrient intake and infection. More than half of the wasted children lived in Central and Southern Asia. Childhood overweight affected 38 million children under 5 years of age worldwide, or 5.6 per cent, in 2019. Wasting and overweight may coexist at levels considered to be medium to high, the so-called double burden of malnutrition. In Northern Africa and South-Eastern Asia, the rate of wasting was 7.2 per cent and 8.2 per cent, respectively, while the rate of overweight was 11.3 per cent and 7.5 per cent, respectively, in 2019.\n\\n\\n\nThe share of government expenditure in the agricultural sector, measured by government expenditure in agriculture divided by the sector’s share of GDP, fell worldwide, from 0.42 to 0.31 to 0.28 per cent in 2001, 2015 and 2018, respectively. Moreover, aid to agriculture in developing countries fell, from nearly 25 per cent of all donors’ sector-allocable aid in the mid-1980s to only 5 per cent, in 2018.\n\\n\\n\nIn 2019, sharp increases in food prices were concentrated largely in sub-Saharan Africa, driven by production shocks and macroeconomic difficulties. The lingering impact of prolonged conflict and extreme weather conditions in some areas were additional factors.\n\\n\\n\nSource: Progress towards the Sustainable Development Goals, Report of the Secretary-General, https://undocs.org/en/E/2020/57','End hunger, achieve food security and improved nutrition and promote sustainable agriculture','Investment in agriculture, relative to its contribution to the economy, continues to decline\nPublic investment in agriculture can enhance productivity, attract private investment and help reduce poverty and hunger. The share of government contribution to agriculture compared with the sector’s contribution to GDP – known as the agriculture orientation index – fell from 0.42 in 2001 to 0.31 in 2015 and 0.28 in 2018 worldwide. Meanwhile, the share of sector-allocable aid to agriculture from all donors fell from nearly 25 per cent in the mid-1980s to only 5 per cent in 2018, representing $12.8 billion. The fall in agricultural aid is due to a shift in donors’ focus to social-sector issues, such as improving governance, building social capital and helping fragile states.','Global community','e8cb6d94-db87-4b27-a8fc-716b8e118bd8','eb2be239-c3dd-439e-a441-f90275f95f70'),('52aa46a4-749a-4cda-9709-ee1aac76808c','2021-06-04 13:06:28.370102','2021-06-04 13:06:28.370102',1,'Ensure access to affordable, reliable, sustainable and modern energy for all','The world is making good progress on increasing access to electricity and improving energy efficiency. However, millions of people throughout the world still lack such access, and progress on facilitating access to clean cooking fuels and technologies is too slow. The pandemic has highlighted the need for reliable and affordable electricity in health centres. In addition, a survey conducted in selected developing countries revealed that one quarter of the health facilities surveyed were not electrified, and another quarter had unscheduled outages, affecting their capacity to deliver essential health services. Such deficiencies weaken the health system’s response to the current health crisis.\n\\n\\n\nThe global electrification rate rose, from 83 per cent in 2010 to 90 per cent by 2018. Latin America and the Caribbean and Eastern and South-Eastern Asia maintained strong progress, exceeding 98 per cent access to electricity by 2018. However, the world’s deficit was increasingly concentrated in sub-Saharan Africa, where some 548 million persons, or 53 per cent of the population, lacked access to electricity.\n\\n\\n\nAccess to clean cooking fuels and technologies increased to 63 per cent in 2018, from 60 per cent in 2015 and 56 per cent in 2010. Still, 2.8 billion persons lacked such access and relied primarily on inefficient and polluting cooking systems. Because of the stagnant rate and rapid population growth, in sub-Saharan Africa, the number of people without access to clean fuels for cooking increased.\n\\n\\n\nThe renewable energy share of total final energy consumption gradually increased, from 16.3 per cent in 2010 to 17.0 per cent in 2015 and 17.3 per cent in 2017. Much faster growth is required to meet long-term climate goals.\n\\n\\n\nGlobal primary energy intensity (the energy used per unit of GDP) improved by 2.2 per cent annually, from 5.2 per cent in 2015 to 5.0 per cent in 2017, but was still short of the 2.7 per cent annual rate needed to reach target 7.3.\n\\n\\n\nInternational financial flows to developing countries in support of clean and renewable energy reached $21.4 billion in 2017, 13 per cent higher than in 2016 and a twofold increase from flows committed in 2010. Hydropower projects received 46 per cent of 2017 flows, while solar projects received 19 per cent, wind 7 per cent and geothermal 6 per cent.\n\\n\\n\nSource: Progress towards the Sustainable Development Goals, Report of the Secretary-General, https://undocs.org/en/E/2020/57','Ensure access to affordable, reliable, sustainable and modern energy for all','Deficits in electricity are increasingly concentrated in sub-Saharan Africa\nThe proportion of the global population with access to electricity increased from 83 per cent in 2010 to 90 per cent in 2018, meaning that over 1 billion people acquired this essential service. Still, 789 million people – 85 per cent in rural areas – lacked electricity in 2018. Latin America and the Caribbean and Eastern and South-Eastern Asia maintained strong progress, exceeding 98 per cent access by 2018. The deficit is increasingly concentrated in sub-Saharan Africa, affecting about 548 million people, or 53 per cent of the population.\n\\n\\n\nThe COVID-19 pandemic spotlights the need for reliable and affordable electricity. A 2018 survey conducted in six African and Asian countries showed that one quarter of health facilities surveyed were not electrified, and another quarter experienced unscheduled outages, which affected their capacity for essential health services. Damage to equipment caused by poor connections and voltage fluctuations impacted 28 per cent of health centres. These deficits further weaken the response of health systems to the coronavirus crisis.\n\\n\\n\nTo meet the target of universal access to electricity by 2030, the annual rate of electrification has to rise from the current 0.82 percentage points to 0.87 for 2019 to 2030. At the current rate of progress, a projected 620 million people would still lack access to electricity in 2030. This estimate does not, however, take into account the disruptions caused by COVID-19.\n\\n\\n\nProportion of population with access to electricity,2018 (percentage)','Global community','8f660f54-71dc-47be-b1da-7a47d0552ada','ee2b218c-cd8c-4aea-910b-a1b2a13b1fbe'),('6526e0d6-7157-486a-b658-8c24a181ddba','2021-06-04 13:06:41.767981','2021-06-04 13:06:41.767981',1,'Take urgent action to combat climate change and its impacts','Both paragraph 31 of Agenda 2030 and paragraph 91 of the Future We Want note “the significant gap between the aggregate effect of Parties’ mitigation pledges in terms of global annual emissions of greenhouse gases by 2020 and aggregate emission pathways consistent with having a likely chance of holding the increase in global average temperature below 2 °C or 1.5 °C above pre-industrial levels”.','The 2030 Agenda for Sustainable Development, through paragraph 31 “calls for the widest possible international cooperation aimed at accelerating the reduction of global greenhouse gas emissions and addressing adaptation to the adverse impacts of climate change”.','In this context, actions identified by the Johannesburg Plan of Implementation are the promotion of the “systematic observation of the Earth’s atmosphere, land and oceans by improving monitoring stations, increasing the use of satellites and appropriate integration of these observations to produce high -quality data” as well as the “enhancement of the implementation of national, regional and international strategies to monitor the Earth’s atmosphere, land and oceans, including, as appropriate, strategies for integrated global observations, inter alia, with the cooperation of relevant international organizations, especially the specialized agencies, in cooperation with the Convention”.','United Nations Department of Economic and Social Affairs (UN DESA)','f24d10bf-a3bb-4a92-9f56-798857859905','f33fed9b-6b7d-4a82-b158-a3143b87159d'),('6bc6bbca-e266-4cbf-9aac-78cb548c2552','2021-06-04 13:06:36.828171','2021-06-04 13:06:36.828171',1,'In case of meaningful opportunity title, no point of tagline','As the world population continues to grow, much more effort and innovation will be urgently needed in order to sustainably increase agricultural production, improve the global supply chain, decrease food losses and waste, and ensure that all who are suffering from hunger and malnutrition have access to nutritious food. Many in the international community believe that it is possible to eradicate hunger within the next generation, and are working together to achieve this goal.\n\\n\\n\nWorld leaders at the 2012 Conference on Sustainable Development (Rio+20) reaffirmed the right of everyone to have access to safe and nutritious food, consistent with the right to adequate food and the fundamental right of everyone to be free from hunger. The UN Secretary-General’s Zero Hunger Challenge launched at Rio+20 called on governments, civil society, faith communities, the private sector, and research institutions to unite to end hunger and eliminate the worst forms of malnutrition.\n\\n\\n\nThe Zero Hunger Challenge has since garnered widespread support from many member States and other entities. It calls for:\n\\n- Zero stunted children under the age of two\n\\n- 100% access to adequate food all year round\n\\n- All food systems are sustainable\n\\n- 100% increase in smallholder productivity and income\n\\n- Zero loss or waste of food','The Zero Hunger Challenge has since garnered widespread support from many member States and other entities. It calls for:\n\\n\n\\nZero stunted children under the age of two\n\\n100% access to adequate food all year round\n\\nAll food systems are sustainable\n\\n100% increase in smallholder productivity and income\n\\nZero loss or waste of food','Given expected changes in temperatures, precipitation and pests associated with climate change, the global community is called upon to increase investment in research, development and demonstration of technologies to improve the sustainability of food systems everywhere. Building resilience of local food systems will be critical to averting large-scale future shortages and to ensuring food security and good nutrition for all.','Food and Agriculture Organization of the United Nations (FAO)','c17ad694-5a6a-4a3f-8d8b-5e71bc819da2','d6624753-0eef-4ee0-a63b-18dd762af882'),('b538562c-0144-481c-bedd-38e6cc97e288','2021-06-04 13:06:39.697651','2021-06-04 13:06:39.697651',1,'Ensure availability and sustainable management of water and sanitation for all','Over the past several decades, ever-growing demands for – and misuse of – water resources have increased the risks of pollution and severe water stress in many parts of the world. The frequency and intensity of local water crises have been increasing, with serious implications for public health, environmental sustainability, food and energy security, and economic development. Demographics continue changing and unsustainable economic practices are affecting the quantity and quality of the water at our disposal, making water an increasingly scarce and expensive resource — especially for the poor, the marginalized and the vulnerable.','\\nBy 2030, achieve universal and equitable access to safe and affordable drinking water for all\n\\nBy 2030, achieve access to adequate and equitable sanitation and hygiene for all and end open defecation, paying special attention to the needs of women and girls and those in vulnerable situations\n\\nBy 2030, improve water quality by reducing pollution, eliminating dumping and minimizing release of hazardous chemicals and materials, halving the proportion of untreated wastewater and substantially increasing recycling and safe reuse globally','Ensure availability and sustainable management of water and sanitation for all','Food and Agriculture Organization of the United Nations (FAO)','d80c5cf4-de90-4ce8-bf89-84cd983dc61e','ebdc7d28-499b-4bc6-ac73-1b9394b37561'),('c61f1756-425c-40eb-b922-d08361520dbd','2021-06-04 13:06:30.459635','2021-06-04 13:06:30.459635',1,'Ensure availability and sustainable management of water and sanitation for all','Billions of people throughout the world still lack access to safely managed water and sanitation services and basic handwashing facilities at home, which are critical to preventing spreading the spread of COVID-19. Immediate action to improve Water, Sanitation and Hygiene for All (WASH) is critical to preventing infection and containing its spread.\n\\n\\n\nIn 2017, only 71 per cent of the global population used safely managed drinking water and just 45 per cent used safely managed sanitation services, leaving 2.2 billion persons without safely managed drinking water, including 785 million without even basic drinking water, and 4.2 billion without safely managed sanitation. Of those, 673 million persons still practised open defecation.\n\\n\\n\nIn 2016, one in four health-care facilities throughout the world lacked basic water services, and one in five had no sanitation services.\n\\n\\n\nIn 2017, 3 billion persons lacked soap and water at home. In 2016, 47 per cent of schools worldwide lacked handwashing facilities with available soap and water, and 40 per cent of health-care facilities were not equipped to practise hand hygiene at points of care.\n\\n\\n\nPreliminary estimates from 79 mostly high- and higher-middle income countries in 2019 suggest that, in about one quarter of the countries, less than half of all household wastewater flows were treated safely.\n\\n\\n\nIn 2017, Central and Southern Asia and Northern Africa registered very high water stress – defined as the ratio of fresh water withdrawn to total renewable freshwater resources – of more than 70 per cent, followed by Western Asia and Eastern Asia, with high water stress of 54 per cent and 46 per cent, respectively.\n\\n\\n\nIn 2018, 60 per cent of 172 countries reported very low, low and medium-low levels of implementation of integrated water resources management and were unlikely to meet the implementation target by 2030.\n\\n\\n\nAccording to data from 67 countries, the average percentage of national transboundary basins covered by an operational arrangement was 59 per cent in the period 2017–2018. Only 17 countries reported that all of their transboundary basins were covered by such arrangements. ·\n\\n\\n\nGlobally, in 2018, slightly more than 2.1 per cent of land was covered by freshwater bodies, although unevenly distributed, ranging from 3.5 per cent in developed countries to only 1.4 per cent in developing countries and 1.2 per cent and 1 per cent in least developed countries and small island developing States, respectively. The adverse effects of climate change can decrease the extent of freshwater bodies, thereby worsening ecosystems and livelihoods.\n\\n\\n\nODA disbursements to the water sector increased to $9 billion, or 6 per cent, in 2018, following a decrease in such disbursements in 2017. However, ODA commitments fell by 9 per cent in 2018. Because countries have signalled a funding gap of 61 per cent between what is needed to achieve national drinking water and sanitation targets and available funding, increasing donor commitments to the water sector will remain crucial to make progress towards Goal 6.\n\\n\\n\nSource: Progress towards the Sustainable Development Goals, Report of the Secretary-General, https://undocs.org/en/E/2020/57','Ensure availability and sustainable management of water and sanitation for all','Closing the gaps in water, sanitation and hygiene are critical to containing the spread of COVID-19 and other diseases\n\\n\\n\nThe proportion of the global population using safely managed drinking water services increased from 61 per cent in 2000 to 71 per cent in 2017. Despite progress, 2.2 billion people around the world still lacked safely managed drinking water, including 785 million without basic drinking water. The population using safely managed sanitation services increased from 28 per cent in 2000 to 45 per cent in 2017. However, 4.2 billion people worldwide still lacked safely managed sanitation, including 2 billion who were without basic sanitation. Of these, 673 million people practised open defecation.\n\\n\\n\nHandwashing is one of the cheapest, easiest and most effective ways to prevent the spread of the coronavirus. But in 2017, only 60 per cent of people had a basic handwashing facility with soap and water at home. In LDCs, the share was 28 per cent. This means that, in 2017, an estimated 3 billion people worldwide lacked the ability to safely wash their hands at home. The regional disparities are stark: in sub-Saharan Africa, 75 per cent of the population (767 million people) lacked basic handwashing facilities, followed by Central and Southern Asia at 42 per cent (807 million people), and Northern Africa and Western Asia at 23 per cent (116 million people).\n\\n\\n\nWater, sanitation and hygiene services are not always available in places where people seek medical care: in 2016, one in four health care facilities around the world lacked basic water supplies, one in five had no sanitation services, and two in five had no soap and water or alcohol-based hand rub, at points of care. Moreover, 47 per cent of schools worldwide lacked handwashing facilities with soap and water. Closing these gaps will be critical to providing effective health care and to containing the spread of COVID-19.','Global community','639e4737-3d92-4f28-b3b9-5dd6629a0b6a','5d687d9a-daaf-4854-8bcf-dc8221241fc1'),('d212d140-fca0-43e5-98aa-6696e5b99b42','2021-06-04 13:06:32.482198','2021-06-04 13:06:32.482198',1,'Take urgent action to combat climate change and its impacts*','The year 2019 was the second warmest on record and the end of the warmest decade, 2010 to 2019. In addition, with a global average temperature of 1.1°C above estimated pre-industrial levels, the global community is far off track to meet either the 1.5 or 2°C targets called for in the Paris Agreement. Although greenhouse gas emissions are projected to drop by 6 per cent in 2020, and air quality has improved as a result of travel bans and the economic slowdown resulting from the pandemic, the improvement is only temporary. Governments and businesses should utilize the lessons learned to accelerate the transitions needed to achieve the Paris Agreement, redefine the relationship with the environment and make systemic shifts and transformational changes to lower greenhouse gas emissions and climate-resilient economies and societies.\n\\n\\n\nA total of 85 countries have reported having a national disaster risk reduction strategy aligned with the Sendai Framework for Disaster Risk Reduction 2015–2030  to some extent since its adoption in 2015. In 2018, 55 countries reported that at least some of their local governments had a local disaster risk reduction strategy aimed at contributing to sustainable development and strengthening socioeconomic health and environmental resilience by focusing on poverty eradication, urban resilience and climate change adaptation.\n\\n\\n\nAs at 31 March 2020, 186 parties (185 countries plus the European Union) had communicated their first nationally determined contribution, and several parties had communicated their second or updated nationally determined contribution to the United Nations Framework Convention on Climate Change. Parties have been requested to update existing nationally determined contributions or communicate new ones by 2020, providing a valuable opportunity for parties to increase their level of ambition in climate action.\n\\n\\n\nIn 2019, at least 120 of 153 developing countries had undertaken activities to formulate and implement national adaptation plans, an increase of 29 countries, compared with 2018. The plans will help countries achieve the global goal on adaptation under the Paris Agreement.\n\\n\\n\nWith regard to global climate finance, there was an increase of $584 billion, or 17 per cent, from 2013 to 2014 and of $681 billion from 2015 to 2016. High levels of new private investment in renewable energy account for the spurt in growth and represent the largest segment of the global total. While these financial flows are considerable, they are relatively small in relation to the scale of annual investment needed for a low-carbon, climate-resilient transition. Moreover, investments in climate activities tracked across sectors were still surpassed by those related to fossil fuels in the energy sector alone ($781 billion in 2016).\n\\n\\n\nSource: Progress towards the Sustainable Development Goals, Report of the Secretary-General, https://undocs.org/en/E/2020/57','Take urgent action to combat climate change and its impacts','The world is way off track to meet the Paris Agreement target, signalling cataclysmic changes ahead\n\\n\\n\nTo mitigate the threat of runaway climate change, the Paris Agreement calls for limiting global warming to 1.5°C. This requires global emissions to peak as soon as possible, with a rapid fall of 45 per cent from 2010 levels by 2030, and to continue to drop off steeply to achieve net zero emissions by 2050. The world is way off track in meeting this target at the current level of nationally determined contributions. Global greenhouse gas emissions of developed countries and economies in transition have declined by 6.5 per cent over the period 2000–2018. Meanwhile, the emissions of developing countries are up by 43.2 per cent from 2000 to 2013. The rise is largely attributable to increased industrialization and enhanced economic output measured in terms of GDP.\n\\n\\n\nAs of 31 March 2020, 189 parties had ratified the Paris Agreement, and 186 parties (185 countries plus the European Union) had communicated their first nationally determined contributions to the United Nations Framework Convention on Climate Change Secretariat. Three parties had communicated their second nationally determined contributions. In addition, 17 long-term strategies, 18 national adaptation plans, and 2 adaptation communications were submitted by parties. By 2020, parties are expected to update existing nationally determined contributions or communicate new ones, with a view to substantially increasing the ambitiousness of proposed climate action. The COVID-19 pandemic, which has throttled economic activity and disrupted business as usual worldwide, offers an opportunity for countries to reassess priorities and to rebuild their economies to be greener and more resilient to climate change.','Global community','efc6f44d-865b-45ed-93ee-ba39cecc869d','5a4036a7-8468-4e9f-afc5-591115e091a4');
/*!40000 ALTER TABLE `context` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `credential`
--

DROP TABLE IF EXISTS `credential`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `credential` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `resourceID` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `agentId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `FK_dbe0929355f82e5995f0b7fd5e2` (`agentId`),
  CONSTRAINT `FK_dbe0929355f82e5995f0b7fd5e2` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `credential`
--

LOCK TABLES `credential` WRITE;
/*!40000 ALTER TABLE `credential` DISABLE KEYS */;
INSERT INTO `credential` VALUES ('03bd9330-29f4-413a-ac9b-7f236922da7e','2021-06-04 11:54:09.868603','2021-06-04 11:54:09.000000',2,'5aa8ae9c-a6f8-4566-85bc-f122abe27cb3','user-self','f42e4b0f-556b-4afe-ab24-93edf12ef8ce'),('11278945-13ba-4c63-8812-3c50dd43a598','2021-06-04 13:07:05.933144','2021-06-04 13:07:05.000000',2,'641e7678-e440-4b18-b19a-a5464287790d','user-group-member','0c41211f-698e-4f76-9ffe-da3215d3982b'),('13f7918e-f1fe-44f7-a261-9c48ac05d291','2021-06-04 13:06:28.526322','2021-06-04 13:06:28.526322',1,'329f4710-8057-4a3a-bb70-aab0c4bad68e','challenge-member',NULL),('15f72127-4f74-4d34-acba-08c242e15708','2021-06-04 13:06:59.645902','2021-06-04 13:06:59.000000',2,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member','afc806b6-d154-489d-84ec-cb4cbced8201'),('17391e10-9a7f-4de9-b672-f6c312eb9a69','2021-06-04 13:07:19.190741','2021-06-04 13:07:19.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('180cfe28-ffce-4a3f-b3eb-87daeff029a0','2021-06-04 13:07:26.217275','2021-06-04 13:07:26.000000',2,'deba5502-1c28-444d-bfd7-6eba9b862fb0','opportunity-member','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('1aef0c15-85ce-4816-a935-e1b06edcf106','2021-06-04 13:07:16.523273','2021-06-04 13:07:16.000000',2,'522d85ec-5a17-414b-a783-a681b7a5f1d1','user-group-member','4c3766dd-909c-4f93-9c77-331c72fa170b'),('1d4fd513-9db2-4565-8773-161c6f1c9b0d','2021-06-04 13:06:56.257542','2021-06-04 13:06:56.000000',2,'','global-registered','afc806b6-d154-489d-84ec-cb4cbced8201'),('23bf34e4-71fc-4008-a45b-773f58201df4','2021-06-04 13:06:26.301979','2021-06-04 13:06:26.301979',1,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member',NULL),('2a2ed12f-176a-495f-99ac-31cebd3c712d','2021-06-04 13:06:41.824558','2021-06-04 13:06:41.824558',1,'de1768df-e67b-4573-9c31-a555a10a1726','opportunity-member',NULL),('2c3271ed-8059-4200-a1cb-df1a1aecbc27','2021-06-04 11:54:10.304378','2021-06-04 11:54:10.000000',2,'','global-registered','434f747a-5c67-4790-becc-68a3e2e73715'),('2cdf1c94-f3d3-47f3-8d3c-b0d7292bc4a6','2021-06-04 13:07:00.129636','2021-06-04 13:07:00.000000',2,'8385b8de-df8e-4fd4-b814-7bf2fb985fe5','user-self','e5b827f6-71f9-495a-b958-578578a9c812'),('2eb1d60b-bdc3-4c64-8d66-a0e8ff3c2e27','2021-06-04 13:07:09.757180','2021-06-04 13:07:09.000000',2,'4795a75e-9487-4291-a4e6-b319964c8dea','user-group-member','8ebb8338-2630-4751-98fc-cf8307692e22'),('34579abf-191d-4c9c-877e-98db95e89775','2021-06-04 13:07:30.791289','2021-06-04 13:07:30.000000',2,'deba5502-1c28-444d-bfd7-6eba9b862fb0','opportunity-member','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('39f7502a-ed69-42f8-83d9-586163960be1','2021-06-04 13:07:05.645651','2021-06-04 13:07:05.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','0c41211f-698e-4f76-9ffe-da3215d3982b'),('3afcb1c3-5500-4263-b8ce-98def867a00b','2021-06-04 13:07:04.834914','2021-06-04 13:07:04.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','0c41211f-698e-4f76-9ffe-da3215d3982b'),('3e57c3b1-839f-42fa-968a-f78a80339d38','2021-06-04 11:54:08.920026','2021-06-04 11:54:08.000000',2,'a84bbdc3-6ad2-4e95-9cb4-c3664cf84a42','user-self','174e6141-3af9-4beb-aabc-82fd2ee5b252'),('3fd491be-35ad-4f77-a0f4-eba050e9e7ae','2021-06-04 13:07:07.662795','2021-06-04 13:07:07.000000',2,'','global-registered','8ebb8338-2630-4751-98fc-cf8307692e22'),('4177cc77-3049-4d2d-bf85-5a7b362a845f','2021-06-04 13:07:21.775971','2021-06-04 13:07:21.000000',2,'','global-registered','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('47cdcd93-9bc0-4ed9-af5b-b587937ac834','2021-06-04 13:07:20.229768','2021-06-04 13:07:20.000000',2,'641e7678-e440-4b18-b19a-a5464287790d','user-group-member','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('4b0b94a1-21b6-4e6a-8cc1-5e09b90a331a','2021-06-04 11:54:10.066848','2021-06-04 11:54:10.000000',2,'','global-registered','e4554d72-cb34-4b73-8bcf-0d00554674b4'),('4cd53f45-1733-4833-8293-d0ecc709f6cf','2021-06-04 13:07:17.820417','2021-06-04 13:07:17.000000',2,'deba5502-1c28-444d-bfd7-6eba9b862fb0','opportunity-member','4c3766dd-909c-4f93-9c77-331c72fa170b'),('500cd87f-c731-49f3-9a6c-8dcf6eaea8d7','2021-06-04 13:07:02.076660','2021-06-04 13:07:02.000000',2,'522d85ec-5a17-414b-a783-a681b7a5f1d1','user-group-member','e5b827f6-71f9-495a-b958-578578a9c812'),('50e2cdd0-6667-4ad2-b3be-00c1cab1f9d2','2021-06-04 13:07:28.886254','2021-06-04 13:07:28.000000',2,'4795a75e-9487-4291-a4e6-b319964c8dea','user-group-member','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('5a47a0fa-95ae-4bd9-987a-ea0a30fbbdc7','2021-06-04 13:06:57.824994','2021-06-04 13:06:57.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','afc806b6-d154-489d-84ec-cb4cbced8201'),('5c567529-7932-4f5f-b7f0-7c529fa56b23','2021-06-04 11:54:09.838360','2021-06-04 11:54:09.000000',2,'','global-registered','f42e4b0f-556b-4afe-ab24-93edf12ef8ce'),('5c844e3e-4e29-415c-be19-a33d491f07da','2021-06-04 11:54:10.105222','2021-06-04 11:54:10.000000',2,'cfe79dfb-59bd-472a-8a63-24ee0f5b4fbd','user-self','e4554d72-cb34-4b73-8bcf-0d00554674b4'),('63dd5db8-fe1b-4647-bfe7-6bc21d668a2b','2021-06-04 13:07:14.350330','2021-06-04 13:07:14.000000',2,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('644032ef-2f12-4f4b-be51-908e0a502a31','2021-06-04 13:07:11.643626','2021-06-04 13:07:11.000000',2,'','global-registered','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('6589fc68-7897-477f-8361-ce1af0ad547a','2021-06-04 13:07:24.507503','2021-06-04 13:07:24.000000',2,'1d79b345-2ab4-4607-b873-33bddbaac493','user-group-member','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('6976ba09-7350-4635-9a3e-55951b4d28c9','2021-06-04 13:07:03.962017','2021-06-04 13:07:03.000000',2,'862abbd2-d02c-460f-bcd3-0c5838faa6c9','user-self','0c41211f-698e-4f76-9ffe-da3215d3982b'),('6990b5b6-8015-4245-9bfd-4706d19a4f04','2021-06-04 13:07:28.601682','2021-06-04 13:07:28.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('6a3fcdf5-30d2-4200-8e87-df0a0b4a9b66','2021-06-04 11:54:09.222020','2021-06-04 11:54:09.000000',2,'49a053e1-3c44-4abf-9f33-f59f945226f4','user-self','8623b0c2-ea7c-42d6-b1a1-333436e72231'),('6c4d60e6-2819-4981-a6a1-e5a23f4c8c95','2021-06-04 13:07:01.786957','2021-06-04 13:07:01.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','e5b827f6-71f9-495a-b958-578578a9c812'),('6c9ffde9-1067-425c-a01e-2984d7b037f6','2021-06-04 13:06:39.783332','2021-06-04 13:06:39.783332',1,'07829bed-5c34-4ccc-9dbf-9804ec18994d','opportunity-member',NULL),('72b4afe3-7c9f-4a8a-9030-1140c5e8f4b9','2021-06-04 13:06:32.612905','2021-06-04 13:06:32.612905',1,'49fba4c8-d7b1-48f6-a688-b3562bb3c543','challenge-member',NULL),('7323d158-c96b-486a-8d8d-bd3e4af75412','2021-06-04 11:54:10.331504','2021-06-04 11:54:10.000000',2,'e49e6efd-ffd5-4b72-90ba-9898bd3c004e','user-self','434f747a-5c67-4790-becc-68a3e2e73715'),('77f778f8-40e8-4a94-9412-74b3c422c2d9','2021-06-04 13:07:18.323457','2021-06-04 13:07:18.000000',2,'3ce314f8-7169-4936-a246-5d5f5ad9eb86','user-self','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('7827a900-c9fb-4441-a926-05ade7785673','2021-06-04 11:54:08.814908','2021-06-04 11:54:08.000000',2,'','global-admin','174e6141-3af9-4beb-aabc-82fd2ee5b252'),('7a7cf21e-7baf-4571-8cbb-96a034448bb9','2021-06-04 13:07:03.881777','2021-06-04 13:07:03.000000',2,'','global-registered','0c41211f-698e-4f76-9ffe-da3215d3982b'),('80e95294-4ab8-426c-bcd3-9d34c38cb93f','2021-06-04 13:07:12.794397','2021-06-04 13:07:12.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('80e9529e-b971-4d63-9237-66e91acf4ac5','2021-06-04 13:06:36.883004','2021-06-04 13:06:36.883004',1,'deba5502-1c28-444d-bfd7-6eba9b862fb0','opportunity-member',NULL),('82878cd1-edcc-4fe2-93cc-6d4af11b5ba3','2021-06-04 13:07:21.452867','2021-06-04 13:07:21.000000',2,'deba5502-1c28-444d-bfd7-6eba9b862fb0','opportunity-member','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('83103d99-679f-444a-aa80-2c0ff485ac48','2021-06-04 13:06:58.265049','2021-06-04 13:06:58.000000',2,'1d79b345-2ab4-4607-b873-33bddbaac493','user-group-member','afc806b6-d154-489d-84ec-cb4cbced8201'),('87743120-cdfe-4622-b614-cf5f1004ac23','2021-06-04 13:07:07.149064','2021-06-04 13:07:07.000000',2,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member','0c41211f-698e-4f76-9ffe-da3215d3982b'),('88479895-1ae3-46ef-9af0-76c03bfde61c','2021-06-04 13:07:26.665991','2021-06-04 13:07:26.000000',2,'5e5c6d81-ef9f-4c36-b745-f80bc2e0df40','user-self','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('8e723b21-b8bf-4365-9825-1679b3eee274','2021-06-04 13:06:30.514876','2021-06-04 13:06:30.514876',1,'d542fb53-0df0-4043-b4c4-6a42dededed1','challenge-member',NULL),('92c395ba-3489-4b74-8abf-3b038f851c11','2021-06-04 13:07:15.477641','2021-06-04 13:07:15.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','4c3766dd-909c-4f93-9c77-331c72fa170b'),('94bbe6c5-b5d0-4ed2-b835-1c7720c59fd0','2021-06-04 11:54:09.193818','2021-06-04 11:54:09.000000',2,'','global-registered','8623b0c2-ea7c-42d6-b1a1-333436e72231'),('9712e920-9f0c-4cb3-8715-9aa70e78673a','2021-06-04 11:54:08.889783','2021-06-04 11:54:08.000000',2,'','global-registered','174e6141-3af9-4beb-aabc-82fd2ee5b252'),('9920b058-694f-4f12-8b1f-b3e56017881f','2021-06-04 13:07:11.709240','2021-06-04 13:07:11.000000',2,'d2d42dc9-6c72-495f-8436-2d20f3c09325','user-self','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('9d0013e8-da1a-42b4-b070-0538e3c83026','2021-06-04 13:07:18.201522','2021-06-04 13:07:18.000000',2,'','global-registered','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('a010b58c-d176-4a9f-9150-52e155b3f704','2021-06-04 13:06:57.200229','2021-06-04 13:06:57.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','afc806b6-d154-489d-84ec-cb4cbced8201'),('a0c72d3e-ff40-419f-9b88-d3dffa453b5b','2021-06-04 13:07:08.716878','2021-06-04 13:07:08.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','8ebb8338-2630-4751-98fc-cf8307692e22'),('a1711181-c24e-4395-9ef5-fc64703fdb1f','2021-06-04 11:54:09.569330','2021-06-04 11:54:09.000000',2,'3185ddde-5a48-4c59-83f0-77e80f283728','user-self','68549595-c718-4c85-a820-e384b0c69def'),('a1864f21-35f7-4225-b41a-1e6511d37cec','2021-06-04 11:54:09.540605','2021-06-04 11:54:09.000000',2,'','global-registered','68549595-c718-4c85-a820-e384b0c69def'),('a2af2d14-a141-4fa4-afdb-32001d6b4319','2021-06-04 13:07:27.722609','2021-06-04 13:07:27.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('ac7f8139-bab8-445a-ae76-5d4167d0680f','2021-06-04 13:07:21.850480','2021-06-04 13:07:21.000000',2,'a58592e0-9e27-4a9e-bd86-3f72e407ba3d','user-self','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('ae27e918-a6b2-413f-89d4-e9a376785736','2021-06-04 13:06:35.315138','2021-06-04 13:06:35.315138',1,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member',NULL),('b24a88e7-f0bf-4587-9e85-0045ed37f1d1','2021-06-04 11:54:09.479423','2021-06-04 11:54:09.000000',2,'','global-admin-challenges','68549595-c718-4c85-a820-e384b0c69def'),('b9403be4-6fe8-4976-a06e-fa8e9bd250b7','2021-06-04 13:07:13.487251','2021-06-04 13:07:13.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('bfde219b-ec70-483b-ac67-29c31cab41ad','2021-06-04 13:07:00.048451','2021-06-04 13:07:00.000000',2,'','global-registered','e5b827f6-71f9-495a-b958-578578a9c812'),('c04b02eb-cec5-4df8-ba1e-af0fd55c398a','2021-06-04 13:07:00.995070','2021-06-04 13:07:01.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','e5b827f6-71f9-495a-b958-578578a9c812'),('c8671d2c-68b9-4d59-9a2b-77f5e1ff7975','2021-06-04 13:07:19.951063','2021-06-04 13:07:19.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('c9bfe906-6242-4030-a535-dbebaa56a1fe','2021-06-04 13:07:16.222661','2021-06-04 13:07:16.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','4c3766dd-909c-4f93-9c77-331c72fa170b'),('cc5af155-8480-47c6-ba5b-626b284bdf6d','2021-06-04 11:54:09.132596','2021-06-04 11:54:09.000000',2,'','global-admin-community','8623b0c2-ea7c-42d6-b1a1-333436e72231'),('cfdc6253-a183-4eb8-a9ac-05a338d8b0e5','2021-06-04 13:07:14.621679','2021-06-04 13:07:14.000000',2,'','global-registered','4c3766dd-909c-4f93-9c77-331c72fa170b'),('cff385ec-40e4-4f24-8576-1eeb350d8d4d','2021-06-04 13:07:26.601660','2021-06-04 13:07:26.000000',2,'','global-registered','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('d08cea42-486a-44f3-9245-020ec1f3811f','2021-06-04 13:07:09.473359','2021-06-04 13:07:09.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','8ebb8338-2630-4751-98fc-cf8307692e22'),('dee7d4f0-31fa-44a7-a9a5-0f1683381230','2021-06-04 13:07:14.659119','2021-06-04 13:07:14.000000',2,'00b5ad7f-0ec8-4308-8024-45db47a1d845','user-self','4c3766dd-909c-4f93-9c77-331c72fa170b'),('e344d4e3-d7c0-424f-980a-5e7e2d1dd017','2021-06-04 11:54:07.645122','2021-06-04 11:54:07.645122',1,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member',NULL),('efefb9b7-4cc6-4d1c-8528-af4139ed5458','2021-06-04 13:07:07.707924','2021-06-04 13:07:07.000000',2,'be6bca67-f4a0-41a7-a96a-61ee7af830c1','user-self','8ebb8338-2630-4751-98fc-cf8307692e22'),('f486ce0f-c4b3-4b83-ade3-821fe92067e1','2021-06-04 13:07:11.070468','2021-06-04 13:07:11.000000',2,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member','8ebb8338-2630-4751-98fc-cf8307692e22'),('f95f2393-890f-4749-b3f3-0aee394f572c','2021-06-04 13:07:23.020895','2021-06-04 13:07:23.000000',2,'07d43394-d117-4118-8ce1-d53c4357cb57','ecoverse-member','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('faef4199-71ac-4cc5-995b-0d06d9d07d85','2021-06-04 13:07:03.469741','2021-06-04 13:07:03.000000',2,'b4e83b66-79a0-4c1c-9d2e-3900d66c5696','opportunity-member','e5b827f6-71f9-495a-b958-578578a9c812'),('fede1ca0-4d8f-4ab2-9d29-cd94eee86f01','2021-06-04 13:06:56.340551','2021-06-04 13:06:56.000000',2,'eb5f8f58-25ef-4c3d-9a2e-f3efcfc9593c','user-self','afc806b6-d154-489d-84ec-cb4cbced8201'),('ffe1923d-5778-42ee-ad1a-bc4f5c46f16d','2021-06-04 13:07:24.106240','2021-06-04 13:07:24.000000',2,'e5a0d778-7fb5-46a9-aac5-05320df7db52','challenge-member','0a7604f3-b135-4472-91c6-72b4ca5608c0');
/*!40000 ALTER TABLE `credential` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecosystem_model`
--

DROP TABLE IF EXISTS `ecosystem_model`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ecosystem_model` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_658580aea4e1a892227e27db90` (`authorizationId`),
  CONSTRAINT `FK_658580aea4e1a892227e27db902` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecosystem_model`
--

LOCK TABLES `ecosystem_model` WRITE;
/*!40000 ALTER TABLE `ecosystem_model` DISABLE KEYS */;
INSERT INTO `ecosystem_model` VALUES ('0a6163dd-2b93-4adb-a128-fc8d0304ee96','2021-06-04 11:54:07.632916','2021-06-04 11:54:07.632916',1,'','70f039d4-960e-4a92-85f5-1359306a0560'),('4fc6f66e-7870-4408-8c8f-8e5f22bf04f7','2021-06-04 13:06:35.238516','2021-06-04 13:06:35.238516',1,'','693961a7-f820-4550-b439-951862b9bfec'),('5a4036a7-8468-4e9f-afc5-591115e091a4','2021-06-04 13:06:32.428194','2021-06-04 13:06:32.428194',1,'','b570710f-6cc9-4f3b-a965-81330beef393'),('5d687d9a-daaf-4854-8bcf-dc8221241fc1','2021-06-04 13:06:30.390788','2021-06-04 13:06:30.390788',1,'','2e96eb39-0ef2-47e9-9865-610e7c28a8e1'),('d6624753-0eef-4ee0-a63b-18dd762af882','2021-06-04 13:06:36.810309','2021-06-04 13:06:36.810309',1,'','9e49d789-0d3c-4151-a687-7341f7cfc532'),('eb2be239-c3dd-439e-a441-f90275f95f70','2021-06-04 13:06:26.200374','2021-06-04 13:06:26.200374',1,'','320c02ff-aa39-4076-861b-179237665214'),('ebdc7d28-499b-4bc6-ac73-1b9394b37561','2021-06-04 13:06:39.650261','2021-06-04 13:06:39.650261',1,'','485f858f-f6c2-43b0-b72f-952a1962f546'),('ee2b218c-cd8c-4aea-910b-a1b2a13b1fbe','2021-06-04 13:06:28.313066','2021-06-04 13:06:28.313066',1,'','020eff13-e6f6-42a8-a7e5-17808a4c0de8'),('f33fed9b-6b7d-4a82-b158-a3143b87159d','2021-06-04 13:06:41.735560','2021-06-04 13:06:41.735560',1,'','55c74fa7-e164-4f3a-8123-9d6cd0acf0fd');
/*!40000 ALTER TABLE `ecosystem_model` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ecoverse`
--

DROP TABLE IF EXISTS `ecoverse`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ecoverse` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `contextId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `tagsetId` varchar(36) DEFAULT NULL,
  `hostId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_17a161eef37c9f07186532ab75` (`authorizationId`),
  UNIQUE KEY `REL_6db8627abbf00b1b986e359054` (`contextId`),
  UNIQUE KEY `REL_f5ad15bcb06a95c2a109fbcce2` (`communityId`),
  UNIQUE KEY `REL_ec1a68698d32f610a5fc1880c7` (`lifecycleId`),
  UNIQUE KEY `REL_3a69b0a6c67ead761763400990` (`tagsetId`),
  KEY `FK_84d2ecca9924fb1b0d2fe2d2ad6` (`hostId`),
  CONSTRAINT `FK_17a161eef37c9f07186532ab758` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_3a69b0a6c67ead7617634009903` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`),
  CONSTRAINT `FK_6db8627abbf00b1b986e359054f` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_84d2ecca9924fb1b0d2fe2d2ad6` FOREIGN KEY (`hostId`) REFERENCES `organisation` (`id`),
  CONSTRAINT `FK_ec1a68698d32f610a5fc1880c7f` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`),
  CONSTRAINT `FK_f5ad15bcb06a95c2a109fbcce2a` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ecoverse`
--

LOCK TABLES `ecoverse` WRITE;
/*!40000 ALTER TABLE `ecoverse` DISABLE KEYS */;
INSERT INTO `ecoverse` VALUES ('07d43394-d117-4118-8ce1-d53c4357cb57','2021-06-04 11:54:07.564717','2021-06-04 11:54:07.000000',2,'Empty ecoverse','Eco1','23e117f1-35f5-478b-9c5c-e37b5ae9c002','17b76ccd-ba5d-4c81-b520-c98d63691d0e','5d88ef7f-e07c-464e-b6d8-a81fcb554258','76c6be21-f36d-454e-a37f-2dc3ac5c98d7','9a523402-4bf2-44b7-9f42-9300c8f346ef','d1a1d9dd-acfb-42e4-a404-205c4329eb72');
/*!40000 ALTER TABLE `ecoverse` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lifecycle`
--

DROP TABLE IF EXISTS `lifecycle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lifecycle` (
  `id` varchar(36) NOT NULL,
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
INSERT INTO `lifecycle` VALUES ('0af14d98-1891-4f71-b764-1ba656609e3c','2021-06-04 13:06:30.505021','2021-06-04 13:06:30.505021',1,NULL,'{\"id\":\"challenge-lifecycle-default\",\"context\":{\"parentID\":\"d542fb53-0df0-4043-b4c4-6a42dededed1\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('3349ab03-14cc-420d-a559-4cf9e1984383','2021-06-04 13:06:26.291310','2021-06-04 13:06:26.291310',1,NULL,'{\"id\":\"challenge-lifecycle-default\",\"context\":{\"parentID\":\"e5a0d778-7fb5-46a9-aac5-05320df7db52\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('5728de0e-cc59-4cc8-b700-ded2002f4b1f','2021-06-04 13:06:39.764989','2021-06-04 13:06:39.764989',1,NULL,'{\"id\":\"opportunity-lifecycle-default\",\"context\":{\"parentID\":\"07829bed-5c34-4ccc-9dbf-9804ec18994d\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('76c6be21-f36d-454e-a37f-2dc3ac5c98d7','2021-06-04 11:54:07.756574','2021-06-04 11:54:07.756574',1,NULL,'{\"id\":\"challenge-lifecycle-default\",\"context\":{\"parentID\":\"07d43394-d117-4118-8ce1-d53c4357cb57\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('7847adbc-7d3c-43dd-97a6-26f8f7b3e563','2021-06-04 13:06:32.568857','2021-06-04 13:06:32.568857',1,NULL,'{\"id\":\"challenge-lifecycle-default\",\"context\":{\"parentID\":\"49fba4c8-d7b1-48f6-a688-b3562bb3c543\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('7a98542a-f68c-45e2-88b1-db1f6fac53b1','2021-06-04 13:06:36.871261','2021-06-04 13:06:36.871261',1,NULL,'{\"id\":\"opportunity-lifecycle-default\",\"context\":{\"parentID\":\"deba5502-1c28-444d-bfd7-6eba9b862fb0\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('7d1893d7-c1e2-4735-802f-58be2e8d9ebc','2021-06-04 13:06:41.811899','2021-06-04 13:06:41.811899',1,NULL,'{\"id\":\"opportunity-lifecycle-default\",\"context\":{\"parentID\":\"de1768df-e67b-4573-9c31-a555a10a1726\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('ccd04458-b446-4621-bc2f-a7b80b88d0ec','2021-06-04 13:06:28.505717','2021-06-04 13:06:28.505717',1,NULL,'{\"id\":\"challenge-lifecycle-default\",\"context\":{\"parentID\":\"329f4710-8057-4a3a-bb70-aab0c4bad68e\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}'),('dcce3a32-c4d7-482d-8224-f5aef70fcad1','2021-06-04 13:06:35.303739','2021-06-04 13:06:35.303739',1,NULL,'{\"id\":\"opportunity-lifecycle-default\",\"context\":{\"parentID\":\"b4e83b66-79a0-4c1c-9d2e-3900d66c5696\"},\"initial\":\"new\",\"states\":{\"new\":{\"on\":{\"REFINE\":\"beingRefined\",\"ABANDONED\":\"abandoned\"}},\"beingRefined\":{\"on\":{\"ACTIVE\":\"inProgress\",\"ABANDONED\":\"abandoned\"}},\"inProgress\":{\"entry\":[\"sampleEvent\"],\"on\":{\"COMPLETED\":\"complete\",\"ABANDONED\":\"abandoned\"}},\"complete\":{\"on\":{\"ARCHIVE\":\"archived\",\"ABANDONED\":\"archived\"}},\"abandoned\":{\"on\":{\"REOPEN\":\"inProgress\",\"ARCHIVE\":\"archived\"}},\"archived\":{\"type\":\"final\"}}}');
/*!40000 ALTER TABLE `lifecycle` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `migrations_typeorm`
--

LOCK TABLES `migrations_typeorm` WRITE;
/*!40000 ALTER TABLE `migrations_typeorm` DISABLE KEYS */;
INSERT INTO `migrations_typeorm` VALUES (1,1622719169501,'authorizationEngine1622719169501');
/*!40000 ALTER TABLE `migrations_typeorm` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nvp`
--

DROP TABLE IF EXISTS `nvp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nvp` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `value` varchar(255) NOT NULL,
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
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `contextId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `tagsetId` varchar(36) DEFAULT NULL,
  `challengeId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a344b754f33792cbbc58e41e89` (`authorizationId`),
  UNIQUE KEY `REL_9c169eb500e2d3823154c7b603` (`contextId`),
  UNIQUE KEY `REL_1c7744df92f39ab567084fd8c0` (`communityId`),
  UNIQUE KEY `REL_6860f1e3ae5509245bdb5c401f` (`lifecycleId`),
  UNIQUE KEY `REL_7d23d17ce61f11c92ff1ea0ed1` (`tagsetId`),
  KEY `FK_0e2c355dbb2950851dbc17a4490` (`challengeId`),
  CONSTRAINT `FK_0e2c355dbb2950851dbc17a4490` FOREIGN KEY (`challengeId`) REFERENCES `challenge` (`id`),
  CONSTRAINT `FK_1c7744df92f39ab567084fd8c09` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_6860f1e3ae5509245bdb5c401f3` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`),
  CONSTRAINT `FK_7d23d17ce61f11c92ff1ea0ed1a` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`),
  CONSTRAINT `FK_9c169eb500e2d3823154c7b603d` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_a344b754f33792cbbc58e41e898` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `opportunity`
--

LOCK TABLES `opportunity` WRITE;
/*!40000 ALTER TABLE `opportunity` DISABLE KEYS */;
INSERT INTO `opportunity` VALUES ('07829bed-5c34-4ccc-9dbf-9804ec18994d','2021-06-04 13:06:39.723527','2021-06-04 13:06:40.000000',3,'Water and sanitation','water-sanit','07d43394-d117-4118-8ce1-d53c4357cb57','2cc8a335-da3a-418e-8fe7-047d5ed29435','b538562c-0144-481c-bedd-38e6cc97e288','085d495d-5430-445c-b4d2-edf0ad0c9f6e','5728de0e-cc59-4cc8-b700-ded2002f4b1f','29aca9d3-d416-43a9-b526-7fcd2af50c3b','d542fb53-0df0-4043-b4c4-6a42dededed1'),('b4e83b66-79a0-4c1c-9d2e-3900d66c5696','2021-06-04 13:06:35.286643','2021-06-04 13:06:35.000000',3,'Rural Development','rural','07d43394-d117-4118-8ce1-d53c4357cb57','6b8ebcb9-9cf9-408c-8970-eb786f4b0b80','03a01c54-966c-40c6-9703-f8c5d2a20848','85284503-bbf9-47ed-a718-b143ade1ca4b','dcce3a32-c4d7-482d-8224-f5aef70fcad1','ef9cb565-1f7d-43a1-8a70-5cffdcb4de35','e5a0d778-7fb5-46a9-aac5-05320df7db52'),('de1768df-e67b-4573-9c31-a555a10a1726','2021-06-04 13:06:41.791736','2021-06-04 13:06:41.000000',3,'Atmosphere','atmosphere','07d43394-d117-4118-8ce1-d53c4357cb57','46ad63f1-0755-475d-bf6f-f0f169fbdbc8','6526e0d6-7157-486a-b658-8c24a181ddba','d142e3de-2f35-4b3d-b9fe-a3b9d534f413','7d1893d7-c1e2-4735-802f-58be2e8d9ebc','2975681c-eeea-49f9-9581-5b9df915190b','49fba4c8-d7b1-48f6-a688-b3562bb3c543'),('deba5502-1c28-444d-bfd7-6eba9b862fb0','2021-06-04 13:06:36.851438','2021-06-04 13:06:37.000000',3,'Food security and nutrition and sustainable agriculture','food-sec','07d43394-d117-4118-8ce1-d53c4357cb57','eaeab23e-eb60-4aad-a9d1-bf892f6fad0b','6bc6bbca-e266-4cbf-9aac-78cb548c2552','13700d87-cc14-47ed-9be5-94599ab946b1','7a98542a-f68c-45e2-88b1-db1f6fac53b1','acb5d30a-1f7a-42b8-803a-a29954a7fd83','e5a0d778-7fb5-46a9-aac5-05320df7db52');
/*!40000 ALTER TABLE `opportunity` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `organisation`
--

DROP TABLE IF EXISTS `organisation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `organisation` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `profileId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_badc07674ce4e44801e5a5f36c` (`authorizationId`),
  UNIQUE KEY `REL_037ba4b170844c039e74aa22ec` (`profileId`),
  CONSTRAINT `FK_037ba4b170844c039e74aa22ecd` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_badc07674ce4e44801e5a5f36ce` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `organisation`
--

LOCK TABLES `organisation` WRITE;
/*!40000 ALTER TABLE `organisation` DISABLE KEYS */;
INSERT INTO `organisation` VALUES ('ac88e57d-f44b-4415-9e40-c74bb7d7ba9d','2021-06-04 13:06:23.936259','2021-06-04 13:06:24.000000',2,'SDGS – water','water','2b750136-bef4-4c7b-9373-1e7b72053211','4fd52d44-d63f-4f8c-a4b6-668b152b3421'),('d1a1d9dd-acfb-42e4-a404-205c4329eb72','2021-06-04 11:54:07.741559','2021-06-04 11:54:07.741559',1,'host-org-Empty ecoverse','host-Eco1','d38bb8f2-bc94-4ada-8c6a-bf2b314aed57','9bdb90ff-886b-4a8e-ad57-81bb059c262c'),('dcaa60ea-64cd-45c4-8129-1370e3b757f4','2021-06-04 13:06:24.653877','2021-06-04 13:06:24.000000',2,'SDGS – climate','climate','5b7402aa-a383-470b-acc0-ca9ae68b550b','2484413c-e6a8-4eb3-a584-a4a430551df1'),('f1cfeb00-2f6c-4604-97c4-d991cf1e4526','2021-06-04 13:06:22.965271','2021-06-04 13:06:23.000000',2,'FAO of Unated Nations','fao','9833094e-43c1-4ee1-b72f-aa17f1d3e785','5d3a7407-86f8-429a-a914-bfa01f3107d4'),('fe38b2dc-1341-4d84-ac8f-de77bbe7fbf1','2021-06-04 13:06:22.567083','2021-06-04 13:06:22.000000',2,'SDGS – food','food','f11758e3-0bcb-47da-a3c4-10d0f885c99a','e817b9e3-ede7-46ac-b16a-d1f331951c66'),('fed1b4d7-24a4-4fa0-bb27-6986f75b4584','2021-06-04 13:06:23.528649','2021-06-04 13:06:23.000000',2,'SDGS – energy','energy','5b102308-4955-44b0-9e9d-6b43733a397c','cd279d75-6322-4ddd-b033-30245aef3fa5');
/*!40000 ALTER TABLE `organisation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `profile`
--

DROP TABLE IF EXISTS `profile`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `profile` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `avatar` text,
  `description` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_a96475631aba7dce41db03cc8b` (`authorizationId`),
  CONSTRAINT `FK_a96475631aba7dce41db03cc8b2` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `profile`
--

LOCK TABLES `profile` WRITE;
/*!40000 ALTER TABLE `profile` DISABLE KEYS */;
INSERT INTO `profile` VALUES ('0919252a-af7b-45cb-8cff-9e9804134c7f','2021-06-04 11:54:09.038635','2021-06-04 11:54:09.000000',2,'','','53f3339b-7571-4475-944e-8ab3d8a0ac4b'),('0b645a14-45d8-4984-ad2b-ce55dfc284ce','2021-06-04 13:07:07.308325','2021-06-04 13:07:07.000000',2,'https://eu.ui-avatars.com/api/?name=Lilliam+Sonny&background=A27355&color=fff','odio porttitor id consequat in consequat ut nulla sed accumsan felis ut at dolor quis odio consequat','1f746c14-e6c1-4255-baa1-c6eaa39939ba'),('0e1de8f9-484d-4ef5-93ab-684c23546a3d','2021-06-04 11:54:09.994674','2021-06-04 11:54:10.000000',2,'','','27c09992-2da5-43e5-b925-277a1418b00a'),('2484413c-e6a8-4eb3-a584-a4a430551df1','2021-06-04 13:06:24.595454','2021-06-04 13:06:24.000000',2,'','','5b7402aa-a383-470b-acc0-ca9ae68b550b'),('2616f86a-7e27-41a5-9e93-edaf233024fa','2021-06-04 11:54:10.223808','2021-06-04 11:54:10.000000',2,'','','53de0bdd-7172-4243-8808-d10cb151ba03'),('3c54643e-9f9c-4613-90bd-0277f1ebd750','2021-06-04 11:54:08.722143','2021-06-04 11:54:08.000000',2,'','','7cda2535-da57-49b7-bff8-e59768409432'),('3f647b03-b89e-4c44-a7a9-3f5325131617','2021-06-04 13:06:53.851361','2021-06-04 13:06:53.851361',1,'','','09f03308-3092-49a2-b7db-dd00e37d99fe'),('4f713171-f0bf-40a1-9a6c-25d323bdd2fe','2021-06-04 13:07:03.665681','2021-06-04 13:07:04.000000',2,'https://eu.ui-avatars.com/api/?name=Ebonie+Almeda&background=A77746&color=fff','viverra dapibus nulla suscipit ligula in lacus curabitur at ipsum ac tellus semper interdum mauris ullamcorper','59608125-fffa-42a5-972a-7306655395fc'),('4fd52d44-d63f-4f8c-a4b6-668b152b3421','2021-06-04 13:06:23.830058','2021-06-04 13:06:24.000000',2,'','','2b750136-bef4-4c7b-9373-1e7b72053211'),('5d3a7407-86f8-429a-a914-bfa01f3107d4','2021-06-04 13:06:22.899034','2021-06-04 13:06:23.000000',2,'','','9833094e-43c1-4ee1-b72f-aa17f1d3e785'),('735d22a7-f6ac-4f56-996e-7789b220bf2f','2021-06-04 13:06:56.116091','2021-06-04 13:06:56.000000',2,'https://eu.ui-avatars.com/api/?name=Lilliam+Cathie&background=A62714&color=fff','fermentum donec ut mauris eget massa tempor convallis nulla neque libero convallis eget eleifend luctus ultricies eu nibh','c39b4370-e96d-4576-afa4-c81466445b45'),('81cf8f3b-8c77-4501-b21c-ea72e819cc04','2021-06-04 13:07:18.029490','2021-06-04 13:07:18.000000',2,'https://eu.ui-avatars.com/api/?name=Madalyn+Jerold&background=A24127&color=fff','dapibus dolor vel est donec odio justo sollicitudin ut suscipit a feugiat et eros vestibulum ac est lacinia','1e857201-18ac-4e9a-806e-f01a11ed8f89'),('8e031f34-8437-44ee-9c9a-58ded68850a0','2021-06-04 13:06:54.652481','2021-06-04 13:06:54.652481',1,'','','69311923-e1c8-4beb-9568-95c5a2c94992'),('9b0e5977-0354-41a2-8b35-3a6ee7161aa5','2021-06-04 13:06:53.137186','2021-06-04 13:06:53.137186',1,'','','0a16bee0-a7a7-4c0e-ac48-45e74a6b00ab'),('9bc3712e-4008-4c8a-a66c-72b67ad10728','2021-06-04 13:06:59.802598','2021-06-04 13:07:00.000000',2,'https://eu.ui-avatars.com/api/?name=Dorcas+Christinia&background=A94677&color=fff','posuere cubilia curae nulla dapibus dolor vel est donec odio justo sollicitudin ut suscipit a feugiat','2def7116-175b-4ba9-a32f-db0f2f7e8873'),('9bdb90ff-886b-4a8e-ad57-81bb059c262c','2021-06-04 11:54:07.698130','2021-06-04 11:54:07.698130',1,'','','fa72f746-f47d-4afc-9aa8-e71a0d693d0f'),('a76f58ee-9fc8-48a3-82f6-2ca46abfbeb3','2021-06-04 11:54:09.727936','2021-06-04 11:54:09.000000',2,'','','6a23b5aa-9052-4f9e-9862-a646cd8ed98f'),('a78dbc20-081f-423d-bdd4-743238448a4c','2021-06-04 13:07:26.386117','2021-06-04 13:07:26.000000',2,'https://eu.ui-avatars.com/api/?name=Luvenia+Kena&background=A99112&color=fff','pellentesque quisque porta volutpat erat quisque erat eros viverra eget congue eget semper rutrum nulla nunc purus phasellus','d7fa1216-9134-43b7-a44d-f8ee809164fe'),('b965f30c-6d20-4de9-a39f-4ec05d10f77a','2021-06-04 13:07:21.628473','2021-06-04 13:07:21.000000',2,'https://eu.ui-avatars.com/api/?name=Alisha+Rutha&background=A72823&color=fff','sapien arcu sed augue aliquam erat volutpat in congue etiam justo etiam pretium iaculis','9e7a1186-85bc-4442-a556-8a438e8787de'),('c24dfd25-c1ed-4b1f-8a63-d6c9f1eec301','2021-06-04 13:07:14.476580','2021-06-04 13:07:14.000000',2,'https://eu.ui-avatars.com/api/?name=Elijah+Kena&background=A14415&color=fff','curae donec pharetra magna vestibulum aliquet ultrices erat tortor sollicitudin mi sit amet lobortis','d2ab6c4a-34eb-498a-af8f-abbba7fd8859'),('c4ee8a4d-2e6e-4d65-8892-1863b33b52dc','2021-06-04 13:07:11.439660','2021-06-04 13:07:11.000000',2,'https://eu.ui-avatars.com/api/?name=Kathern+Keira&background=A99616&color=fff','proin interdum mauris non ligula pellentesque ultrices phasellus id sapien in sapien iaculis congue vivamus metus','2f7cc002-e0ee-49a1-b3eb-c41030c80b26'),('cd279d75-6322-4ddd-b033-30245aef3fa5','2021-06-04 13:06:23.382783','2021-06-04 13:06:23.000000',2,'','','5b102308-4955-44b0-9e9d-6b43733a397c'),('de0aa5c8-62fa-4057-82dc-92fe25b23009','2021-06-04 11:54:09.329861','2021-06-04 11:54:09.000000',2,'','','99a1a836-947e-4f9e-a182-90fa456afc00'),('e817b9e3-ede7-46ac-b16a-d1f331951c66','2021-06-04 13:06:22.480457','2021-06-04 13:06:22.000000',2,'','','f11758e3-0bcb-47da-a3c4-10d0f885c99a'),('f2f7d718-e8ff-44aa-ac6c-e21462fdab41','2021-06-04 13:06:55.688963','2021-06-04 13:06:55.688963',1,'','','94878b98-73eb-46b9-b73f-afc7216b1de6');
/*!40000 ALTER TABLE `profile` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project`
--

DROP TABLE IF EXISTS `project`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `description` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  `lifecycleId` varchar(36) DEFAULT NULL,
  `tagsetId` varchar(36) DEFAULT NULL,
  `opportunityId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_fac8673f44e6b295e30d1c1739` (`authorizationId`),
  UNIQUE KEY `REL_f425931bb61a95ef6f6d89c9a8` (`lifecycleId`),
  UNIQUE KEY `REL_d07535c59062f86e887de8f0a5` (`tagsetId`),
  KEY `FK_35e34564793a27bb3c209a15245` (`opportunityId`),
  CONSTRAINT `FK_35e34564793a27bb3c209a15245` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity` (`id`),
  CONSTRAINT `FK_d07535c59062f86e887de8f0a57` FOREIGN KEY (`tagsetId`) REFERENCES `tagset` (`id`),
  CONSTRAINT `FK_f425931bb61a95ef6f6d89c9a85` FOREIGN KEY (`lifecycleId`) REFERENCES `lifecycle` (`id`),
  CONSTRAINT `FK_fac8673f44e6b295e30d1c1739a` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project`
--

LOCK TABLES `project` WRITE;
/*!40000 ALTER TABLE `project` DISABLE KEYS */;
/*!40000 ALTER TABLE `project` ENABLE KEYS */;
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
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `uri` text NOT NULL,
  `description` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  `contextId` varchar(36) DEFAULT NULL,
  `profileId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_73e8ae665a49366ca7e2866a45` (`authorizationId`),
  KEY `FK_07dbf4b02a078a59c216691f5eb` (`contextId`),
  KEY `FK_2f46c698fc4c19a8cc233c5f255` (`profileId`),
  CONSTRAINT `FK_07dbf4b02a078a59c216691f5eb` FOREIGN KEY (`contextId`) REFERENCES `context` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_2f46c698fc4c19a8cc233c5f255` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_73e8ae665a49366ca7e2866a45d` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reference`
--

LOCK TABLES `reference` WRITE;
/*!40000 ALTER TABLE `reference` DISABLE KEYS */;
INSERT INTO `reference` VALUES ('03703290-c0a5-427a-a796-ab7977d23881','2021-06-04 13:06:30.479789','2021-06-04 13:06:31.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_water','Jitsi meeting space for the challenge',NULL,'c61f1756-425c-40eb-b922-d08361520dbd',NULL),('265fcb8a-1cdc-4150-b94d-90131804bd02','2021-06-04 13:06:28.379623','2021-06-04 13:06:29.000000',3,'video','https://www.youtube.com/watch?v=uOFCyAjH6ew','Video explainer for the challenge',NULL,'52aa46a4-749a-4cda-9709-ee1aac76808c',NULL),('2e7c2698-1794-429a-ac80-5b9b1ad660df','2021-06-04 13:06:35.274695','2021-06-04 13:06:52.000000',4,'visual','https://sdgs.un.org/sites/default/files/styles/topic_banner/public/2020-07/rural.jpg','Banner for the opportunity',NULL,'03a01c54-966c-40c6-9703-f8c5d2a20848',NULL),('39c98616-e42e-40fc-86cb-6f3eee7a5896','2021-06-04 13:06:36.840133','2021-06-04 13:06:37.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_food-sec','Jitsi meeting space for the opportunity',NULL,'6bc6bbca-e266-4cbf-9aac-78cb548c2552',NULL),('3abadf0f-b56a-4ea4-8dee-b8506400343a','2021-06-04 13:06:26.265748','2021-06-04 13:06:27.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_Food','Jitsi meeting space for the challenge',NULL,'35eef056-ddae-4a16-880f-8601a705a1d5',NULL),('43c881a4-299e-4ee6-863e-e7a766648263','2021-06-04 13:06:35.270751','2021-06-04 13:06:52.000000',4,'video','https://www.youtube.com/watch?v=WeoIsjYBQH0','Video explainer for the opportunity',NULL,'03a01c54-966c-40c6-9703-f8c5d2a20848',NULL),('4ae11888-a605-4bba-8b3b-aeab84f996d5','2021-06-04 13:06:41.772719','2021-06-04 13:06:42.000000',3,'video','https://www.youtube.com/watch?v=TPnRqFeXiP0','Video explainer for the opportunity',NULL,'6526e0d6-7157-486a-b658-8c24a181ddba',NULL),('4b5acd89-1fe2-4f3a-9429-aecbf775093c','2021-06-04 13:06:28.412304','2021-06-04 13:06:29.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_energy','Jitsi meeting space for the challenge',NULL,'52aa46a4-749a-4cda-9709-ee1aac76808c',NULL),('5bfd9276-02a1-400b-9415-107d29477e6f','2021-06-04 13:06:32.528591','2021-06-04 13:06:33.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_climate','Jitsi meeting space for the challenge',NULL,'d212d140-fca0-43e5-98aa-6696e5b99b42',NULL),('663ad8dc-04c5-4c69-be03-22d0fd1b3cb4','2021-06-04 13:06:30.476202','2021-06-04 13:06:31.000000',3,'visual2','https://sdgs.un.org/sites/default/files/styles/sdgs_news_thumbnail/public/news/orange_and_white_key_takeaways_twitter_post.jpg?itok=CJDJihiF','Visual for the challenge',NULL,'c61f1756-425c-40eb-b922-d08361520dbd',NULL),('762ac9c0-56e3-4ec6-b6f8-2c7095211299','2021-06-04 13:06:39.711110','2021-06-04 13:06:41.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_water-sanit','Jitsi meeting space for the opportunity',NULL,'b538562c-0144-481c-bedd-38e6cc97e288',NULL),('7a52a977-dcf4-43e7-8f2a-9e1a29671306','2021-06-04 13:06:35.279487','2021-06-04 13:06:52.000000',4,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_rural','Jitsi meeting space for the opportunity',NULL,'03a01c54-966c-40c6-9703-f8c5d2a20848',NULL),('7be5912b-66f2-4a58-acab-c41dce10c02a','2021-06-04 13:06:26.261933','2021-06-04 13:06:27.000000',3,'visual2','https://unstats.un.org//sdgs/report/2020/img/goal2_icon.png','Visual for the challenge',NULL,'35eef056-ddae-4a16-880f-8601a705a1d5',NULL),('84b30dca-a2b4-4a1a-9faa-f0d229b4df26','2021-06-04 13:06:39.703570','2021-06-04 13:06:41.000000',3,'video','https://www.youtube.com/watch?v=TPnRqFeXiP0','Video explainer for the opportunity',NULL,'b538562c-0144-481c-bedd-38e6cc97e288',NULL),('885d66b4-f6a8-4d43-a825-43ed61cf234f','2021-06-04 13:06:36.834130','2021-06-04 13:06:37.000000',3,'video','https://www.youtube.com/watch?v=WeoIsjYBQH0','Video explainer for the opportunity',NULL,'6bc6bbca-e266-4cbf-9aac-78cb548c2552',NULL),('893be09a-07c8-474f-a82b-c13957cb7100','2021-06-04 13:06:28.404537','2021-06-04 13:06:29.000000',3,'visual2','https://sdgs.un.org/sites/default/files/styles/sdgs_news_thumbnail/public/news/orange_and_white_key_takeaways_twitter_post.jpg?itok=CJDJihiF','Visual for the challenge',NULL,'52aa46a4-749a-4cda-9709-ee1aac76808c',NULL),('9c1f51a7-d8a2-46f6-87fc-94a846d52fcc','2021-06-04 13:06:26.252854','2021-06-04 13:06:27.000000',3,'video','https://www.youtube.com/watch?v=v4qj6MRCdIo','Video explainer for the challenge',NULL,'35eef056-ddae-4a16-880f-8601a705a1d5',NULL),('a7ead1de-713b-4419-b1ff-d4e608c8f3f1','2021-06-04 13:06:41.779990','2021-06-04 13:06:42.000000',3,'jitsi','https://meet.jit.si/ecoverse_Dev_Env_atmosphere','Jitsi meeting space for the opportunity',NULL,'6526e0d6-7157-486a-b658-8c24a181ddba',NULL),('ae6993dc-9dfc-4544-a3b7-04dbaa9a559e','2021-06-04 13:06:39.706964','2021-06-04 13:06:41.000000',3,'visual','https://sdgs.un.org/sites/default/files/styles/topic_banner/public/2020-07/water_0.jpg','Banner for the opportunity',NULL,'b538562c-0144-481c-bedd-38e6cc97e288',NULL),('b5fa9767-9757-4721-87a0-b9b5a40eee4e','2021-06-04 13:06:41.776299','2021-06-04 13:06:42.000000',3,'visual','https://sdgs.un.org/sites/default/files/styles/topic_banner/public/2020-07/water_0.jpg','Banner for the opportunity',NULL,'6526e0d6-7157-486a-b658-8c24a181ddba',NULL),('b6b623c3-fec4-4320-bfaf-f7db67d5dd3f','2021-06-04 13:06:30.467678','2021-06-04 13:06:31.000000',3,'video','https://www.youtube.com/watch?v=YTIPokrtNQ0','Video explainer for the challenge',NULL,'c61f1756-425c-40eb-b922-d08361520dbd',NULL),('be7c5fb4-be82-4131-9845-0f711698f3d0','2021-06-04 13:06:26.257617','2021-06-04 13:06:27.000000',3,'visual','https://sdgs.un.org/sites/default/files/2020-07/The-Sustainable-Development-Goals-Report-2020_Page_09.png','Banner for the challenge',NULL,'35eef056-ddae-4a16-880f-8601a705a1d5',NULL),('bfb522e5-8993-4c9f-b286-805f7d490f2f','2021-06-04 13:06:28.393254','2021-06-04 13:06:29.000000',3,'visual','https://sdgs.un.org/sites/default/files/2020-07/The-Sustainable-Development-Goals-Report-2020_Page_14.png','Banner for the challenge',NULL,'52aa46a4-749a-4cda-9709-ee1aac76808c',NULL),('c384969a-7856-4189-91a2-d40cc441b08e','2021-06-04 13:06:32.502003','2021-06-04 13:06:33.000000',3,'video','https://www.youtube.com/watch?v=TPnRqFeXiP0','Video explainer for the challenge',NULL,'d212d140-fca0-43e5-98aa-6696e5b99b42',NULL),('c5974c87-3886-4816-b502-6d34ef38deab','2021-06-04 13:06:32.511312','2021-06-04 13:06:33.000000',3,'visual','https://sdgs.un.org/sites/default/files/2020-07/The-Sustainable-Development-Goals-Report-2020_Page_20.png','Banner for the challenge',NULL,'d212d140-fca0-43e5-98aa-6696e5b99b42',NULL),('c74dae68-5b8d-4148-b866-5eb63fb533b5','2021-06-04 13:06:36.837141','2021-06-04 13:06:37.000000',3,'visual','https://sdgs.un.org/sites/default/files/styles/topic_banner/public/2020-07/topics_13-foodsecurity-original.jpg.jpg','Banner for the opportunity',NULL,'6bc6bbca-e266-4cbf-9aac-78cb548c2552',NULL),('df1c0f52-3db0-49e4-8dcb-0087dc70a4a5','2021-06-04 13:06:32.516424','2021-06-04 13:06:33.000000',3,'visual2','https://sdgs.un.org/sites/default/files/styles/sdgs_news_thumbnail/public/news/orange_and_white_key_takeaways_twitter_post.jpg?itok=CJDJihiF','Visual for the challenge',NULL,'d212d140-fca0-43e5-98aa-6696e5b99b42',NULL),('e4850f2d-a6c5-4387-882f-a58d672d57cc','2021-06-04 13:06:30.471761','2021-06-04 13:06:31.000000',3,'visual','https://sdgs.un.org/sites/default/files/2020-07/The-Sustainable-Development-Goals-Report-2020_Page_13_0.png','Banner for the challenge',NULL,'c61f1756-425c-40eb-b922-d08361520dbd',NULL);
/*!40000 ALTER TABLE `reference` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `relation`
--

DROP TABLE IF EXISTS `relation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `relation` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `type` varchar(255) NOT NULL,
  `actorName` varchar(255) NOT NULL,
  `actorType` varchar(255) NOT NULL,
  `actorRole` varchar(255) NOT NULL,
  `description` text,
  `authorizationId` varchar(36) DEFAULT NULL,
  `opportunityId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_53fccd56207915b969b91834e0` (`authorizationId`),
  KEY `FK_d6d967126caae9df4c763985f9b` (`opportunityId`),
  CONSTRAINT `FK_53fccd56207915b969b91834e04` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_d6d967126caae9df4c763985f9b` FOREIGN KEY (`opportunityId`) REFERENCES `opportunity` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `relation`
--

LOCK TABLES `relation` WRITE;
/*!40000 ALTER TABLE `relation` DISABLE KEYS */;
INSERT INTO `relation` VALUES ('1173be22-0455-4c80-a497-8e4817a9bdb8','2021-06-04 13:06:49.770734','2021-06-04 13:06:49.000000',2,'incoming','Actor Name 5','Actor Type 5','Actore Role 5','Actor 5','7cf9c641-79c7-4d8c-b3a6-11a88dacd068','b4e83b66-79a0-4c1c-9d2e-3900d66c5696'),('1dfc0d48-66c1-4437-9f90-238ace68283b','2021-06-04 13:06:50.612815','2021-06-04 13:06:50.000000',2,'outgoing','Actor Name 6','Actor Type 6','Actore Role 6','Actor 6','ae815d09-2ec3-4fc1-83e5-21532dc6c5e7','b4e83b66-79a0-4c1c-9d2e-3900d66c5696'),('32548767-aa01-498a-8c87-bd8954f8f52c','2021-06-04 13:06:47.382703','2021-06-04 13:06:47.000000',2,'outgoing','Actor Name 2','Actor Type 2','Actore Role 2','Actor 2','abbdb46b-2bf0-4ef9-b673-fd52f77b41e6','deba5502-1c28-444d-bfd7-6eba9b862fb0'),('6524dbcb-8928-4149-81b9-37e50b893b8b','2021-06-04 13:06:48.115896','2021-06-04 13:06:48.000000',2,'incoming','Actor Name 3','Actor Type 3','Actore Role 3','Actor 3','7b5acf5b-aaef-4267-b597-be1caf63241a','deba5502-1c28-444d-bfd7-6eba9b862fb0'),('ac6f1428-7da0-4a4c-80ee-635698879ca4','2021-06-04 13:06:46.552275','2021-06-04 13:06:46.000000',2,'incoming','Actor Name 1','Actor Type 1','Actore Role 1','Actor 1','eea09c3a-4797-4b68-b594-d1b727fe7413','b4e83b66-79a0-4c1c-9d2e-3900d66c5696'),('b70c9ff3-abe7-4d2a-89bc-0ac6595e8f21','2021-06-04 13:06:49.018158','2021-06-04 13:06:49.000000',2,'outgoing','Actor Name 4','Actor Type 4','Actore Role 4','Actor 4','97bf2d9c-5c3a-4ef5-b0df-59cfab98c57f','deba5502-1c28-444d-bfd7-6eba9b862fb0'),('ba5e00bd-23c0-4fa7-9959-07ce51018202','2021-06-04 13:06:51.615906','2021-06-04 13:06:51.000000',2,'incoming','Actor Name 7','Actor Type 7','Actore Role 7','Actor 7','4f9af8c0-3f69-4feb-8913-85eb72499abb','b4e83b66-79a0-4c1c-9d2e-3900d66c5696');
/*!40000 ALTER TABLE `relation` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tagset`
--

DROP TABLE IF EXISTS `tagset`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tagset` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT 'default',
  `tags` text NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `profileId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_eb59b98ee6ef26c993d0d75c83` (`authorizationId`),
  KEY `FK_81fc213b2d9ad0cddeab1a9ce64` (`profileId`),
  CONSTRAINT `FK_81fc213b2d9ad0cddeab1a9ce64` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`),
  CONSTRAINT `FK_eb59b98ee6ef26c993d0d75c83c` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tagset`
--

LOCK TABLES `tagset` WRITE;
/*!40000 ALTER TABLE `tagset` DISABLE KEYS */;
INSERT INTO `tagset` VALUES ('050a3171-e4ca-4c63-8b67-2a6740514d6e','2021-06-04 13:07:17.958172','2021-06-04 13:07:18.000000',2,'default','','45bf94e8-83ab-4282-bfcc-0353eaa6335d','81cf8f3b-8c77-4501-b21c-ea72e819cc04'),('0886e88f-57b9-441d-94b7-61f4360b5c9d','2021-06-04 13:06:23.317886','2021-06-04 13:06:23.000000',2,'default','','1ecc4666-da97-47e1-ae81-f98af99c7d29','cd279d75-6322-4ddd-b033-30245aef3fa5'),('0f6f09f2-1f69-41a9-99b6-a9d2171af0c8','2021-06-04 13:06:30.483971','2021-06-04 13:06:40.000000',4,'default','',NULL,NULL),('157bdb6a-bcf8-469f-bda3-fbe000029f3e','2021-06-04 11:54:09.021716','2021-06-04 11:54:09.000000',2,'default','','123cd4d8-fe3f-47d3-8b2d-496fe1db9e83','0919252a-af7b-45cb-8cff-9e9804134c7f'),('15ecc765-8369-4dac-bf78-4976e835ca22','2021-06-04 11:54:09.315906','2021-06-04 11:54:09.000000',2,'default','','eb0b5ea8-9481-4461-9434-48c6ce595974','de0aa5c8-62fa-4057-82dc-92fe25b23009'),('1ee81288-74f8-4367-9d1b-25aa218b707d','2021-06-04 13:06:28.420664','2021-06-04 13:06:32.000000',4,'default','',NULL,NULL),('269324ee-3774-4224-8ecb-919b04e9e143','2021-06-04 13:06:56.071142','2021-06-04 13:06:56.000000',2,'default','','4dec3fa4-31e9-4f9a-8c31-786dd5ad2250','735d22a7-f6ac-4f56-996e-7789b220bf2f'),('2975681c-eeea-49f9-9581-5b9df915190b','2021-06-04 13:06:41.787076','2021-06-04 13:06:41.787076',1,'default','',NULL,NULL),('29aca9d3-d416-43a9-b526-7fcd2af50c3b','2021-06-04 13:06:39.716275','2021-06-04 13:06:39.716275',1,'default','',NULL,NULL),('3a12a8ae-32fb-4947-a53e-785f30f849c7','2021-06-04 13:07:14.448078','2021-06-04 13:07:14.000000',2,'default','','fe334d17-03e7-405b-a2f0-4e424b051f2c','c24dfd25-c1ed-4b1f-8a63-d6c9f1eec301'),('59b679a6-cc33-4871-a501-f263d0ef07c6','2021-06-04 11:54:09.981424','2021-06-04 11:54:09.000000',2,'default','','9acfab27-46d1-4977-a06f-1ddef317fb82','0e1de8f9-484d-4ef5-93ab-684c23546a3d'),('5ba21166-bfe8-4d20-9634-e78c78da7c88','2021-06-04 13:06:22.849859','2021-06-04 13:06:22.000000',2,'default','','f2158d7d-8a47-4988-b9d7-ad2229879f74','5d3a7407-86f8-429a-a914-bfa01f3107d4'),('5bc11e48-ecba-4895-a1c6-282336e96f25','2021-06-04 13:07:07.280912','2021-06-04 13:07:07.000000',2,'default','','20a9eda6-e8a2-4983-ac3a-a68b4f3c615d','0b645a14-45d8-4984-ad2b-ce55dfc284ce'),('751789b3-fe9f-46c7-8fad-3b9c6ab24b80','2021-06-04 13:06:32.532521','2021-06-04 13:06:41.000000',3,'default','',NULL,NULL),('83828ab5-08dc-4157-8dab-0f978e30b2c1','2021-06-04 11:54:07.667150','2021-06-04 11:54:07.000000',2,'default','','fd309476-e527-4fa8-8bb1-9fb1ad96d41b','9bdb90ff-886b-4a8e-ad57-81bb059c262c'),('844a4be3-d587-4640-a973-59385a614e22','2021-06-04 13:06:53.812048','2021-06-04 13:06:53.000000',2,'default','','729f43e0-52d0-4f3e-a4a0-8a1b3448c664','3f647b03-b89e-4c44-a7a9-3f5325131617'),('8b869f8a-fc37-41f8-8953-5b310d0bdea3','2021-06-04 11:54:10.203029','2021-06-04 11:54:10.000000',2,'default','','226378e4-6fb0-4257-a857-35a0f7f8070e','2616f86a-7e27-41a5-9e93-edaf233024fa'),('8f9c2a16-dd5b-40e4-86d6-866bd59932ba','2021-06-04 13:06:55.661622','2021-06-04 13:06:55.000000',2,'default','','d935f4c2-e57e-4311-959a-ae2b8b4dc5a5','f2f7d718-e8ff-44aa-ac6c-e21462fdab41'),('93199f67-68f9-427a-8c3c-1b6d4f30bf7c','2021-06-04 11:54:09.706084','2021-06-04 11:54:09.000000',2,'default','','31fd69dd-56b4-4ca8-805d-6c835d309358','a76f58ee-9fc8-48a3-82f6-2ca46abfbeb3'),('9a523402-4bf2-44b7-9f42-9300c8f346ef','2021-06-04 11:54:07.835391','2021-06-04 13:06:32.000000',5,'default','',NULL,NULL),('a09ceff0-9c35-4aa1-a48a-7202c8534a6f','2021-06-04 13:06:26.269583','2021-06-04 13:06:37.000000',7,'default','',NULL,NULL),('aa145144-426b-4668-b262-10a8f6fc9445','2021-06-04 13:06:22.438831','2021-06-04 13:06:22.000000',2,'default','','53be2c10-afdc-453e-afa1-1d462c6abb72','e817b9e3-ede7-46ac-b16a-d1f331951c66'),('acb5d30a-1f7a-42b8-803a-a29954a7fd83','2021-06-04 13:06:36.846490','2021-06-04 13:06:49.000000',4,'default','',NULL,NULL),('c6a2643f-dd71-4132-acec-4890fedddd69','2021-06-04 13:06:23.790502','2021-06-04 13:06:23.000000',2,'default','','f97080d4-2e70-41ea-8590-35d66ad834f3','4fd52d44-d63f-4f8c-a4b6-668b152b3421'),('d1078585-9b8c-4361-8e9c-7984f4db610f','2021-06-04 13:07:21.603293','2021-06-04 13:07:21.000000',2,'default','','ea63dc11-8d36-47ba-b307-ec2fc46c6f61','b965f30c-6d20-4de9-a39f-4ec05d10f77a'),('d6db933e-6e27-41d1-93c5-e5e177e40ed8','2021-06-04 13:06:54.627299','2021-06-04 13:06:54.000000',2,'default','','761784c8-8c82-4bdb-93b7-0ce3ce544180','8e031f34-8437-44ee-9c9a-58ded68850a0'),('d98d3424-4af5-4768-8185-9727e9b80df4','2021-06-04 11:54:08.705094','2021-06-04 11:54:08.000000',2,'default','','da10526f-17fd-48e7-b2a7-13efec35e2de','3c54643e-9f9c-4613-90bd-0277f1ebd750'),('db4eb348-3f4f-4898-9ce2-b4976e0723d8','2021-06-04 13:07:03.607057','2021-06-04 13:07:03.000000',2,'default','','39fd3768-6d79-4ed6-914f-ccc4291432b3','4f713171-f0bf-40a1-9a6c-25d323bdd2fe'),('ded89717-374a-40bd-8dbd-56572b37d58a','2021-06-04 13:06:53.115706','2021-06-04 13:06:53.000000',2,'default','','4ca31cb1-0889-4cba-b335-4591729b55dd','9b0e5977-0354-41a2-8b35-3a6ee7161aa5'),('e124c4e5-1734-4a90-ab4f-85fe9fe96533','2021-06-04 13:07:26.360261','2021-06-04 13:07:26.000000',2,'default','','e4963418-6eb6-4699-ba1d-a161d2f28bfc','a78dbc20-081f-423d-bdd4-743238448a4c'),('ef90eff7-81b9-4961-9849-c960ee8de737','2021-06-04 13:07:11.374740','2021-06-04 13:07:11.000000',2,'default','','c89f1b34-4d27-4e4c-a84d-6a12a278e0c9','c4ee8a4d-2e6e-4d65-8892-1863b33b52dc'),('ef9cb565-1f7d-43a1-8a70-5cffdcb4de35','2021-06-04 13:06:35.282910','2021-06-04 13:06:51.000000',6,'default','',NULL,NULL),('fd0e194b-03b0-4202-9e38-223089d45a77','2021-06-04 13:06:24.546079','2021-06-04 13:06:24.000000',2,'default','','d728c7e2-bc64-43a1-9015-f6be8c70e5ca','2484413c-e6a8-4eb3-a584-a4a430551df1'),('ff6995c8-1885-41ae-9928-afa3cf109d8a','2021-06-04 13:06:59.768412','2021-06-04 13:06:59.000000',2,'default','','4c6df328-c462-4ef8-ab67-3af03b6cdc14','9bc3712e-4008-4c8a-a66c-72b67ad10728');
/*!40000 ALTER TABLE `tagset` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `displayName` varchar(255) NOT NULL,
  `nameID` varchar(255) NOT NULL,
  `accountUpn` varchar(255) NOT NULL,
  `firstName` varchar(255) NOT NULL,
  `lastName` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(255) NOT NULL,
  `city` varchar(255) NOT NULL,
  `country` varchar(255) NOT NULL,
  `gender` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `profileId` varchar(36) DEFAULT NULL,
  `agentId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_09f909622aa177a097256b7cc2` (`authorizationId`),
  UNIQUE KEY `REL_9466682df91534dd95e4dbaa61` (`profileId`),
  UNIQUE KEY `REL_b61c694cacfab25533bd23d9ad` (`agentId`),
  CONSTRAINT `FK_09f909622aa177a097256b7cc22` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9466682df91534dd95e4dbaa616` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_b61c694cacfab25533bd23d9add` FOREIGN KEY (`agentId`) REFERENCES `agent` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES ('00b5ad7f-0ec8-4308-8024-45db47a1d845','2021-06-04 13:07:14.560781','2021-06-04 13:07:14.560781',1,'Elijah Kena','elijahkena','','Elijah','Kena','Elijah@Kena.com','196-687-5811','Groningen','Netherlands','Male','d2ab6c4a-34eb-498a-af8f-abbba7fd8859','c24dfd25-c1ed-4b1f-8a63-d6c9f1eec301','4c3766dd-909c-4f93-9c77-331c72fa170b'),('3185ddde-5a48-4c59-83f0-77e80f283728','2021-06-04 11:54:09.387241','2021-06-04 11:54:09.387241',1,'ecoverse admin','ecoverse_admin','ecoverse.admin@cherrytwist.org','ecoverse','admin','ecoverse.admin@cherrytwist.org','','','','','99a1a836-947e-4f9e-a182-90fa456afc00','de0aa5c8-62fa-4057-82dc-92fe25b23009','68549595-c718-4c85-a820-e384b0c69def'),('3ce314f8-7169-4936-a246-5d5f5ad9eb86','2021-06-04 13:07:18.096882','2021-06-04 13:07:18.096882',1,'Madalyn Jerold','madalynjerold','','Madalyn','Jerold','Madalyn@Jerold.com','170-596-1269','Groningen','Netherlands','Male','1e857201-18ac-4e9a-806e-f01a11ed8f89','81cf8f3b-8c77-4501-b21c-ea72e819cc04','0ad864e7-f103-4187-9c3c-11819e2e7cc9'),('49a053e1-3c44-4abf-9f33-f59f945226f4','2021-06-04 11:54:09.078132','2021-06-04 11:54:09.078132',1,'community admin','community_admin','community.admin@cherrytwist.org','community','admin','community.admin@cherrytwist.org','','','','','53f3339b-7571-4475-944e-8ab3d8a0ac4b','0919252a-af7b-45cb-8cff-9e9804134c7f','8623b0c2-ea7c-42d6-b1a1-333436e72231'),('5aa8ae9c-a6f8-4566-85bc-f122abe27cb3','2021-06-04 11:54:09.792764','2021-06-04 11:54:09.792764',1,'ecoverse member','ecoverse_member','ecoverse.member@cherrytwist.org','ecoverse','member','ecoverse.member@cherrytwist.org','','','','','6a23b5aa-9052-4f9e-9862-a646cd8ed98f','a76f58ee-9fc8-48a3-82f6-2ca46abfbeb3','f42e4b0f-556b-4afe-ab24-93edf12ef8ce'),('5e5c6d81-ef9f-4c36-b745-f80bc2e0df40','2021-06-04 13:07:26.490553','2021-06-04 13:07:26.490553',1,'Luvenia Kena','luveniakena','','Luvenia','Kena','Luvenia@Kena.com','605-247-8055','London Dungeon','Untied Kingdom','Male','d7fa1216-9134-43b7-a44d-f8ee809164fe','a78dbc20-081f-423d-bdd4-743238448a4c','4d22d3e8-06a0-4265-ad1b-4c2296f72b42'),('8385b8de-df8e-4fd4-b814-7bf2fb985fe5','2021-06-04 13:06:59.881710','2021-06-04 13:06:59.881710',1,'Dorcas Christinia','dorcaschristinia','','Dorcas','Christinia','Dorcas@Christinia.com','304-105-1713','Groningen','Netherlands','Male','2def7116-175b-4ba9-a32f-db0f2f7e8873','9bc3712e-4008-4c8a-a66c-72b67ad10728','e5b827f6-71f9-495a-b958-578578a9c812'),('862abbd2-d02c-460f-bcd3-0c5838faa6c9','2021-06-04 13:07:03.785464','2021-06-04 13:07:03.785464',1,'Ebonie Almeda','eboniealmeda','','Ebonie','Almeda','Ebonie@Almeda.com','888-733-7554','Groningen','Netherlands','Male','59608125-fffa-42a5-972a-7306655395fc','4f713171-f0bf-40a1-9a6c-25d323bdd2fe','0c41211f-698e-4f76-9ffe-da3215d3982b'),('a58592e0-9e27-4a9e-bd86-3f72e407ba3d','2021-06-04 13:07:21.686764','2021-06-04 13:07:21.686764',1,'Alisha Rutha','alisharutha','','Alisha','Rutha','Alisha@Rutha.com','590-632-6853','Groningen','Netherlands','Male','9e7a1186-85bc-4442-a556-8a438e8787de','b965f30c-6d20-4de9-a39f-4ec05d10f77a','0a7604f3-b135-4472-91c6-72b4ca5608c0'),('a84bbdc3-6ad2-4e95-9cb4-c3664cf84a42','2021-06-04 11:54:08.770845','2021-06-04 11:54:08.770845',1,'admin cherrytwist','admin_cherrytwist','admin@cherrytwist.org','admin','cherrytwist','admin@cherrytwist.org','','','','','7cda2535-da57-49b7-bff8-e59768409432','3c54643e-9f9c-4613-90bd-0277f1ebd750','174e6141-3af9-4beb-aabc-82fd2ee5b252'),('be6bca67-f4a0-41a7-a96a-61ee7af830c1','2021-06-04 13:07:07.456112','2021-06-04 13:07:07.456112',1,'Lilliam Sonny','lilliamsonny','','Lilliam','Sonny','Lilliam@Sonny.com','323-455-1267','Mutton','Scotland','Male','1f746c14-e6c1-4255-baa1-c6eaa39939ba','0b645a14-45d8-4984-ad2b-ce55dfc284ce','8ebb8338-2630-4751-98fc-cf8307692e22'),('cfe79dfb-59bd-472a-8a63-24ee0f5b4fbd','2021-06-04 11:54:10.029041','2021-06-04 11:54:10.029041',1,'Qa User','Qa_User','qa.user@cherrytwist.org','Qa','User','qa.user@cherrytwist.org','','','','','27c09992-2da5-43e5-b925-277a1418b00a','0e1de8f9-484d-4ef5-93ab-684c23546a3d','e4554d72-cb34-4b73-8bcf-0d00554674b4'),('d2d42dc9-6c72-495f-8436-2d20f3c09325','2021-06-04 13:07:11.529636','2021-06-04 13:07:11.529636',1,'Kathern Keira','kathernkeira','','Kathern','Keira','Kathern@Keira.com','181-434-4769','Den Haag','Netherlands','Male','2f7cc002-e0ee-49a1-b3eb-c41030c80b26','c4ee8a4d-2e6e-4d65-8892-1863b33b52dc','81fa4741-e66d-4c28-8f76-dcdae1e6936d'),('e49e6efd-ffd5-4b72-90ba-9898bd3c004e','2021-06-04 11:54:10.260085','2021-06-04 11:54:10.260085',1,'non ecoverse','non_ecoverse','non.ecoverse@cherrytwist.org','non','ecoverse','non.ecoverse@cherrytwist.org','','','','','53de0bdd-7172-4243-8808-d10cb151ba03','2616f86a-7e27-41a5-9e93-edaf233024fa','434f747a-5c67-4790-becc-68a3e2e73715'),('eb5f8f58-25ef-4c3d-9a2e-f3efcfc9593c','2021-06-04 13:06:56.175400','2021-06-04 13:06:56.175400',1,'Lilliam Cathie','lilliamcathie','','Lilliam','Cathie','Lilliam@Cathie.com','397-113-1319','Leeuwarden','Netherlands','Male','c39b4370-e96d-4576-afa4-c81466445b45','735d22a7-f6ac-4f56-996e-7789b220bf2f','afc806b6-d154-489d-84ec-cb4cbced8201');
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_group`
--

DROP TABLE IF EXISTS `user_group`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_group` (
  `id` varchar(36) NOT NULL,
  `createdDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updatedDate` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `version` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `ecoverseID` varchar(255) NOT NULL,
  `authorizationId` varchar(36) DEFAULT NULL,
  `profileId` varchar(36) DEFAULT NULL,
  `organisationId` varchar(36) DEFAULT NULL,
  `communityId` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `REL_e8e32f1e59c349b406a4752e54` (`authorizationId`),
  UNIQUE KEY `REL_9912e4cfc1e09848a392a65151` (`profileId`),
  KEY `FK_2b8381df8c3a1680f50e4bc2351` (`organisationId`),
  KEY `FK_9fcc131f256e969d773327f07cb` (`communityId`),
  CONSTRAINT `FK_2b8381df8c3a1680f50e4bc2351` FOREIGN KEY (`organisationId`) REFERENCES `organisation` (`id`) ON DELETE SET NULL,
  CONSTRAINT `FK_9912e4cfc1e09848a392a651514` FOREIGN KEY (`profileId`) REFERENCES `profile` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_9fcc131f256e969d773327f07cb` FOREIGN KEY (`communityId`) REFERENCES `community` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_e8e32f1e59c349b406a4752e545` FOREIGN KEY (`authorizationId`) REFERENCES `authorization_definition` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_group`
--

LOCK TABLES `user_group` WRITE;
/*!40000 ALTER TABLE `user_group` DISABLE KEYS */;
INSERT INTO `user_group` VALUES ('1d79b345-2ab4-4607-b873-33bddbaac493','2021-06-04 13:06:54.691793','2021-06-04 13:06:54.000000',2,'Admins','07d43394-d117-4118-8ce1-d53c4357cb57','ebd07e3e-ebef-42d9-b7fa-6d33c835388c','8e031f34-8437-44ee-9c9a-58ded68850a0',NULL,'5d88ef7f-e07c-464e-b6d8-a81fcb554258'),('4795a75e-9487-4291-a4e6-b319964c8dea','2021-06-04 13:06:55.769462','2021-06-04 13:06:55.000000',2,'ChallengeLeads','07d43394-d117-4118-8ce1-d53c4357cb57','6143e5bd-f448-40ce-8622-0e2935887189','f2f7d718-e8ff-44aa-ac6c-e21462fdab41',NULL,'5d88ef7f-e07c-464e-b6d8-a81fcb554258'),('522d85ec-5a17-414b-a783-a681b7a5f1d1','2021-06-04 13:06:53.883759','2021-06-04 13:06:53.000000',2,'Stakeholders','07d43394-d117-4118-8ce1-d53c4357cb57','f5df02ca-54d4-460a-b9e2-7b3a8e82e850','3f647b03-b89e-4c44-a7a9-3f5325131617',NULL,'5d88ef7f-e07c-464e-b6d8-a81fcb554258'),('641e7678-e440-4b18-b19a-a5464287790d','2021-06-04 13:06:53.166532','2021-06-04 13:06:53.000000',2,'Assistants','07d43394-d117-4118-8ce1-d53c4357cb57','a9f90ace-96e1-43d7-a548-a20f025626ef','9b0e5977-0354-41a2-8b35-3a6ee7161aa5',NULL,'5d88ef7f-e07c-464e-b6d8-a81fcb554258');
/*!40000 ALTER TABLE `user_group` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2021-06-04 16:10:58
