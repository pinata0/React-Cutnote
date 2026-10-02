package app.cutnote.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.DocumentsContract;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import android.widget.Toast;
import java.io.IOException;
import java.io.OutputStream;
import java.util.LinkedHashSet;
import java.util.Set;

/** User-selected documents only. No broad storage permission or JavaScript bridge. */
final class FileAccess {
    interface Connection { String base(); String pairing(); }
    private static final int SAVE_VIDEO = 7001;
    private static final int PICK_MEDIA = 7002;
    private final Activity activity;
    private final Connection connection;
    private PendingDownload pending;
    private DownloadTransfer active;
    private Thread worker;
    private AlertDialog progress;
    private boolean destroyed;
    private ValueCallback<Uri[]> uploadCallback;
    private WebView uploadView;
    private String uploadPage;
    private String[] uploadTypes;
    private boolean uploadMultiple;

    private static final class PendingDownload {
        final String base, url, mime, name;
        final long length;
        PendingDownload(String base, String url, String mime, String name, long length) {
            this.base = base; this.url = url; this.mime = mime; this.name = name; this.length = length;
        }
    }

    FileAccess(Activity activity, Connection connection, Bundle restored) {
        this.activity = activity; this.connection = connection;
        if (restored != null) {
            String url = restored.getString("downloadUrl"), mime = restored.getString("downloadMime");
            String origin = restored.getString("downloadBase");
            if (connection.base().equals(origin) && DownloadPolicy.allowed(origin, url) && DownloadPolicy.videoMime(mime) != null) {
                pending = new PendingDownload(origin, url, mime, restored.getString("downloadName", "cutnote-video.mp4"), restored.getLong("downloadLength", -1));
            }
        }
    }

    void download(String url, String disposition, String mime, long length) {
        if (destroyed) return;
        if (active != null || pending != null) { tell("진행 중인 영상 저장을 먼저 마쳐주세요."); return; }
        String type = DownloadPolicy.videoMime(mime);
        if (!DownloadPolicy.allowed(connection.base(), url) || type == null) { tell("연결한 컷노트의 MP4·WebM·MOV·OGG 영상만 저장할 수 있어요."); return; }
        pending = new PendingDownload(connection.base(), url, type, DownloadPolicy.filename(disposition, type), length);
        Intent picker = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType(type);
        picker.putExtra(Intent.EXTRA_TITLE, pending.name);
        try { activity.startActivityForResult(picker, SAVE_VIDEO); }
        catch (ActivityNotFoundException unavailable) { pending = null; tell("파일 저장 위치를 선택할 앱이 없어요."); }
        catch (SecurityException denied) { pending = null; tell("파일 저장 화면을 열지 못했어요."); }
    }

    boolean choose(WebView view, ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        if (destroyed || !LinkPolicy.sameOrigin(connection.base(), view.getUrl())) { callback.onReceiveValue(null); return true; }
        cancelChooser();
        uploadCallback = callback;
        uploadView = view;
        uploadPage = view.getUrl();
        uploadTypes = UploadPolicy.accepted(params.getAcceptTypes());
        uploadMultiple = params.getMode() == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
        Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        picker.addCategory(Intent.CATEGORY_OPENABLE);
        picker.setType(uploadTypes.length == 1 ? uploadTypes[0] : "*/*");
        picker.putExtra(Intent.EXTRA_MIME_TYPES, uploadTypes);
        picker.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, uploadMultiple);
        picker.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        try { activity.startActivityForResult(picker, PICK_MEDIA); }
        catch (ActivityNotFoundException unavailable) { cancelChooser(); tell("영상이나 이미지를 선택할 파일 앱이 없어요."); }
        catch (SecurityException denied) { cancelChooser(); tell("파일 선택 화면을 열지 못했어요."); }
        return true;
    }

    boolean result(int requestCode, int resultCode, Intent data) {
        if (requestCode == SAVE_VIDEO) {
            PendingDownload selected = pending;
            pending = null;
            if (resultCode != Activity.RESULT_OK || selected == null || data == null || data.getData() == null) return true;
            Uri destination = data.getData();
            if (!"content".equals(destination.getScheme())) { tell("선택한 저장 위치를 사용할 수 없어요."); return true; }
            if (!selected.base.equals(connection.base())) { deletePartial(destination); tell("컴퓨터 연결이 바뀌었어요. 다시 저장해주세요."); return true; }
            startDownload(selected, destination);
            return true;
        }
        if (requestCode == PICK_MEDIA) {
            ValueCallback<Uri[]> callback = uploadCallback;
            uploadCallback = null;
            if (callback == null) return true;
            if (resultCode != Activity.RESULT_OK || data == null || uploadView == null || !uploadPage.equals(uploadView.getUrl()) || !LinkPolicy.sameOrigin(connection.base(), uploadView.getUrl())) {
                callback.onReceiveValue(null); clearChooser(); return true;
            }
            Set<Uri> files = new LinkedHashSet<>();
            if (data.getData() != null) addUpload(files, data.getData());
            ClipData clips = data.getClipData();
            if (clips != null) for (int i = 0; i < Math.min(clips.getItemCount(), uploadMultiple ? 10 : 1); i++) addUpload(files, clips.getItemAt(i).getUri());
            if (files.isEmpty()) tell("이 항목에는 허용된 영상·이미지 파일을 선택해주세요.");
            callback.onReceiveValue(files.isEmpty() ? null : files.toArray(new Uri[0]));
            clearChooser();
            return true;
        }
        return false;
    }

    private void addUpload(Set<Uri> files, Uri uri) {
        if (uri == null || !"content".equals(uri.getScheme()) || !uploadMultiple && !files.isEmpty()) return;
        try {
            if (UploadPolicy.allowed(activity.getContentResolver().getType(uri), uploadTypes)) files.add(uri);
        } catch (RuntimeException invalid) { /* A provider can disappear while the picker is open. */ }
    }

    private void startDownload(PendingDownload selected, Uri destination) {
        String cookie = CookieManager.getInstance().getCookie(selected.url);
        String pairing = connection.pairing();
        DownloadTransfer transfer = new DownloadTransfer();
        active = transfer;
        progress = new AlertDialog.Builder(activity)
            .setTitle("휴대폰에 영상 저장")
            .setMessage("파일을 받는 중이에요. 완료될 때까지 앱을 열어두세요.")
            .setCancelable(false)
            .setNegativeButton("취소", (dialog, which) -> transfer.cancel())
            .create();
        progress.show();
        worker = new Thread(() -> {
            String message;
            boolean complete = false;
            try (OutputStream output = activity.getContentResolver().openOutputStream(destination, "wt")) {
                if (output == null) throw new IOException("No output stream");
                transfer.copy(selected.base, selected.url, cookie, pairing, selected.mime, selected.length, output,
                    (bytes, total) -> activity.runOnUiThread(() -> {
                        if (!destroyed && active == transfer && progress != null) progress.setMessage("영상 저장 중 " + (int) (bytes * 100.0 / total) + "%\n완료될 때까지 앱을 열어두세요.");
                    }));
                complete = true;
                message = "선택한 위치에 영상을 저장했어요.";
            } catch (Exception error) {
                complete = false;
                message = transfer.isCancelled() ? "영상 저장을 취소했어요." : error instanceof DownloadTransfer.Failure ? error.getMessage() : "파일 저장에 실패했어요. 연결과 남은 저장 공간을 확인해주세요.";
            }
            if (!complete && !deletePartial(destination)) message += " 선택한 위치에 남은 미완성 파일은 삭제해주세요.";
            final String result = message;
            activity.runOnUiThread(() -> {
                if (active != transfer) return;
                active = null;
                worker = null;
                if (progress != null) { progress.dismiss(); progress = null; }
                if (!destroyed) tell(result);
            });
        }, "cutnote-video-download");
        worker.start();
    }

    private boolean deletePartial(Uri uri) {
        try { return DocumentsContract.deleteDocument(activity.getContentResolver(), uri); }
        catch (Exception unavailable) { return false; }
    }

    void save(Bundle state) {
        if (pending == null) return;
        state.putString("downloadBase", pending.base);
        state.putString("downloadUrl", pending.url);
        state.putString("downloadMime", pending.mime);
        state.putString("downloadName", pending.name);
        state.putLong("downloadLength", pending.length);
    }

    void cancelChooser() {
        if (uploadCallback != null) uploadCallback.onReceiveValue(null);
        uploadCallback = null;
        clearChooser();
    }
    private void clearChooser() { uploadView = null; uploadPage = null; uploadTypes = null; }
    void destroy() {
        destroyed = true;
        cancelChooser();
        if (active != null) active.cancel();
        if (worker != null) worker.interrupt();
        if (progress != null) { progress.dismiss(); progress = null; }
    }
    private void tell(String message) { if (!destroyed) Toast.makeText(activity, message, Toast.LENGTH_LONG).show(); }
}
