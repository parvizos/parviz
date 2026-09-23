CREATE TABLE `terms` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start_date` text,
	`end_date` text,
	`active` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `terms_active_idx` ON `terms` (`active`);--> statement-breakpoint
ALTER TABLE `subjects` ADD `term_id` text REFERENCES terms(id);--> statement-breakpoint
CREATE INDEX `subjects_term_idx` ON `subjects` (`term_id`);--> statement-breakpoint
INSERT INTO `terms` (`id`, `name`, `active`, `position`, `created_at`, `updated_at`) VALUES ('default-term-0001', 'Текущий семестр', 1, 0, (CAST(strftime('%s','now') AS INTEGER) * 1000), (CAST(strftime('%s','now') AS INTEGER) * 1000));--> statement-breakpoint
UPDATE `subjects` SET `term_id` = 'default-term-0001' WHERE `term_id` IS NULL;