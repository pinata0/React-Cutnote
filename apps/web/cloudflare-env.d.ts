declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    CUTNOTE_SECRET_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENAI_API_KEY?: string;
  }
}
