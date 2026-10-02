package app.cutnote.mobile;

import java.net.URI;
import java.net.URLDecoder;
import java.util.LinkedHashMap;
import java.util.Map;

public final class ShareRequestTest {
    private static int checks;
    private static void check(boolean ok) { checks++; if (!ok) throw new AssertionError("Share lifecycle check " + checks + " failed"); }
    public static void main(String[] args) throws Exception {
        String link = "https://www.youtube.com/watch?v=abc&t=12&title=%ED%95%9C%EA%B8%80#scene";
        ShareRequest first = ShareRequest.create(link);
        ShareRequest second = ShareRequest.create(link);
        check(first != null && second != null);
        check(!first.id.equals(second.id));
        check(first.id.matches("[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"));
        check(first.mobilePath().equals(first.mobilePath()));
        ShareRequest rotated = ShareRequest.restore(first.link, first.id);
        check(rotated.id.equals(first.id));
        check(rotated.mobilePath().equals(first.mobilePath()));
        ShareRequest retried = ShareRequest.restore(rotated.link, rotated.id);
        check(retried.id.equals(first.id));
        check(retried.mobilePath().equals(first.mobilePath()));
        URI url = new URI(first.mobilePath());
        Map<String, String> query = new LinkedHashMap<>();
        for (String item : url.getRawQuery().split("&")) {
            String[] pair = item.split("=", 2);
            query.put(pair[0], URLDecoder.decode(pair[1], "UTF-8"));
        }
        check(url.getPath().equals("/mobile"));
        check(query.size() == 3);
        check(query.get("url").equals(link));
        check(query.get("start").equals("analyze"));
        check(query.get("shareId").equals(first.id));
        check(url.getFragment() == null);
        check(ShareRequest.create(null) == null);
        check(ShareRequest.create("공유 링크 없음") == null);
        check(ShareRequest.restore(null, first.id) == null);
        check(ShareRequest.restore(link, "&start=delete").id.matches("[a-f0-9-]{36}"));
        check(ShareRequest.restore(link, null) != null);
        check(ShareRequest.create("https://www.instagram.com/reel/ABC/?igsh=hello").mobilePath().contains("&start=analyze&shareId="));
        check(!ShareRequest.changedIncomingShare(first.link, first.link));
        check(ShareRequest.changedIncomingShare("https://youtu.be/new", first.link));
        check(ShareRequest.changedIncomingShare(first.link, null));
        check(!ShareRequest.changedIncomingShare(null, first.link));
        check(ShareRequest.restore(first.link, first.id).mobilePath().equals(first.mobilePath()));
        System.out.println("ShareRequest: " + checks + " checks passed");
    }
}
