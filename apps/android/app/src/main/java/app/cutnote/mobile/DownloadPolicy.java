package app.cutnote.mobile;

import java.net.URI;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DownloadPolicy {
    private DownloadPolicy() {}

    public static boolean allowed(String base, String url) {
        if (url == null || url.length() > 2048 || !LinkPolicy.sameOrigin(base, url)) return false;
        try {
            URI uri = new URI(url);
            if (uri.getRawFragment() != null) return false;
            boolean original = uri.getRawPath().matches("/api/media/[A-Za-z0-9_-]{1,64}");
            boolean segment = uri.getRawPath().matches("/api/segment-media/[A-Za-z0-9_-]{1,64}/[A-Za-z0-9_-]{1,64}");
            if (!original && !segment || uri.getRawQuery() == null) return false;
            Map<String, String> query = new HashMap<>();
            for (String item : uri.getRawQuery().split("&")) {
                String[] pair = item.split("=", 2);
                if (pair.length != 2) return false;
                String key = URLDecoder.decode(pair[0], "UTF-8");
                String value = URLDecoder.decode(pair[1], "UTF-8");
                if (query.put(key, value) != null || (!key.equals("download") && !key.equals("v"))) return false;
                if (value.length() > 256 || Pattern.compile("[\\p{Cntrl}]").matcher(value).find()) return false;
            }
            return "1".equals(query.get("download")) && (original ? query.size() == 1 : query.size() == 2 && !query.getOrDefault("v", "").isEmpty());
        } catch (Exception ignored) { return false; }
    }

    public static String videoMime(String mime) {
        if (mime == null) return null;
        String type = mime.split(";", 2)[0].trim().toLowerCase(java.util.Locale.ROOT);
        return type.equals("video/mp4") || type.equals("video/webm") || type.equals("video/quicktime") || type.equals("video/ogg") ? type : null;
    }

    private static String extension(String mime) {
        String type = videoMime(mime);
        if ("video/webm".equals(type)) return ".webm";
        if ("video/quicktime".equals(type)) return ".mov";
        if ("video/ogg".equals(type)) return ".ogg";
        return ".mp4";
    }

    public static String filename(String disposition, String mime) {
        String value = null;
        if (disposition != null) {
            Matcher extended = Pattern.compile("(?:^|;)\\s*filename\\*=UTF-8''([^;]+)", Pattern.CASE_INSENSITIVE).matcher(disposition);
            if (extended.find()) {
                try { value = URLDecoder.decode(extended.group(1).trim().replace("+", "%2B"), "UTF-8"); }
                catch (Exception ignored) { }
            }
            if (value == null) {
                Matcher plain = Pattern.compile("(?:^|;)\\s*filename=(?:\"([^\"]*)\"|([^;]+))", Pattern.CASE_INSENSITIVE).matcher(disposition);
                if (plain.find()) value = plain.group(1) == null ? plain.group(2).trim() : plain.group(1);
            }
        }
        if (value == null) value = "cutnote-video";
        value = value.replaceAll("[\\p{Cntrl}<>:\"/\\\\|?*]", "_").replaceAll("^[. ]+", "").trim();
        value = value.replaceFirst("(?i)\\.(mp4|webm|mov|ogg|ogv)$", "");
        if (value.isEmpty()) value = "cutnote-video";
        if (value.length() > 100) value = value.substring(0, value.offsetByCodePoints(0, Math.min(80, value.codePointCount(0, value.length()))));
        return value + (extension(mime));
    }
}
