package app.cutnote.mobile;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Pure Java validation shared by the Android entry point and local checks. */
public final class LinkPolicy {
    private static final Pattern LINK = Pattern.compile("https?://[^\\s<>\\\"\\u0000-\\u001F]+", Pattern.CASE_INSENSITIVE);
    private LinkPolicy() {}

    public static String extractSharedParts(Iterable<String> parts) {
        String first = null;
        for (String part : parts) {
            String link = extractSharedLink(part);
            if (link == null) continue;
            if (first == null) first = link;
            String host = URI.create(link).getHost().toLowerCase(Locale.ROOT);
            if (isDomain(host, "youtube.com") || isDomain(host, "youtu.be") || isDomain(host, "instagram.com")) return link;
        }
        return first;
    }

    public static String normalizeComputerBase(String raw) {
        String value = normalizeBase(raw);
        if (value == null) return null;
        String host = URI.create(value).getHost();
        return host.equals("localhost") || host.equals("[::1]") || host.equals("::1") || host.startsWith("127.") ? null : value;
    }

    public static String extractSharedLink(String text) {
        if (text == null || text.length() > 100_000) return null;
        Matcher matches = LINK.matcher(text);
        String first = null;
        while (matches.find()) {
            String candidate = matches.group().replaceAll("[.,;!?)}\\]＞]+$", "");
            try {
                URI uri = new URI(candidate);
                String host = uri.getHost();
                if (host == null || uri.getUserInfo() != null) continue;
                if (first == null) first = candidate;
                host = host.toLowerCase(Locale.ROOT);
                if (isDomain(host, "youtube.com") || isDomain(host, "youtu.be") || isDomain(host, "instagram.com")) return candidate;
            } catch (Exception ignored) { }
        }
        return first;
    }

    public static String normalizeBase(String raw) {
        try {
            URI uri = new URI(raw.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) return null;
            scheme = scheme.toLowerCase(Locale.ROOT);
            host = host.toLowerCase(Locale.ROOT);
            if (!scheme.equals("https") && !(scheme.equals("http") && isPrivateHost(host))) return null;
            if (uri.getPort() == 0 || uri.getPort() > 65535) return null;
            if (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/")) return null;
            return new URI(scheme, null, host, uri.getPort(), null, null, null).toASCIIString();
        } catch (Exception ignored) { return null; }
    }

    public static boolean sameOrigin(String base, String candidate) {
        try {
            URI a = new URI(base), b = new URI(candidate);
            return b.getUserInfo() == null && a.getScheme().equalsIgnoreCase(b.getScheme()) && a.getHost().equalsIgnoreCase(b.getHost()) && port(a) == port(b);
        } catch (Exception ignored) { return false; }
    }

    public static boolean externalHttp(String candidate) {
        try {
            URI uri = new URI(candidate);
            return uri.getHost() != null && uri.getUserInfo() == null && ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()));
        } catch (Exception ignored) { return false; }
    }

    public static String internalPath(String base, String candidate) {
        try {
            URI uri = new URI(base + "/").resolve(candidate);
            if (!sameOrigin(base, uri.toASCIIString())) return null;
            String path = uri.getRawPath();
            if (path == null || path.isEmpty()) path = "/";
            return path + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery())
                + (uri.getRawFragment() == null ? "" : "#" + uri.getRawFragment());
        } catch (Exception ignored) { return null; }
    }

    private static int port(URI uri) { return uri.getPort() == -1 ? ("https".equalsIgnoreCase(uri.getScheme()) ? 443 : 80) : uri.getPort(); }
    private static boolean isDomain(String host, String domain) { return host.equals(domain) || host.endsWith("." + domain); }
    private static boolean isPrivateHost(String host) {
        if (host.equals("localhost") || host.equals("[::1]") || host.equals("::1")) return true;
        String[] octets = host.split("\\.");
        if (octets.length != 4) return false;
        int[] n = new int[4];
        for (int i = 0; i < 4; i++) {
            if (!octets[i].matches("0|[1-9][0-9]{0,2}")) return false;
            n[i] = Integer.parseInt(octets[i]);
            if (n[i] > 255) return false;
        }
        return n[0] == 10 || n[0] == 127 || (n[0] == 192 && n[1] == 168) || (n[0] == 172 && n[1] >= 16 && n[1] <= 31);
    }
}
