package app.cutnote.mobile;

import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

public final class UploadPolicy {
    private UploadPolicy() {}
    public static String[] accepted(String[] input) {
        Set<String> result = new LinkedHashSet<>();
        if (input != null) for (String entry : input) {
            if (entry == null) continue;
            for (String part : entry.split(",")) {
                String value = part.trim().toLowerCase(Locale.ROOT);
                if (value.matches("(?:video|image)/(?:[a-z0-9.+-]+|\\*)")) result.add(value);
            }
        }
        if (result.isEmpty()) { result.add("video/*"); result.add("image/*"); }
        return result.toArray(new String[0]);
    }
    public static boolean allowed(String mime, String[] accepted) {
        if (mime == null) return false;
        String value = mime.toLowerCase(Locale.ROOT);
        if (!value.matches("(?:video|image)/[a-z0-9.+-]+")) return false;
        for (String type : accepted) if (type.equals(value) || type.endsWith("/*") && value.startsWith(type.substring(0, type.length() - 1))) return true;
        return false;
    }
}
