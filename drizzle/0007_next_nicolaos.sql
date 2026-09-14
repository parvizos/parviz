CREATE TABLE `attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`lesson_id` text,
	`date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lesson_id`) REFERENCES `lessons`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attendance_subject_idx` ON `attendance` (`subject_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_slot_unq` ON `attendance` (`lesson_id`,`date`);--> statement-breakpoint
CREATE TABLE `exams` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`kind` text DEFAULT 'exam' NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`location` text,
	`autopass` integer DEFAULT false NOT NULL,
	`passed_at` integer,
	`grade` real,
	`readiness` integer DEFAULT 0 NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `exams_subject_idx` ON `exams` (`subject_id`);--> statement-breakpoint
CREATE INDEX `exams_date_idx` ON `exams` (`date`);--> statement-breakpoint
CREATE TABLE `grades` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text NOT NULL,
	`value` real NOT NULL,
	`max_value` real DEFAULT 5 NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`title` text,
	`date` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `grades_subject_idx` ON `grades` (`subject_id`);--> statement-breakpoint
CREATE INDEX `grades_date_idx` ON `grades` (`date`);--> statement-breakpoint
CREATE TABLE `study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`subject_id` text,
	`seconds` integer NOT NULL,
	`date` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `study_sessions_subject_idx` ON `study_sessions` (`subject_id`);--> statement-breakpoint
CREATE INDEX `study_sessions_date_idx` ON `study_sessions` (`date`);--> statement-breakpoint
ALTER TABLE `subjects` ADD `credits` integer;