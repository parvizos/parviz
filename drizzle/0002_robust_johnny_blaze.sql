CREATE TABLE `journal` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`mood` integer,
	`body` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_date_unique` ON `journal` (`date`);