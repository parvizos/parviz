CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'other' NOT NULL,
	`note` text,
	`url` text,
	`color` text,
	`icon` text,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `organizations_position_idx` ON `organizations` (`position`);--> statement-breakpoint
CREATE TABLE `people` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text,
	`organization_id` text,
	`phone` text,
	`email` text,
	`birthday` text,
	`note` text,
	`color` text,
	`icon` text,
	`position` integer DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `people_org_idx` ON `people` (`organization_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `person_id` text REFERENCES people(id);--> statement-breakpoint
CREATE INDEX `tasks_person_idx` ON `tasks` (`person_id`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `person_id` text REFERENCES people(id);--> statement-breakpoint
CREATE INDEX `transactions_person_idx` ON `transactions` (`person_id`);