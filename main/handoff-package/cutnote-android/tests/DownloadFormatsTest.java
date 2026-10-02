package app.cutnote.mobile;

import com.sun.net.httpserver.HttpServer;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicInteger;

public final class DownloadFormatsTest {
    private static int checks;
    private static void check(boolean value) { checks++; if (!value) throw new AssertionError("Download format check " + checks + " failed"); }
    public static void main(String[] args) throws Exception {
        check("video/quicktime".equals(DownloadPolicy.videoMime("VIDEO/QUICKTIME; codecs=avc1")));
        check("video/ogg".equals(DownloadPolicy.videoMime(" video/ogg ")));
        check(DownloadPolicy.videoMime("audio/ogg") == null);
        check(DownloadPolicy.videoMime("application/octet-stream") == null);
        check("reference.mov".equals(DownloadPolicy.filename("attachment; filename=\"reference.MOV\"", "video/quicktime")));
        check("reference.ogg".equals(DownloadPolicy.filename("attachment; filename=\"reference.ogv\"", "video/ogg")));
        check("reference.ogg".equals(DownloadPolicy.filename("attachment; filename=\"reference.ogg\"", "video/ogg")));
        check("reference.mov".equals(DownloadPolicy.filename("attachment; filename=\"reference.mp4\"", "video/quicktime")));
        check("reference.mp4".equals(DownloadPolicy.filename("attachment; filename=\"reference.mov\"", "video/mp4")));
        check("구간.mov".equals(DownloadPolicy.filename("attachment; filename*=UTF-8''%EA%B5%AC%EA%B0%84.mov", "video/quicktime")));
        check(!DownloadPolicy.filename("attachment; filename=\"../../reference.mov\"", "video/quicktime").contains("/"));
        check(DownloadPolicy.filename(null, "video/ogg").endsWith(".ogg"));
        AtomicInteger authenticated = new AtomicInteger(), heads = new AtomicInteger();
        byte[] bytes = "fixture-video-file-bytes".getBytes(StandardCharsets.UTF_8);
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/media/", exchange -> {
            if (!"session=fixture-only".equals(exchange.getRequestHeaders().getFirst("Cookie"))) { exchange.sendResponseHeaders(401, -1); exchange.close(); return; }
            authenticated.incrementAndGet();
            String item = exchange.getRequestURI().getPath();
            boolean head = exchange.getRequestMethod().equals("HEAD");
            String mime = item.contains("mov") ? "video/quicktime" : "video/ogg";
            exchange.getResponseHeaders().set("Content-Type", mime);
            if (head) { heads.incrementAndGet(); exchange.getResponseHeaders().set("Content-Length", String.valueOf(bytes.length)); exchange.sendResponseHeaders(200, -1); }
            else { exchange.sendResponseHeaders(200, item.contains("stream") ? 0 : bytes.length); exchange.getResponseBody().write(bytes); }
            exchange.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            for (String item : new String[]{"mov", "ogg", "mov-stream", "ogg-stream"}) {
                ByteArrayOutputStream output = new ByteArrayOutputStream();
                String mime = item.startsWith("mov") ? "video/quicktime" : "video/ogg";
                check(new DownloadTransfer().copy(base, base + "/api/media/" + item + "?download=1", "session=fixture-only", null, mime, bytes.length, output, null) == bytes.length);
                check(Arrays.equals(output.toByteArray(), bytes));
            }
            check(heads.get() == 2);
            check(authenticated.get() == 6);
            try { new DownloadTransfer().copy(base, base + "/api/media/mov?download=1", "session=fixture-only", null, "video/mp4", -1, new ByteArrayOutputStream(), null); throw new AssertionError("Mismatched MIME accepted"); }
            catch (IOException expected) { check(true); }
        } finally { server.stop(0); }
        System.out.println("DownloadFormats: " + checks + " checks passed");
    }
}
