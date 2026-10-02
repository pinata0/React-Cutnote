package app.cutnote.mobile;

public final class LinkPolicyTest {
    private static int checks;
    private static void equal(Object expected, Object actual) {
        checks++;
        if (expected == null ? actual != null : !expected.equals(actual)) throw new AssertionError("Expected " + expected + ", got " + actual);
    }
    public static void main(String[] args) {
        equal("https://youtu.be/abc?t=2", LinkPolicy.extractSharedLink("제목\nhttps://youtu.be/abc?t=2\n"));
        equal("https://www.instagram.com/reel/ABC/", LinkPolicy.extractSharedLink("광고 https://example.com https://www.instagram.com/reel/ABC/"));
        equal("https://youtube.com/watch?v=abc", LinkPolicy.extractSharedLink("(https://youtube.com/watch?v=abc)"));
        equal("https://example.com/video.mp4", LinkPolicy.extractSharedLink("참고 https://example.com/video.mp4."));
        equal(null, LinkPolicy.extractSharedLink("javascript:alert(1)"));
        equal(null, LinkPolicy.extractSharedLink("https://user:password@youtube.com/watch?v=abc"));
        equal("http://192.168.0.10:5174", LinkPolicy.normalizeBase(" http://192.168.0.10:5174/ "));
        equal("http://10.0.0.2:5174", LinkPolicy.normalizeBase("http://10.0.0.2:5174"));
        equal("http://172.16.0.2:5174", LinkPolicy.normalizeBase("http://172.16.0.2:5174"));
        equal("http://172.31.255.254:5174", LinkPolicy.normalizeBase("http://172.31.255.254:5174"));
        equal("https://cutnote.example", LinkPolicy.normalizeBase("https://cutnote.example/"));
        for (String bad : new String[]{"http://example.com", "http://172.32.1.1", "http://192.168.1.999", "http://0192.168.1.1", "http://192.168.1.2.evil.example", "https://user:pass@example.com", "https://example.com/mobile", "https://example.com?key=secret", "https://example.com#secret", "file:///tmp/foo", "http://192.168.0.1:99999", "http://192.168.0.1:0"}) equal(null, LinkPolicy.normalizeBase(bad));
        equal(true, LinkPolicy.sameOrigin("https://example.com", "https://example.com:443/mobile"));
        equal(false, LinkPolicy.sameOrigin("http://192.168.0.1:5174", "http://192.168.0.1:5173/"));
        equal(false, LinkPolicy.sameOrigin("https://example.com", "https://example.com.evil.org/"));
        equal(false, LinkPolicy.sameOrigin("https://example.com", "https://user@example.com/"));
        equal(false, LinkPolicy.sameOrigin("https://example.com", "javascript:alert(1)"));
        equal(true, LinkPolicy.externalHttp("https://www.youtube.com/watch?v=abc"));
        equal(false, LinkPolicy.externalHttp("intent://example"));
        equal(false, LinkPolicy.externalHttp("content://media/"));
        equal("https://youtu.be/clip", LinkPolicy.extractSharedParts(java.util.Arrays.asList("영상 제목", "https://youtu.be/clip")));
        equal("https://youtube.com/watch?v=clip", LinkPolicy.extractSharedParts(java.util.Arrays.asList("https://example.com", "https://youtube.com/watch?v=clip")));
        equal("https://www.instagram.com/reel/clip/", LinkPolicy.extractSharedParts(java.util.Arrays.asList(null, "https://www.instagram.com/reel/clip/")));
        equal(null, LinkPolicy.extractSharedParts(java.util.Arrays.asList("공유 제목만 있음", "content://video/123")));
        equal(null, LinkPolicy.normalizeComputerBase("http://127.0.0.1:5173"));
        equal(null, LinkPolicy.normalizeComputerBase("http://127.2.3.4:5174"));
        equal(null, LinkPolicy.normalizeComputerBase("http://localhost:5174"));
        equal(null, LinkPolicy.normalizeComputerBase("http://[::1]:5174"));
        equal("http://192.168.0.10:5174", LinkPolicy.normalizeComputerBase("http://192.168.0.10:5174/"));
        equal("/api/media/clip_1", LinkPolicy.internalPath("http://192.168.0.10:5174", "http://192.168.0.10:5174/api/media/clip_1"));
        equal("/api/media/clip_1?download=1#part", LinkPolicy.internalPath("http://192.168.0.10:5174", "/api/media/clip_1?download=1#part"));
        equal("/mobile", LinkPolicy.internalPath("http://192.168.0.10:5174", "mobile"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", "https://youtu.be/clip"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", "http://192.168.0.10:5173/api/media/clip_1"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", "http://user@192.168.0.10:5174/"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", "javascript:alert(1)"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", "//evil.example/file"));
        equal(null, LinkPolicy.internalPath("http://192.168.0.10:5174", null));
        System.out.println("LinkPolicy: " + checks + " checks passed");
    }
}
