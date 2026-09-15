CREATE TABLE `meetings` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`date` text NOT NULL,
	`person_id` text,
	`location` text,
	`body` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `meetings_person_idx` ON `meetings` (`person_id`);--> statement-breakpoint
CREATE INDEX `meetings_date_idx` ON `meetings` (`date`);