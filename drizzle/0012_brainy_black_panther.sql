CREATE TABLE `credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`username` text,
	`url` text,
	`category` text,
	`note` text,
	`password_cipher` text,
	`favorite` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `credentials_category_idx` ON `credentials` (`category`);