CREATE TABLE `images` (
	`id` text PRIMARY KEY NOT NULL,
	`mime` text NOT NULL,
	`data` blob NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
