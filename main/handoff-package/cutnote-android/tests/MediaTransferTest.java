package app.cutnote.mobile;

import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;

public final class MediaTransferTest {
    private static int checks;
    private static void check(boolean condition) { checks++; if (!condition) throw new AssertionError("Media check " + checks + " failed"); }
    private static void fails(String base, String path, String mime, long size) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try { new DownloadTransfer().copy(base, base + path, "session=test-only", null, mime, size, output, null); throw new AssertionError("Expected failure for " + path); }
        catch (IOException expected) { checks++; }
    }
    public static void main(String[] args) throws Exception {
        String origin = "http://192.168.0.2:5174";
        check(DownloadPolicy.allowed(origin, origin + "/api/media/a_1-b?download=1"));
        check(DownloadPolicy.allowed(origin, origin + "/api/segment-media/clip/segment?download=1&v=012345abcdef"));
        for (String path : new String[]{"/api/media/a", "/api/media/a?download=0", "/api/media/a?download=1&url=https://evil.invalid", "/api/media/a?download=1&download=1", "/api/media/../a?download=1", "/api/media/%2e%2e?download=1", "/api/media/a?download=1#fragment", "/api/media/a/b?download=1", "/api/segment-media/a/b?download=1", "/api/segment-media/a/b?download=1&v=", "/api/media/a?download=1&v=foo", "/api/media/a?download=1&%0a=bad"}) check(!DownloadPolicy.allowed(origin, origin + path));
        check(!DownloadPolicy.allowed(origin, "http://192.168.0.2:5173/api/media/a?download=1"));
        check(!DownloadPolicy.allowed(origin, "http://192.168.0.2.evil.invalid/api/media/a?download=1"));
        check(!DownloadPolicy.allowed(origin, "http://user@192.168.0.2:5174/api/media/a?download=1"));
        check(!DownloadPolicy.allowed(origin, "blob:" + origin + "/abc"));
        check(!DownloadPolicy.allowed(origin, origin + "/api/segment-media/a/b?download=1&v=a%0Ab%0Ac"));
        check(DownloadPolicy.videoMime("Video/MP4; codec=x").equals("video/mp4"));
        check(DownloadPolicy.videoMime("text/html") == null);
        check(DownloadPolicy.filename("attachment; filename=\"clip.webm\"", "video/webm").equals("clip.webm"));
        check(DownloadPolicy.filename("attachment; filename*=UTF-8''%EA%B5%AC%EA%B0%84%201.mp4", "video/mp4").equals("구간 1.mp4"));
        check(DownloadPolicy.filename("attachment; filename*=UTF-8''one+two.mp4", "video/mp4").equals("one+two.mp4"));
        check(!DownloadPolicy.filename("attachment; filename=\"../../bad\\path.mp4\"", "video/mp4").contains("/"));
        check(!DownloadPolicy.filename("attachment; filename=\"../../bad\\path.mp4\"", "video/mp4").contains("\\"));
        check(UploadPolicy.allowed("video/mp4", UploadPolicy.accepted(new String[]{"video/*"})));
        check(!UploadPolicy.allowed("image/jpeg", UploadPolicy.accepted(new String[]{"video/*"})));
        check(UploadPolicy.allowed("image/png", UploadPolicy.accepted(new String[]{"image/png,image/jpeg"})));
        check(!UploadPolicy.allowed("application/pdf", UploadPolicy.accepted(new String[]{"*/*"})));
        check(!UploadPolicy.allowed(null, UploadPolicy.accepted(null)));

        AtomicInteger destinationHits = new AtomicInteger();
        AtomicInteger headHits = new AtomicInteger();
        HttpServer external = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        external.createContext("/", exchange -> { destinationHits.incrementAndGet(); exchange.sendResponseHeaders(200, 1); exchange.getResponseBody().write(1); exchange.close(); });
        external.start();
        String outside = "http://127.0.0.1:" + external.getAddress().getPort() + "/api/media/ok?download=1";
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        byte[] body = "a small streamed video body".getBytes(StandardCharsets.UTF_8);
        server.createContext("/api/media/", exchange -> {
            String item = exchange.getRequestURI().getPath().substring("/api/media/".length());
            boolean authenticated = "session=test-only".equals(exchange.getRequestHeaders().getFirst("Cookie")) || "test-pairing-code".equals(exchange.getRequestHeaders().getFirst("X-Cutnote-Pairing"));
            if (!authenticated || item.equals("auth")) { exchange.sendResponseHeaders(401, -1); exchange.close(); return; }
            if (exchange.getRequestMethod().equals("HEAD")) {
                headHits.incrementAndGet();
                if (!"identity".equals(exchange.getRequestHeaders().getFirst("Accept-Encoding"))) { exchange.sendResponseHeaders(400, -1); exchange.close(); return; }
                if (item.equals("chunked-head-redirect")) { exchange.getResponseHeaders().set("Location", outside); exchange.sendResponseHeaders(302, -1); exchange.close(); return; }
                if (item.equals("chunked-head-error")) { exchange.sendResponseHeaders(503, -1); exchange.close(); return; }
                exchange.getResponseHeaders().set("Content-Type", item.equals("chunked-head-mime") ? "text/html" : "video/mp4");
                if (item.equals("chunked-head-encoded")) exchange.getResponseHeaders().set("Content-Encoding", "gzip");
                if (!item.equals("unknown") && !item.equals("chunked-head-missing")) {
                    String length = item.equals("chunked-head-invalid") ? "invalid" : item.equals("chunked-head-zero") ? "0" : item.equals("chunked-head-large") ? String.valueOf(DownloadTransfer.MAX_BYTES + 1) : item.equals("chunked-head-mismatch") ? String.valueOf(body.length + 1) : String.valueOf(body.length);
                    exchange.getResponseHeaders().set("Content-Length", length);
                }
                exchange.sendResponseHeaders(item.equals("chunked-head-partial") ? 206 : 200, -1);
                exchange.close(); return;
            }
            if (item.equals("redirect")) { exchange.getResponseHeaders().set("Location", outside); exchange.sendResponseHeaders(302, -1); exchange.close(); return; }
            exchange.getResponseHeaders().set("Content-Type", item.equals("mime") ? "text/html" : item.equals("webm") ? "video/webm" : "video/mp4");
            int code = item.equals("partial") || item.equals("fullrange") ? 206 : 200;
            if (item.equals("partial")) exchange.getResponseHeaders().set("Content-Range", "bytes 1-" + body.length + "/" + (body.length + 1));
            if (item.equals("fullrange")) exchange.getResponseHeaders().set("Content-Range", "bytes 0-" + (body.length - 1) + "/" + body.length);
            exchange.sendResponseHeaders(code, item.equals("unknown") || item.startsWith("chunked-") ? 0 : item.equals("truncated") ? body.length + 5 : item.equals("large") ? DownloadTransfer.MAX_BYTES + 1 : body.length);
            try { exchange.getResponseBody().write(body); exchange.getResponseBody().close(); } catch (IOException deliberatelyTruncated) { }
            finally { exchange.close(); }
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            long count = new DownloadTransfer().copy(base, base + "/api/media/ok?download=1", "session=test-only", null, "video/mp4", body.length, output, null);
            check(count == body.length && java.util.Arrays.equals(output.toByteArray(), body));
            output.reset();
            check(new DownloadTransfer().copy(base, base + "/api/media/webm?download=1", null, "test-pairing-code", "video/webm", -1, output, null) == body.length);
            output.reset();
            check(new DownloadTransfer().copy(base, base + "/api/media/fullrange?download=1", "session=test-only", null, "video/mp4", -1, output, null) == body.length);
            check(headHits.get() == 0);
            output.reset();
            check(new DownloadTransfer().copy(base, base + "/api/media/chunked-good?download=1", "session=test-only", null, "video/mp4", -1, output, null) == body.length);
            check(java.util.Arrays.equals(output.toByteArray(), body));
            check(headHits.get() == 1);
            output.reset();
            check(new DownloadTransfer().copy(base, base + "/api/media/chunked-good?download=1", null, "test-pairing-code", "video/mp4", body.length, output, null) == body.length);
            check(headHits.get() == 2);
            for (String item : new String[]{"chunked-head-redirect", "chunked-head-error", "chunked-head-invalid", "chunked-head-zero", "chunked-head-large", "chunked-head-mime", "chunked-head-missing", "chunked-head-mismatch", "chunked-head-encoded", "chunked-head-partial", "large"}) fails(base, "/api/media/" + item + "?download=1", "video/mp4", -1);
            for (String item : new String[]{"redirect", "auth", "mime", "partial", "truncated", "unknown"}) fails(base, "/api/media/" + item + "?download=1", "video/mp4", -1);
            fails(base, "/api/media/ok?download=1", "video/mp4", body.length + 1);
            check(destinationHits.get() == 0);
            try { new DownloadTransfer().copy(base, outside, "session=test-only", null, "video/mp4", -1, new ByteArrayOutputStream(), null); throw new AssertionError("External URL accepted"); }
            catch (DownloadTransfer.Failure expected) { check(destinationHits.get() == 0); }
            DownloadTransfer cancelled = new DownloadTransfer();
            cancelled.cancel();
            try { cancelled.copy(base, base + "/api/media/ok?download=1", "session=test-only", null, "video/mp4", -1, new ByteArrayOutputStream(), null); throw new AssertionError("Cancelled transfer ran"); }
            catch (IOException expected) { check(cancelled.isCancelled()); }
            DownloadTransfer interrupted = new DownloadTransfer();
            try { interrupted.copy(base, base + "/api/media/ok?download=1", "session=test-only", null, "video/mp4", -1, new ByteArrayOutputStream(), (downloaded, total) -> interrupted.cancel()); throw new AssertionError("Transfer continued after cancellation"); }
            catch (IOException expected) { check(interrupted.isCancelled()); }
        } finally { server.stop(0); external.stop(0); }
        System.out.println("MediaTransfer: " + checks + " checks passed");
    }
}
