ALTER TABLE `clips` ADD `favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `clips` ADD `favorite_segments` text DEFAULT '[]' NOT NULL;