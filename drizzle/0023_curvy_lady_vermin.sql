CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `settings` (`key`, `value`, `updated_at`) VALUES ('base_currency', 'TRY', (CAST(strftime('%s','now') AS INTEGER) * 1000));
