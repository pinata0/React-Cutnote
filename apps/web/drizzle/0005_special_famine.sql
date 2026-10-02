CREATE TABLE `segment_media` (
	`object_key` text PRIMARY KEY NOT NULL,
	`clip_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`source_identity` text NOT NULL,
	`start_ms` integer NOT NULL,
	`end_ms` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_segment_media_clip` ON `segment_media` (`clip_id`);