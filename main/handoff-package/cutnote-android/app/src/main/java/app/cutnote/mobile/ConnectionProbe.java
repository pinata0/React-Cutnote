package app.cutnote.mobile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/** Read-only authentication check. Never follows a redirect or sends an AI request. */
public final class ConnectionProbe {
    public static final class Result {
        public final String json, cookie, clipsJson;
        Result(String json, String cookie, String clipsJson) { this.json = json; this.cookie = cookie; this.clipsJson = clipsJson; }
    }
    public static final class Failure extends IOException {
        public final String kind;
        Failure(String kind) { super(kind); this.kind = kind; }
    }
    private ConnectionProbe() { }

    public static Result check(String base, String pairing) throws IOException {
        String normalized = LinkPolicy.normalizeBase(base);
        if (normalized == null || pairing == null || !pairing.matches("[A-Za-z0-9_-]{12,256}")) throw new Failure("address");
        HttpURLConnection connection = open(normalized + "/api/ai/status");
        try {
            connection.setRequestProperty("X-Cutnote-Pairing", pairing);
            requireJson(connection);
            String cookie = null;
            for (Map.Entry<String, List<String>> field : connection.getHeaderFields().entrySet()) {
                if (!"set-cookie".equalsIgnoreCase(field.getKey())) continue;
                for (String value : field.getValue()) {
                    String pair = value.split(";", 2)[0].trim();
                    if (pair.matches("cutnote_lan_session=[A-Za-z0-9_-]{12,256}")) cookie = pair + "; HttpOnly; SameSite=Strict; Path=/";
                }
            }
            if (cookie == null) throw new Failure("address");
            String statusJson = read(connection, 65536);
            // Exercise the same authenticated library path as the WebView. A status
            // response alone cannot confirm that the PC database is available.
            HttpURLConnection library = open(normalized + "/api/clips");
            try {
                library.setRequestProperty("Cookie", cookie.split(";", 2)[0]);
                requireJson(library);
                return new Result(statusJson, cookie, read(library, 8 * 1024 * 1024));
            } finally { library.disconnect(); }
        } finally { connection.disconnect(); }
    }

    private static HttpURLConnection open(String url) throws IOException {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(6000);
        connection.setReadTimeout(12000);
        connection.setUseCaches(false);
        connection.setRequestProperty("Accept", "application/json");
        connection.setRequestProperty("Accept-Encoding", "identity");
        connection.setRequestProperty("Cache-Control", "no-cache");
        return connection;
    }

    private static void requireJson(HttpURLConnection connection) throws IOException {
        int status = connection.getResponseCode();
        if (status == 401 || status == 403) throw new Failure("pairing");
        if (status >= 300 && status < 400) throw new Failure("address");
        if (status != 200) throw new Failure("server");
        String type = connection.getContentType();
        if (type == null || !type.split(";", 2)[0].trim().equalsIgnoreCase("application/json")) throw new Failure("address");
    }

    private static String read(HttpURLConnection connection, int limit) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (InputStream in = connection.getInputStream()) {
            byte[] buffer = new byte[8192];
            int count;
            while ((count = in.read(buffer)) != -1) {
                if (bytes.size() + count > limit) throw new Failure("server");
                bytes.write(buffer, 0, count);
            }
        }
        return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
    }
}
