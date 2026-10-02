package app.cutnote.mobile;

public final class EntryPolicyTest {
    private static int checks;
    private static void check(boolean value) { checks++; if (!value) throw new AssertionError("Entry check " + checks + " failed"); }
    public static void main(String[] args) {
        ShareRequest pending = ShareRequest.create("https://youtu.be/received");
        check(EntryPolicy.openLibrary(false, false, false)); // App icon; stored share stays deferred.
        check(EntryPolicy.path(false, pending, "/").equals("/"));
        check(!EntryPolicy.openLibrary(true, false, false)); // New external share.
        check(EntryPolicy.path(true, pending, "/").equals(pending.mobilePath()));
        check(!EntryPolicy.openLibrary(false, true, false)); // Normal Activity recreation keeps a manual draft.
        check(EntryPolicy.path(false, pending, "/mobile?draft=1").equals("/mobile?draft=1"));
        check(!EntryPolicy.openLibrary(true, true, false));
        check(EntryPolicy.path(true, ShareRequest.restore(pending.link, pending.id), "/").equals(pending.mobilePath()));
        check(EntryPolicy.path(true, null, "/mobile?saved=" + pending.id).equals("/mobile?saved=" + pending.id));
        check(EntryPolicy.openLibrary(false, false, true));
        check(EntryPolicy.openLibrary(false, true, true));
        check(EntryPolicy.openLibrary(true, true, true)); // A history flag wins over an old SEND action.
        check(EntryPolicy.path(false, pending, null).equals("/"));
        String base = "http://192.168.1.9:5174";
        check(EntryPolicy.canRefreshLibrary(base, base + "/"));
        check(EntryPolicy.canRefreshLibrary(base, base + "/?query=blue"));
        check(!EntryPolicy.canRefreshLibrary(base, base + pending.mobilePath()));
        check(!EntryPolicy.canRefreshLibrary(base, base + "/mobile?saved=" + pending.id));
        check(!EntryPolicy.canRefreshLibrary(base, "http://192.168.1.10:5174/"));
        check(!EntryPolicy.canRefreshLibrary(base, "https://example.com/"));
        check(!EntryPolicy.canRefreshLibrary(base, null));
        System.out.println("EntryPolicy: " + checks + " checks passed");
    }
}
