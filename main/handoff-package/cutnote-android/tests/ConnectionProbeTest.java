package app.cutnote.mobile;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

public final class ConnectionProbeTest {
    private static int checks;
    private static void check(boolean value) { checks++; if (!value) throw new AssertionError("Connection check " + checks + " failed"); }
    private static void rejects(String base, String secret, String kind) throws Exception {
        try { ConnectionProbe.check(base, secret); throw new AssertionError("Expected rejection"); }
        catch (ConnectionProbe.Failure expected) { check(expected.kind.equals(kind)); }
    }
    public static void main(String[] args) throws Exception {
        String secret = "fixture-pairing-not-a-real-secret";
        AtomicReference<String> mode = new AtomicReference<>("valid");
        AtomicReference<String> libraryMode = new AtomicReference<>("valid");
        AtomicReference<String> receivedPairing = new AtomicReference<>();
        AtomicReference<String> receivedPath = new AtomicReference<>();
        AtomicReference<String> receivedCookie = new AtomicReference<>();
        AtomicReference<String> cacheControl = new AtomicReference<>();
        AtomicReference<String> libraryPairing = new AtomicReference<>();
        AtomicInteger libraryReads = new AtomicInteger();
        AtomicInteger redirects = new AtomicInteger();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            receivedPath.set(exchange.getRequestURI().getPath());
            boolean library = exchange.getRequestURI().getPath().equals("/api/clips");
            if (library) {
                libraryReads.incrementAndGet();
                receivedCookie.set(exchange.getRequestHeaders().getFirst("Cookie"));
                libraryPairing.set(exchange.getRequestHeaders().getFirst("X-Cutnote-Pairing"));
                cacheControl.set(exchange.getRequestHeaders().getFirst("Cache-Control"));
            } else receivedPairing.set(exchange.getRequestHeaders().getFirst("X-Cutnote-Pairing"));
            if (exchange.getRequestURI().getPath().equals("/redirect-target")) redirects.incrementAndGet();
            String value = library ? libraryMode.get() : mode.get();
            int status = value.equals("unauthorized") ? 401 : value.equals("forbidden") ? 403 : value.equals("redirect") ? 302 : value.equals("server") ? 503 : 200;
            exchange.getResponseHeaders().set("Content-Type", value.equals("html") ? "text/html" : "application/json; charset=utf-8");
            exchange.getResponseHeaders().set("Location", "/redirect-target");
            if (!value.equals("missing-cookie")) exchange.getResponseHeaders().add("Set-Cookie", value.equals("invalid-cookie") ? "cutnote_lan_session=bad" : "cutnote_lan_session=fixture-session-value; HttpOnly; SameSite=Strict; Path=/");
            String text = library ? "{\"clips\":[]}" : "{\"workspace\":{\"kind\":\"pc\",\"keyManagement\":\"pc\"}}";
            if (value.equals("oversized")) text = new String(new char[library ? 8 * 1024 * 1024 + 1 : 65537]).replace('\0', 'a');
            if (value.equals("large")) text = "{\"clips\":[{\"notes\":\"" + new String(new char[128 * 1024]).replace('\0', 'a') + "\"}]}";
            byte[] body = text.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(status, body.length);
            try { exchange.getResponseBody().write(body); } catch (java.io.IOException ignored) { }
            exchange.close();
        });
        server.start();
        String base = "http://127.0.0.1:" + server.getAddress().getPort();
        try {
            ConnectionProbe.Result connected = ConnectionProbe.check(base, secret);
            check(connected.json.contains("workspace"));
            check(connected.cookie.equals("cutnote_lan_session=fixture-session-value; HttpOnly; SameSite=Strict; Path=/"));
            check(secret.equals(receivedPairing.get()));
            check(receivedPath.get().equals("/api/clips"));
            check(connected.clipsJson.equals("{\"clips\":[]}"));
            check(receivedCookie.get().equals("cutnote_lan_session=fixture-session-value"));
            check(libraryPairing.get() == null);
            check(cacheControl.get().equals("no-cache"));
            check(libraryReads.get() == 1);
            for (String value : new String[]{"unauthorized", "forbidden"}) { mode.set(value); rejects(base, secret, "pairing"); }
            for (String value : new String[]{"redirect", "html", "missing-cookie", "invalid-cookie"}) { mode.set(value); rejects(base, secret, "address"); }
            check(redirects.get() == 0);
            for (String value : new String[]{"server", "oversized"}) { mode.set(value); rejects(base, secret, "server"); }
            check(libraryReads.get() == 1);
            rejects("https://example.com/mobile", secret, "address");
            rejects(base, "bad\r\nheader", "address");
            mode.set("valid");
            check(ConnectionProbe.check(base, secret).cookie != null);
            check(receivedPath.get().equals("/api/clips"));
            for (String value : new String[]{"unauthorized", "forbidden"}) { libraryMode.set(value); rejects(base, secret, "pairing"); }
            for (String value : new String[]{"redirect", "html"}) { libraryMode.set(value); rejects(base, secret, "address"); }
            check(redirects.get() == 0);
            for (String value : new String[]{"server", "oversized"}) { libraryMode.set(value); rejects(base, secret, "server"); }
            libraryMode.set("large");
            check(ConnectionProbe.check(base, secret).clipsJson.length() > 65536);
            libraryMode.set("valid");
            check(ConnectionProbe.check(base, secret).clipsJson.equals("{\"clips\":[]}"));
        } finally { server.stop(0); }
        System.out.println("ConnectionProbe: " + checks + " checks passed");
    }
}
