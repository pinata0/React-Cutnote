CREATE TABLE `library_order` (
	`scope` text PRIMARY KEY NOT NULL,
	`ordered_keys` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `youtube_discovery` (
	`id` text PRIMARY KEY NOT NULL,
	`result` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT 0 NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`lock_token` text DEFAULT '' NOT NULL
);
