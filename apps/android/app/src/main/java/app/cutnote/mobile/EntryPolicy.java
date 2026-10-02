package app.cutnote.mobile;

/** Distinguishes a new app launch from restoring the screen the user is editing. */
public final class EntryPolicy {
    private EntryPolicy() { }

    public static boolean openLibrary(boolean freshShare, boolean restoring, boolean fromHistory) {
        return fromHistory || (!freshShare && !restoring);
    }

    public static String path(boolean shareActive, ShareRequest pending, String current) {
        if (shareActive && pending != null) return pending.mobilePath();
        return current == null || current.isEmpty() ? "/" : current;
    }

    public static boolean canRefreshLibrary(String base, String currentUrl) {
        if (!LinkPolicy.sameOrigin(base, currentUrl)) return false;
        try { return "/".equals(new java.net.URI(currentUrl).getPath()); }
        catch (java.net.URISyntaxException ignored) { return false; }
    }
}
