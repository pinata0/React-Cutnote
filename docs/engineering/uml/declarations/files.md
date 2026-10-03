# 선언 수집 대상 파일 대조

[선언 안내](README.md)

선정표의 포함/보조 애플리케이션 소스를 실제 파일로 펼쳤다. 0건인 파일도 남긴다. 테스트·설치 shell·설정 JSON·문서·생성 snapshot·바이너리·개인 상태는 내용 추출 대상이 아니다. SQL은 메모리 DB에만 적용한다.

| 파일 | 1단계 구분 | 처리 | 선언 수 |
|---|---|---|---|
| [apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/ConnectionProbe.java>) | 포함 | javac parse (no analyze) | 14 |
| [apps/android/app/src/main/java/app/cutnote/mobile/DownloadPolicy.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/DownloadPolicy.java>) | 포함 | javac parse (no analyze) | 6 |
| [apps/android/app/src/main/java/app/cutnote/mobile/DownloadTransfer.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/DownloadTransfer.java>) | 포함 | javac parse (no analyze) | 16 |
| [apps/android/app/src/main/java/app/cutnote/mobile/EntryPolicy.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/EntryPolicy.java>) | 포함 | javac parse (no analyze) | 5 |
| [apps/android/app/src/main/java/app/cutnote/mobile/FileAccess.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/FileAccess.java>) | 포함 | javac parse (no analyze) | 37 |
| [apps/android/app/src/main/java/app/cutnote/mobile/LinkPolicy.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/LinkPolicy.java>) | 포함 | javac parse (no analyze) | 13 |
| [apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/MainActivity.java>) | 포함 | javac parse (no analyze) | 101 |
| [apps/android/app/src/main/java/app/cutnote/mobile/ShareRequest.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/ShareRequest.java>) | 포함 | javac parse (no analyze) | 8 |
| [apps/android/app/src/main/java/app/cutnote/mobile/UploadPolicy.java](<../../../../apps/android/app/src/main/java/app/cutnote/mobile/UploadPolicy.java>) | 포함 | javac parse (no analyze) | 4 |
| [apps/android/bridge/server.mjs](<../../../../apps/android/bridge/server.mjs>) | 포함 | TypeScript AST parse | 34 |
| [apps/android/launcher.mjs](<../../../../apps/android/launcher.mjs>) | 포함 | TypeScript AST parse | 21 |
| [apps/pc/egress.mjs](<../../../../apps/pc/egress.mjs>) | 포함 | TypeScript AST parse | 4 |
| [apps/pc/media.mjs](<../../../../apps/pc/media.mjs>) | 포함 | TypeScript AST parse | 8 |
| [apps/pc/process.mjs](<../../../../apps/pc/process.mjs>) | 포함 | TypeScript AST parse | 8 |
| [apps/pc/runner.mjs](<../../../../apps/pc/runner.mjs>) | 포함 | TypeScript AST parse | 8 |
| [apps/pc/server.mjs](<../../../../apps/pc/server.mjs>) | 포함 | TypeScript AST parse | 6 |
| [apps/pc/settings.mjs](<../../../../apps/pc/settings.mjs>) | 포함 | TypeScript AST parse | 7 |
| [apps/pc/start.mjs](<../../../../apps/pc/start.mjs>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/app/api/ai/analyze/route.ts](<../../../../apps/web/app/api/ai/analyze/route.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/app/api/ai/connect/route.ts](<../../../../apps/web/app/api/ai/connect/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/ai/effect-query/route.ts](<../../../../apps/web/app/api/ai/effect-query/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/ai/frames/route.ts](<../../../../apps/web/app/api/ai/frames/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/ai/image-query/route.ts](<../../../../apps/web/app/api/ai/image-query/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/ai/status/route.ts](<../../../../apps/web/app/api/ai/status/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/clips/[id]/route.ts](<../../../../apps/web/app/api/clips/[id]/route.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/app/api/clips/route.ts](<../../../../apps/web/app/api/clips/route.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/app/api/internal/jobs/route.ts](<../../../../apps/web/app/api/internal/jobs/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/jobs/[id]/[action]/route.ts](<../../../../apps/web/app/api/jobs/[id]/[action]/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/jobs/route.ts](<../../../../apps/web/app/api/jobs/route.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/app/api/library/order/route.ts](<../../../../apps/web/app/api/library/order/route.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/app/api/links/media/route.ts](<../../../../apps/web/app/api/links/media/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/links/resolve/route.ts](<../../../../apps/web/app/api/links/resolve/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/media/[id]/route.ts](<../../../../apps/web/app/api/media/[id]/route.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/app/api/recommendations/feedback/route.ts](<../../../../apps/web/app/api/recommendations/feedback/route.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/app/api/recommendations/youtube/route.ts](<../../../../apps/web/app/api/recommendations/youtube/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/api/segment-media/[id]/[segmentId]/route.ts](<../../../../apps/web/app/api/segment-media/[id]/[segmentId]/route.ts>) | 포함 | TypeScript AST parse | 5 |
| [apps/web/app/api/segment-media/[id]/route.ts](<../../../../apps/web/app/api/segment-media/[id]/route.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/mobile/page.tsx](<../../../../apps/web/app/mobile/page.tsx>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/app/page.tsx](<../../../../apps/web/app/page.tsx>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/build/connector-preview-plugin.mjs](<../../../../apps/web/build/connector-preview-plugin.mjs>) | 보조 | TypeScript AST parse | 13 |
| [apps/web/build/connector-preview-worker.mjs](<../../../../apps/web/build/connector-preview-worker.mjs>) | 보조 | TypeScript AST parse | 5 |
| [apps/web/build/sites-vite-plugin.ts](<../../../../apps/web/build/sites-vite-plugin.ts>) | 보조 | TypeScript AST parse | 17 |
| [apps/web/build/sites-worker.ts](<../../../../apps/web/build/sites-worker.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/cloudflare-env.d.ts](<../../../../apps/web/cloudflare-env.d.ts>) | 보조 | TypeScript AST parse | 1 |
| [apps/web/components/media/source-player.tsx](<../../../../apps/web/components/media/source-player.tsx>) | 포함 | TypeScript AST parse | 17 |
| [apps/web/components/media/video-player.tsx](<../../../../apps/web/components/media/video-player.tsx>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/db/index.ts](<../../../../apps/web/db/index.ts>) | 보조 | TypeScript AST parse | 1 |
| [apps/web/db/schema.ts](<../../../../apps/web/db/schema.ts>) | 포함 | TypeScript AST parse | 14 |
| [apps/web/drizzle.config.ts](<../../../../apps/web/drizzle.config.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/drizzle/0000_steady_wendell_rand.sql](<../../../../apps/web/drizzle/0000_steady_wendell_rand.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0001_narrow_xavin.sql](<../../../../apps/web/drizzle/0001_narrow_xavin.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0002_lyrical_switch.sql](<../../../../apps/web/drizzle/0002_lyrical_switch.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0003_public_psylocke.sql](<../../../../apps/web/drizzle/0003_public_psylocke.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0004_dear_big_bertha.sql](<../../../../apps/web/drizzle/0004_dear_big_bertha.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0005_special_famine.sql](<../../../../apps/web/drizzle/0005_special_famine.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0006_confused_sentinels.sql](<../../../../apps/web/drizzle/0006_confused_sentinels.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0007_amusing_blizzard.sql](<../../../../apps/web/drizzle/0007_amusing_blizzard.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0008_silent_giant_man.sql](<../../../../apps/web/drizzle/0008_silent_giant_man.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/drizzle/0009_pc_jobs.sql](<../../../../apps/web/drizzle/0009_pc_jobs.sql>) | 포함 | memory SQLite migration | 0 |
| [apps/web/features/connections/ai-connection.tsx](<../../../../apps/web/features/connections/ai-connection.tsx>) | 포함 | TypeScript AST parse | 13 |
| [apps/web/features/connections/library-connection.tsx](<../../../../apps/web/features/connections/library-connection.tsx>) | 포함 | TypeScript AST parse | 10 |
| [apps/web/features/discovery/discovery-profile.ts](<../../../../apps/web/features/discovery/discovery-profile.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/features/discovery/effect-explorer.tsx](<../../../../apps/web/features/discovery/effect-explorer.tsx>) | 포함 | TypeScript AST parse | 35 |
| [apps/web/features/discovery/image-search-dialog.tsx](<../../../../apps/web/features/discovery/image-search-dialog.tsx>) | 포함 | TypeScript AST parse | 18 |
| [apps/web/features/discovery/image-search.ts](<../../../../apps/web/features/discovery/image-search.ts>) | 포함 | TypeScript AST parse | 15 |
| [apps/web/features/discovery/recommendations.ts](<../../../../apps/web/features/discovery/recommendations.ts>) | 포함 | TypeScript AST parse | 27 |
| [apps/web/features/discovery/youtube-discovery.tsx](<../../../../apps/web/features/discovery/youtube-discovery.tsx>) | 포함 | TypeScript AST parse | 14 |
| [apps/web/features/library/clip-details-sheet.tsx](<../../../../apps/web/features/library/clip-details-sheet.tsx>) | 보조 | TypeScript AST parse | 3 |
| [apps/web/features/library/clip-draft.ts](<../../../../apps/web/features/library/clip-draft.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/features/library/clip-editor-dialog.tsx](<../../../../apps/web/features/library/clip-editor-dialog.tsx>) | 보조 | TypeScript AST parse | 3 |
| [apps/web/features/library/favorite-button.tsx](<../../../../apps/web/features/library/favorite-button.tsx>) | 보조 | TypeScript AST parse | 1 |
| [apps/web/features/library/favorites.ts](<../../../../apps/web/features/library/favorites.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/features/library/library-order.ts](<../../../../apps/web/features/library/library-order.ts>) | 포함 | TypeScript AST parse | 9 |
| [apps/web/features/library/library-presentation.ts](<../../../../apps/web/features/library/library-presentation.ts>) | 보조 | TypeScript AST parse | 2 |
| [apps/web/features/library/library-workspace.tsx](<../../../../apps/web/features/library/library-workspace.tsx>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/features/library/mobile-save.tsx](<../../../../apps/web/features/library/mobile-save.tsx>) | 포함 | TypeScript AST parse | 37 |
| [apps/web/features/library/pc-ingest.tsx](<../../../../apps/web/features/library/pc-ingest.tsx>) | 포함 | TypeScript AST parse | 22 |
| [apps/web/features/library/sortable-cards.tsx](<../../../../apps/web/features/library/sortable-cards.tsx>) | 보조 | TypeScript AST parse | 28 |
| [apps/web/features/library/use-clip-analysis.ts](<../../../../apps/web/features/library/use-clip-analysis.ts>) | 포함 | TypeScript AST parse | 14 |
| [apps/web/features/library/use-library-sync.ts](<../../../../apps/web/features/library/use-library-sync.ts>) | 포함 | TypeScript AST parse | 17 |
| [apps/web/features/library/use-library-workspace.ts](<../../../../apps/web/features/library/use-library-workspace.ts>) | 포함 | TypeScript AST parse | 87 |
| [apps/web/features/segments/segment-drafts.ts](<../../../../apps/web/features/segments/segment-drafts.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/features/segments/segment-editor.tsx](<../../../../apps/web/features/segments/segment-editor.tsx>) | 보조 | TypeScript AST parse | 7 |
| [apps/web/features/segments/segment-library.tsx](<../../../../apps/web/features/segments/segment-library.tsx>) | 포함 | TypeScript AST parse | 29 |
| [apps/web/features/segments/segment-search.ts](<../../../../apps/web/features/segments/segment-search.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/features/segments/segment-tagging.ts](<../../../../apps/web/features/segments/segment-tagging.ts>) | 포함 | TypeScript AST parse | 9 |
| [apps/web/features/tagging/tag-review.tsx](<../../../../apps/web/features/tagging/tag-review.tsx>) | 보조 | TypeScript AST parse | 19 |
| [apps/web/lib/ai/crypto.ts](<../../../../apps/web/lib/ai/crypto.ts>) | 포함 | TypeScript AST parse | 5 |
| [apps/web/lib/ai/effect-query.ts](<../../../../apps/web/lib/ai/effect-query.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/lib/ai/gemini.ts](<../../../../apps/web/lib/ai/gemini.ts>) | 포함 | TypeScript AST parse | 9 |
| [apps/web/lib/ai/image-query.ts](<../../../../apps/web/lib/ai/image-query.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/ai/key-input.ts](<../../../../apps/web/lib/ai/key-input.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/lib/ai/openai.ts](<../../../../apps/web/lib/ai/openai.ts>) | 포함 | TypeScript AST parse | 9 |
| [apps/web/lib/ai/result.ts](<../../../../apps/web/lib/ai/result.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/ai/settings.ts](<../../../../apps/web/lib/ai/settings.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/ai/youtube-discovery.ts](<../../../../apps/web/lib/ai/youtube-discovery.ts>) | 포함 | TypeScript AST parse | 15 |
| [apps/web/lib/ai/youtube-public-search.ts](<../../../../apps/web/lib/ai/youtube-public-search.ts>) | 포함 | TypeScript AST parse | 19 |
| [apps/web/lib/analysis/color.ts](<../../../../apps/web/lib/analysis/color.ts>) | 보조 | TypeScript AST parse | 2 |
| [apps/web/lib/analysis/link.ts](<../../../../apps/web/lib/analysis/link.ts>) | 보조 | TypeScript AST parse | 5 |
| [apps/web/lib/analysis/retag-segments.ts](<../../../../apps/web/lib/analysis/retag-segments.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/lib/analysis/types.ts](<../../../../apps/web/lib/analysis/types.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/analysis/video.ts](<../../../../apps/web/lib/analysis/video.ts>) | 보조 | TypeScript AST parse | 13 |
| [apps/web/lib/analysis/whole-video.ts](<../../../../apps/web/lib/analysis/whole-video.ts>) | 포함 | TypeScript AST parse | 11 |
| [apps/web/lib/client-request.ts](<../../../../apps/web/lib/client-request.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/lib/clips.ts](<../../../../apps/web/lib/clips.ts>) | 포함 | TypeScript AST parse | 18 |
| [apps/web/lib/connector-context.ts](<../../../../apps/web/lib/connector-context.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/lib/connector-contract.mts](<../../../../apps/web/lib/connector-contract.mts>) | 보조 | TypeScript AST parse | 12 |
| [apps/web/lib/connector-errors.mts](<../../../../apps/web/lib/connector-errors.mts>) | 보조 | TypeScript AST parse | 2 |
| [apps/web/lib/connector-preview.d.ts](<../../../../apps/web/lib/connector-preview.d.ts>) | 보조 | TypeScript AST parse | 3 |
| [apps/web/lib/connectors.ts](<../../../../apps/web/lib/connectors.ts>) | 보조 | TypeScript AST parse | 2 |
| [apps/web/lib/id.ts](<../../../../apps/web/lib/id.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/lib/jobs/server.ts](<../../../../apps/web/lib/jobs/server.ts>) | 포함 | TypeScript AST parse | 15 |
| [apps/web/lib/jobs/types.ts](<../../../../apps/web/lib/jobs/types.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/lib/json.ts](<../../../../apps/web/lib/json.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/lib/library-order-server.ts](<../../../../apps/web/lib/library-order-server.ts>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/lib/links/fetch.ts](<../../../../apps/web/lib/links/fetch.ts>) | 포함 | TypeScript AST parse | 5 |
| [apps/web/lib/links/instagram.ts](<../../../../apps/web/lib/links/instagram.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/lib/links/provider.ts](<../../../../apps/web/lib/links/provider.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/lib/links/resolve.ts](<../../../../apps/web/lib/links/resolve.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/links/types.ts](<../../../../apps/web/lib/links/types.ts>) | 포함 | TypeScript AST parse | 5 |
| [apps/web/lib/media-response.ts](<../../../../apps/web/lib/media-response.ts>) | 포함 | TypeScript AST parse | 2 |
| [apps/web/lib/mobile-share.ts](<../../../../apps/web/lib/mobile-share.ts>) | 포함 | TypeScript AST parse | 3 |
| [apps/web/lib/segment-media.ts](<../../../../apps/web/lib/segment-media.ts>) | 포함 | TypeScript AST parse | 6 |
| [apps/web/lib/segments.ts](<../../../../apps/web/lib/segments.ts>) | 포함 | TypeScript AST parse | 10 |
| [apps/web/lib/server.ts](<../../../../apps/web/lib/server.ts>) | 포함 | TypeScript AST parse | 8 |
| [apps/web/lib/server/chatgpt-auth.ts](<../../../../apps/web/lib/server/chatgpt-auth.ts>) | 보조 | TypeScript AST parse | 16 |
| [apps/web/lib/tagging.ts](<../../../../apps/web/lib/tagging.ts>) | 포함 | TypeScript AST parse | 13 |
| [apps/web/lib/taxonomy.ts](<../../../../apps/web/lib/taxonomy.ts>) | 포함 | TypeScript AST parse | 14 |
| [apps/web/lib/video-export.ts](<../../../../apps/web/lib/video-export.ts>) | 포함 | TypeScript AST parse | 12 |
| [apps/web/lib/workspace-context.ts](<../../../../apps/web/lib/workspace-context.ts>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/public/analysis-worker.js](<../../../../apps/web/public/analysis-worker.js>) | 보조 | TypeScript AST parse | 8 |
| [apps/web/scripts/connector-preview/connector-preview-session.mjs](<../../../../apps/web/scripts/connector-preview/connector-preview-session.mjs>) | 보조 | TypeScript AST parse | 22 |
| [apps/web/scripts/connector-preview/host-binding.mjs](<../../../../apps/web/scripts/connector-preview/host-binding.mjs>) | 보조 | TypeScript AST parse | 11 |
| [apps/web/scripts/connector-preview/protocol.mjs](<../../../../apps/web/scripts/connector-preview/protocol.mjs>) | 보조 | TypeScript AST parse | 8 |
| [apps/web/scripts/execution-profile.mjs](<../../../../apps/web/scripts/execution-profile.mjs>) | 보조 | TypeScript AST parse | 1 |
| [apps/web/scripts/generate-taxonomy.mjs](<../../../../apps/web/scripts/generate-taxonomy.mjs>) | 보조 | TypeScript AST parse | 11 |
| [apps/web/scripts/init-local-db.mjs](<../../../../apps/web/scripts/init-local-db.mjs>) | 포함 | TypeScript AST parse | 4 |
| [apps/web/scripts/install-ci.mjs](<../../../../apps/web/scripts/install-ci.mjs>) | 보조 | TypeScript AST parse | 1 |
| [apps/web/scripts/npm-install.mjs](<../../../../apps/web/scripts/npm-install.mjs>) | 보조 | TypeScript AST parse | 9 |
| [apps/web/scripts/pnpm-install.mjs](<../../../../apps/web/scripts/pnpm-install.mjs>) | 보조 | TypeScript AST parse | 15 |
| [apps/web/scripts/run-framework.mjs](<../../../../apps/web/scripts/run-framework.mjs>) | 보조 | TypeScript AST parse | 4 |
| [apps/web/scripts/sites-env.mjs](<../../../../apps/web/scripts/sites-env.mjs>) | 보조 | TypeScript AST parse | 2 |
| [apps/web/scripts/start-pc.mjs](<../../../../apps/web/scripts/start-pc.mjs>) | 포함 | TypeScript AST parse | 1 |
| [apps/web/vite.config.ts](<../../../../apps/web/vite.config.ts>) | 포함 | TypeScript AST parse | 7 |
