CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`artist` text,
	`album` text,
	`duration` real,
	`mime` text NOT NULL,
	`ext` text DEFAULT '' NOT NULL,
	`size` integer DEFAULT 0 NOT NULL,
	`cover_image_id` text,
	`favorite` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`play_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cover_image_id`) REFERENCES `images`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `tracks_position_idx` ON `tracks` (`position`);--> statement-breakpoint
CREATE INDEX `tracks_favorite_idx` ON `tracks` (`favorite`);