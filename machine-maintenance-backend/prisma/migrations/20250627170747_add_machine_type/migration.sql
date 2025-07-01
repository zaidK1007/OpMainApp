-- AlterTable
ALTER TABLE `Machine` ADD COLUMN `machineType` VARCHAR(191) NOT NULL DEFAULT 'general';

-- AlterTable
ALTER TABLE `MaintenanceTask` ADD COLUMN `taskTemplateId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `MaintenanceTaskTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `task` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'daily',
    `machineType` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MaintenanceTask` ADD CONSTRAINT `MaintenanceTask_taskTemplateId_fkey` FOREIGN KEY (`taskTemplateId`) REFERENCES `MaintenanceTaskTemplate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
