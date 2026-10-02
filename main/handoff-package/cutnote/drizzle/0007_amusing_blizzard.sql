CREATE TABLE `recommendation_feedback` (
	`context_key` text NOT NULL,
	`clip_id` text NOT NULL,
	`segment_id` text NOT NULL,
	`signature` text NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`context_key`, `clip_id`, `segment_id`),
	FOREIGN KEY (`clip_id`) REFERENCES `clips`(`id`) ON UPDATE no action ON DELETE cascade
);
