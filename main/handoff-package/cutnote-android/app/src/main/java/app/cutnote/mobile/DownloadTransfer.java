package app.cutnote.mobile;

import java.io.IOException;
import java.io.InputStream;
import java.io.InterruptedIOException;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** No redirect is followed, so credentials never leave the validated origin. */
public final class DownloadTransfer {
    public static final long MAX_BYTES = 25L * 1024 * 1024;
    public interface Progress { void update(long downloaded, long total); }
    public static final class Failure extends IOException { public Failure(String message) { super(message); } }
    private volatile boolean cancelled;
    private volatile HttpURLConnection connection;
    private volatile HttpURLConnection metadataConnection;

    public void cancel() {
        cancelled = true;
        HttpURLConnection current = connection;
        if (current != null) current.disconnect();
        HttpURLConnection metadata = metadataConnection;
        if (metadata != null) metadata.disconnect();
    }
    public boolean isCancelled() { return cancelled; }
    private void checkCancelled() throws InterruptedIOException {
        if (cancelled || Thread.currentThread().isInterrupted()) throw new InterruptedIOException("저장을 취소했어요.");
    }

    public long copy(String base, String url, String cookie, String pairing, String expectedMime, long expectedLength, OutputStream output, Progress progress) throws IOException {
        if (!DownloadPolicy.allowed(base, url)) throw new Failure("이 주소에서는 영상을 저장할 수 없어요.");
        if (DownloadPolicy.videoMime(expectedMime) == null) throw new Failure("MP4·WebM·MOV·OGG 영상만 저장할 수 있어요.");
        checkCancelled();
        HttpURLConnection request = (HttpURLConnection) new URL(url).openConnection();
        connection = request;
        try {
            configure(request, "GET", cookie, pairing);
            checkCancelled();
            int code = request.getResponseCode();
            if (code >= 300 && code < 400) throw new Failure("다운로드 주소가 다른 곳으로 이동했어요. 보관함에서 다시 시도해주세요.");
            if (code == 401 || code == 403) throw new Failure("컴퓨터 연결이 만료됐어요. 연결 코드를 확인해주세요.");
            if (code != 200 && code != 206) throw new Failure("영상을 받지 못했어요. 보관함에서 다시 시도해주세요.");
            String actualMime = DownloadPolicy.videoMime(request.getContentType());
            if (!expectedMime.equals(actualMime)) throw new Failure("영상 형식을 확인하지 못했어요. 다시 시도해주세요.");
            String encoding = request.getHeaderField("Content-Encoding");
            if (encoding != null && !encoding.equalsIgnoreCase("identity")) throw new Failure("다운로드 형식을 확인하지 못했어요.");
            long length = contentLength(request);
            if (length == -1) length = headLength(base, url, cookie, pairing, expectedMime);
            checkCancelled();
            if (length <= 0 || length > MAX_BYTES) throw new Failure("영상 파일 크기를 확인하지 못했거나 25MB를 초과했어요.");
            if (expectedLength > 0 && length != expectedLength) throw new Failure("영상 파일 크기가 바뀌었어요. 보관함에서 다시 시도해주세요.");
            if (code == 206) {
                String range = request.getHeaderField("Content-Range");
                Matcher match = Pattern.compile("bytes 0-([0-9]+)/([0-9]+)").matcher(range == null ? "" : range);
                try {
                    if (!match.matches() || Long.parseLong(match.group(1)) != length - 1 || Long.parseLong(match.group(2)) != length) throw new Failure("영상의 일부만 전달되어 저장을 중단했어요.");
                } catch (NumberFormatException invalid) { throw new Failure("영상의 길이를 확인하지 못했어요."); }
            }
            long copied = 0, lastProgress = 0;
            try (InputStream input = request.getInputStream()) {
                byte[] buffer = new byte[64 * 1024];
                int read;
                while ((read = input.read(buffer)) != -1) {
                    checkCancelled();
                    if (read == 0) continue;
                    if (read > length - copied) throw new Failure("파일 길이가 일치하지 않아 저장을 중단했어요.");
                    output.write(buffer, 0, read);
                    copied += read;
                    long now = System.nanoTime();
                    if (progress != null && now - lastProgress > 250000000L) { progress.update(copied, length); lastProgress = now; }
                }
            }
            checkCancelled();
            if (copied != length) throw new Failure("다운로드가 끝나기 전에 연결이 끊겼어요.");
            output.flush();
            if (progress != null) progress.update(copied, length);
            return copied;
        } finally {
            connection = null;
            request.disconnect();
        }
    }

    private static void configure(HttpURLConnection request, String method, String cookie, String pairing) throws IOException {
        request.setInstanceFollowRedirects(false);
        request.setConnectTimeout(15000);
        request.setReadTimeout(45000);
        request.setRequestMethod(method);
        request.setRequestProperty("Accept-Encoding", "identity");
        request.setRequestProperty("Accept", "video/mp4, video/webm, video/quicktime, video/ogg");
        if (cookie != null && !cookie.isEmpty()) request.setRequestProperty("Cookie", cookie);
        else if (pairing != null && !pairing.isEmpty()) request.setRequestProperty("X-Cutnote-Pairing", pairing);
    }

    private static long contentLength(HttpURLConnection request) throws Failure {
        String raw = request.getHeaderField("Content-Length");
        if (raw == null) return -1;
        try {
            if (!raw.matches("[0-9]+")) throw new NumberFormatException();
            return Long.parseLong(raw);
        } catch (NumberFormatException invalid) { throw new Failure("영상 파일 크기를 확인하지 못했어요."); }
    }

    private long headLength(String base, String url, String cookie, String pairing, String expectedMime) throws IOException {
        if (!DownloadPolicy.allowed(base, url)) throw new Failure("이 주소에서는 영상을 저장할 수 없어요.");
        checkCancelled();
        HttpURLConnection metadata = (HttpURLConnection) new URL(url).openConnection();
        metadataConnection = metadata;
        try {
            configure(metadata, "HEAD", cookie, pairing);
            checkCancelled();
            if (metadata.getResponseCode() != 200) throw new Failure("영상 파일 크기를 확인하지 못했어요. 보관함에서 다시 시도해주세요.");
            if (!expectedMime.equals(DownloadPolicy.videoMime(metadata.getContentType()))) throw new Failure("영상 파일 형식이 바뀌었어요. 보관함에서 다시 시도해주세요.");
            String encoding = metadata.getHeaderField("Content-Encoding");
            if (encoding != null && !encoding.equalsIgnoreCase("identity")) throw new Failure("영상 파일 크기를 확인하지 못했어요.");
            long length = contentLength(metadata);
            if (length <= 0 || length > MAX_BYTES) throw new Failure("영상 파일 크기를 확인하지 못했거나 25MB를 초과했어요.");
            return length;
        } finally {
            metadataConnection = null;
            metadata.disconnect();
        }
    }
}
