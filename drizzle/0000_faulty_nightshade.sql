CREATE TABLE `areas` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`icon` text,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `areas_position_idx` ON `areas` (`position`);--> statement-breakpoint
CREATE TABLE `entity_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`tag_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entity_tags_unq` ON `entity_tags` (`tag_id`,`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `entity_tags_entity_idx` ON `entity_tags` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` text PRIMARY KEY NOT NULL,
	`from_type` text NOT NULL,
	`from_id` text NOT NULL,
	`to_type` text NOT NULL,
	`to_id` text NOT NULL,
	`rel` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `links_unq` ON `links` (`from_type`,`from_id`,`to_type`,`to_id`,`rel`);--> statement-breakpoint
CREATE INDEX `links_from_idx` ON `links` (`from_type`,`from_id`);--> statement-breakpoint
CREATE INDEX `links_to_idx` ON `links` (`to_type`,`to_id`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`notes` text,
	`area_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`due_date` text,
	`completed_at` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `projects_area_idx` ON `projects` (`area_id`);--> statement-breakpoint
CREATE INDEX `projects_status_idx` ON `projects` (`status`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unq` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'open' NOT NULL,
	`project_id` text,
	`area_id` text,
	`scheduled_date` text,
	`due_date` text,
	`priority` integer DEFAULT 0 NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_project_idx` ON `tasks` (`project_id`);--> statement-breakpoint
CREATE INDEX `tasks_area_idx` ON `tasks` (`area_id`);--> statement-breakpoint
CREATE INDEX `tasks_scheduled_idx` ON `tasks` (`scheduled_date`);--> statement-breakpoint
CREATE INDEX `tasks_due_idx` ON `tasks` (`due_date`);