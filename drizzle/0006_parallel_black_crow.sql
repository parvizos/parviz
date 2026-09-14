CREATE TABLE `debt_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`debt_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`account_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`debt_id`) REFERENCES `debts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `debt_payments_debt_idx` ON `debt_payments` (`debt_id`);--> statement-breakpoint
CREATE TABLE `debts` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`person_id` text,
	`counterparty` text,
	`title` text,
	`currency` text DEFAULT 'RUB' NOT NULL,
	`principal` integer NOT NULL,
	`date` text NOT NULL,
	`due_date` text,
	`note` text,
	`settled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `debts_person_idx` ON `debts` (`person_id`);--> statement-breakpoint
CREATE INDEX `debts_direction_idx` ON `debts` (`direction`);--> statement-breakpoint
CREATE TABLE `exchange_rates` (
	`code` text PRIMARY KEY NOT NULL,
	`rate_to_base` real NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `goal_contributions` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `goal_contributions_goal_idx` ON `goal_contributions` (`goal_id`);--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`target_amount` integer NOT NULL,
	`currency` text DEFAULT 'RUB' NOT NULL,
	`account_id` text,
	`due_date` text,
	`color` text,
	`icon` text,
	`note` text,
	`achieved_at` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `goals_position_idx` ON `goals` (`position`);--> statement-breakpoint
CREATE TABLE `planned` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`kind` text DEFAULT 'expense' NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'RUB' NOT NULL,
	`account_id` text,
	`to_account_id` text,
	`category_id` text,
	`area_id` text,
	`project_id` text,
	`subject_id` text,
	`person_id` text,
	`recurrence` text DEFAULT 'month' NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`next_date` text NOT NULL,
	`autopost` integer DEFAULT false NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`note` text,
	`last_posted_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`area_id`) REFERENCES `areas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `planned_next_idx` ON `planned` (`next_date`);--> statement-breakpoint
CREATE INDEX `planned_active_idx` ON `planned` (`active`);--> statement-breakpoint
ALTER TABLE `transactions` ADD `amount_to` integer;