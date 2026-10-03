import { index, integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';
export const clips = sqliteTable('clips', {
  id: text('id').primaryKey(), title: text('title').notNull(),
  sourceUrl: text('source_url').notNull().default(''),
  localAsset:text('local_asset'), lastJobId:text('last_job_id'),
  videoKey: text('video_key'), posterKey: text('poster_key'),
  tags: text('tags').notNull(), notes: text('notes').notNull().default(''),
  analysis: text('analysis'), segments: text('segments').notNull().default('[]'),
  tagging: text('tagging'), revision: integer('revision').notNull().default(0),
  analysisHistory: text('analysis_history').notNull().default('[]'),
  favorite: integer('favorite', {mode:'boolean'}).notNull().default(false),
  favoriteSegments: text('favorite_segments').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
}, table => [index('idx_clips_created_at').on(table.createdAt)]);
export const aiSettings=sqliteTable('ai_settings',{
  id:text('id').primaryKey(), encryptedKey:text('encrypted_key').notNull(), updatedAt:text('updated_at').notNull(),
});
export const libraryOrder=sqliteTable('library_order',{
 scope:text('scope').primaryKey(),orderedKeys:text('ordered_keys').notNull().default('[]'),revision:integer('revision').notNull().default(0),
});
export const youtubeDiscovery=sqliteTable('youtube_discovery',{
 id:text('id').primaryKey(),result:text('result').notNull().default('{}'),updatedAt:integer('updated_at').notNull().default(0),lockedUntil:integer('locked_until').notNull().default(0),lockToken:text('lock_token').notNull().default(''),
});
// Every object is tracked before upload, including interrupted or obsolete exports.
export const segmentMedia=sqliteTable('segment_media',{
 objectKey:text('object_key').primaryKey(),clipId:text('clip_id').notNull(),segmentId:text('segment_id').notNull(),
 sourceIdentity:text('source_identity').notNull(),startSeconds:integer('start_ms').notNull(),endSeconds:integer('end_ms').notNull(),fingerprint:text('fingerprint').notNull(),status:text('status').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),
 durationMs:integer('duration_ms').notNull(),width:integer('width').notNull(),height:integer('height').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('idx_segment_media_clip').on(table.clipId)]);

export const recommendationFeedback=sqliteTable('recommendation_feedback',{
 contextKey:text('context_key').notNull(),clipId:text('clip_id').notNull().references(()=>clips.id,{onDelete:'cascade'}),segmentId:text('segment_id').notNull(),
 signature:text('signature').notNull(),value:text('value').notNull(),updatedAt:text('updated_at').notNull(),
},table=>[primaryKey({columns:[table.contextKey,table.clipId,table.segmentId]})]);

export const pcJobs=sqliteTable('pc_jobs',{
 id:text('id').primaryKey(),clipId:text('clip_id').notNull(),kind:text('kind').notNull(),payload:text('payload').notNull(),
 state:text('state').notNull().default('queued'),phase:text('phase').notNull().default('queued'),progress:integer('progress').notNull().default(0),attempt:integer('attempt').notNull().default(0),
 leaseToken:text('lease_token'),leaseUntil:integer('lease_until').notNull().default(0),cancelRequested:integer('cancel_requested').notNull().default(0),errorCode:text('error_code'),result:text('result'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
},t=>[index('pc_jobs_queue').on(t.state,t.createdAt),index('pc_jobs_clip').on(t.clipId)]);
