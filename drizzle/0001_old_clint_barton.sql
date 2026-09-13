CREATE TABLE `lessons` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text,
	`end_time` text,
	`location` text,
	`kind` text DEFAULT 'lecture' NOT NULL,
	`note` text,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `lessons_subject_idx` ON `lessons` (`subject_id`);--> statement-breakpoint
CREATE INDEX `lessons_day_idx` ON `lessons` (`day_of_week`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`subject_id` text,
	`pinned` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `notes_subject_idx` ON `notes` (`subject_id`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`teacher` text,
	`color` text,
	`icon` text,
	`area_id` text,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `subjects_position_idx` ON `subjects` (`position`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `subject_id` text REFERENCES subjects(id);--> statement-breakpoint
CREATE INDEX `tasks_subject_idx` ON `tasks` (`subject_id`);