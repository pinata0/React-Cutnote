ALTER TABLE `clips` ADD `tagging` text;--> statement-breakpoint
ALTER TABLE `clips` ADD `revision` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `analysis_history` text DEFAULT '[]' NOT NULL;