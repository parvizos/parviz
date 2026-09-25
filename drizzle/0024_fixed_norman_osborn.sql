ALTER TABLE `files` ADD `storage` text DEFAULT 'db' NOT NULL;--> statement-breakpoint
ALTER TABLE `files` ADD `storage_key` text;--> statement-breakpoint
ALTER TABLE `images` ADD `storage` text DEFAULT 'db' NOT NULL;--> statement-breakpoint
ALTER TABLE `images` ADD `storage_key` text;