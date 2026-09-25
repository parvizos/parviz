ALTER TABLE `organizations` ADD `email` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `phone` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `location` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `organizations_favorite_idx` ON `organizations` (`favorite`);