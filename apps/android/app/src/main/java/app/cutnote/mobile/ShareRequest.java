package app.cutnote.mobile;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.util.UUID;

/** One incoming share action, retained across connection retries and Activity recreation. */
public final class ShareRequest {
    public final String link;
    public final String id;

    private ShareRequest(String link, String id) { this.link = link; this.id = id; }

    public static ShareRequest create(String link) {
        String validated = LinkPolicy.extractSharedLink(link);
        return validated == null ? null : new ShareRequest(validated, UUID.randomUUID().toString());
    }

    public static ShareRequest restore(String link, String id) {
        String validated = LinkPolicy.extractSharedLink(link);
        if (validated == null) return null;
        if (id == null || !id.matches("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")) return create(validated);
        return new ShareRequest(validated, id);
    }

    public static boolean changedIncomingShare(String incoming, String previous) {
        String validated = LinkPolicy.extractSharedLink(incoming);
        return validated != null && !validated.equals(LinkPolicy.extractSharedLink(previous));
    }

    public String mobilePath() {
        try {
            return "/mobile?url=" + URLEncoder.encode(link, "UTF-8").replace("+", "%20") + "&start=analyze&shareId=" + id;
        } catch (UnsupportedEncodingException impossible) { throw new AssertionError(impossible); }
    }
}
