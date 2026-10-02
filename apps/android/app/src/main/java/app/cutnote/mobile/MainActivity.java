package app.cutnote.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.drawable.RippleDrawable;
import android.graphics.drawable.StateListDrawable;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.os.Build;
import android.os.Message;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Collections;
import java.util.ArrayList;
import java.util.Map;
import org.json.JSONObject;

/** Sharesheet receiver. AI credentials and saved videos remain on the connected computer. */
public final class MainActivity extends Activity {
    private static final int INK = Color.rgb(25, 25, 25);
    private static final int PAPER = Color.rgb(247, 247, 248);
    private static final int YELLOW = Color.rgb(254, 229, 0);
    private static final int MUTED = Color.rgb(102, 102, 102);
    private static final int LINE = Color.rgb(230, 230, 233);
    private static final int SOFT_YELLOW = Color.rgb(255, 249, 209);
    private static final int ERROR = Color.rgb(180, 35, 24);
    private SharedPreferences preferences;
    private LinearLayout root;
    private FrameLayout content;
    private ProgressBar progress;
    private WebView web;
    private String base = "";
    private String pairing = "";
    private ShareRequest pendingShare;
    private boolean settingsVisible;
    private boolean mainLoadFailed;
    private Bundle restoreWeb;
    private FileAccess fileAccess;
    private TextView shareNotice;
    private TextView computerStatus;
    private Button syncButton;
    private AlertDialog settingsMenu;
    private String computerStatusText = "PC 보관함\n연결 확인 전";
    private String shareIssue;
    private String lastShareLink;
    private String currentPath = "/";
    private String draftBase, draftPairing;
    private int connectionGeneration;
    private boolean checkingConnection, recoveredConnection;
    private boolean shareActive, syncing;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        preferences = getSharedPreferences("cutnote-connection", MODE_PRIVATE);
        base = preferences.getString("base", "");
        pairing = preferences.getString("pairing", "");
        fileAccess = new FileAccess(this, new FileAccess.Connection() {
            @Override public String base() { return base; }
            @Override public String pairing() { return pairing; }
        }, savedInstanceState);
        if (savedInstanceState != null) {
            pendingShare = ShareRequest.restore(savedInstanceState.getString("pendingLink"), savedInstanceState.getString("shareId"));
            lastShareLink = savedInstanceState.getString("lastShareLink");
            shareIssue = savedInstanceState.getString("shareIssue");
            currentPath = savedInstanceState.getString("currentPath", "/");
            shareActive = savedInstanceState.getBoolean("shareActive", false);
            restoreWeb = savedInstanceState.getBundle("web");
        } else pendingShare = ShareRequest.restore(preferences.getString("pendingLink", null), preferences.getString("pendingShareId", null));
        if (isShare(getIntent())) {
            String incoming = sharedLink(getIntent());
            if (savedInstanceState == null || ShareRequest.changedIncomingShare(incoming, lastShareLink)) receiveShare(incoming);
        } else if (EntryPolicy.openLibrary(false, savedInstanceState != null, getIntent() != null && (getIntent().getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0)) {
            // A launcher/history entry always opens the library. An unfinished
            // share is retained, but only resumes after the user chooses it.
            shareActive = false;
            shareIssue = null;
            currentPath = "/";
            restoreWeb = null;
        }
        if (preferences.getInt("webCacheRevision", 0) < 8) restoreWeb = null;
        buildShell();
        openPending(restoreWeb != null);
    }

    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (!isShare(intent) && !Intent.ACTION_MAIN.equals(intent == null ? null : intent.getAction())) return;
        dismissSettingsMenu();
        connectionGeneration++;
        checkingConnection = false;
        fileAccess.cancelChooser();
        if (isShare(intent)) receiveShare(sharedLink(intent));
        else { shareActive = false; shareIssue = null; currentPath = "/"; restoreWeb = null; recoveredConnection = false; }
        updateShareNotice();
        openPending(false);
    }

    private static boolean isShare(Intent intent) {
        return intent != null && Intent.ACTION_SEND.equals(intent.getAction())
            && (intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) == 0;
    }

    private String sharedLink(Intent intent) {
        if (!isShare(intent)) return null;
        ArrayList<String> parts = new ArrayList<>();
        try {
            CharSequence text = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (text != null) parts.add(text.toString());
            ClipData clips = intent.getClipData();
            for (int i = 0; clips != null && i < Math.min(clips.getItemCount(), 10); i++) {
                ClipData.Item item = clips.getItemAt(i);
                CharSequence clipText = item.getText();
                if (clipText != null) parts.add(clipText.toString());
                if (item.getUri() != null) parts.add(item.getUri().toString());
            }
            String html = intent.getStringExtra(Intent.EXTRA_HTML_TEXT);
            if (html != null) parts.add(html.replace("&amp;", "&"));
            if (intent.getData() != null) parts.add(intent.getData().toString());
        } catch (RuntimeException ignored) { /* A malformed foreign Intent cannot crash the receiver. */ }
        return LinkPolicy.extractSharedParts(parts);
    }

    private void receiveShare(String link) {
        shareActive = true;
        pendingShare = ShareRequest.create(link);
        lastShareLink = pendingShare == null ? null : pendingShare.link;
        shareIssue = pendingShare == null ? "공유 내용에서 영상 링크를 받지 못했어요. YouTube의 공유 → 링크 복사를 누른 뒤 아래에 붙여넣어 주세요." : null;
        restoreWeb = null;
        currentPath = pendingShare == null ? "/mobile" : pendingShare.mobilePath();
        recoveredConnection = false;
        persistPendingShare();
    }

    private void persistPendingShare() {
        SharedPreferences.Editor edit = preferences.edit();
        if (pendingShare == null) edit.remove("pendingLink").remove("pendingShareId");
        else edit.putString("pendingLink", pendingShare.link).putString("pendingShareId", pendingShare.id);
        edit.apply();
    }

    private void openPending(boolean restore) {
        if (shareIssue != null) showMissingShare();
        else if (LinkPolicy.normalizeComputerBase(base) == null || pairing.isEmpty()) showSettings();
        else verifyConnection(base, pairing, false, restore, null);
    }

    private void updateShareNotice() {
        if (shareNotice == null) return;
        shareNotice.setVisibility(pendingShare == null ? View.GONE : View.VISIBLE);
        if (pendingShare != null) {
            shareNotice.setText(shareActive ? "공유 링크 받음 · " + Uri.parse(pendingShare.link).getHost() + "\n연결되면 바로 저장하고 분석할게요."
                : "받아둔 영상 링크가 있어요\n여기를 눌러 저장·분석 이어가기");
            shareNotice.setClickable(!shareActive);
            shareNotice.setFocusable(!shareActive);
        }
    }

    private void showMissingShare() {
        connectionGeneration++;
        checkingConnection = false;
        syncing = false;
        settingsVisible = true;
        setComputerStatus("공유 링크를 확인해주세요");
        if (web != null) { web.stopLoading(); web.onPause(); }
        content.removeAllViews();
        progress.setVisibility(View.GONE);
        LinearLayout page = page();
        page.addView(badge("영상 가져오기"));
        page.addView(heading("공유 링크를 확인해요", 27));
        page.addView(paragraph("좋아하는 장면을 내 보관함에 모아보세요."));
        gap(page, 24);
        LinearLayout panel = card();
        panel.addView(paragraph(shareIssue));
        panel.addView(label("영상 링크"));
        EditText link = input("https://youtu.be/…");
        panel.addView(link);
        TextView error = paragraph("");
        error.setTextColor(ERROR);
        panel.addView(error);
        Button start = primaryButton("저장하고 분석하기");
        start.setOnClickListener(v -> {
            String value = LinkPolicy.extractSharedLink(link.getText().toString());
            if (value == null) { error.setText("YouTube·Instagram 또는 영상의 https:// 링크를 붙여넣어 주세요."); return; }
            receiveShare(value); updateShareNotice(); openPending(false);
        });
        addAction(panel, start, 16);
        page.addView(panel);
        showPage(page);
    }

    private void buildShell() {
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);
        LinearLayout bar = new LinearLayout(this);
        bar.setGravity(Gravity.CENTER_VERTICAL);
        bar.setPadding(dp(16), dp(10), dp(16), dp(10));
        bar.setBackgroundColor(Color.WHITE);
        ImageView mark = new ImageView(this);
        mark.setImageResource(getResources().getIdentifier("ic_cutnote", "drawable", getPackageName()));
        mark.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        LinearLayout.LayoutParams markParams = new LinearLayout.LayoutParams(dp(36), dp(36));
        markParams.setMarginEnd(dp(10));
        bar.addView(mark, markParams);
        TextView title = text("컷노트", 19);
        title.setTypeface(null, 1);
        title.setMinHeight(dp(48));
        bar.addView(title, new LinearLayout.LayoutParams(0, -2, 1));
        title.setGravity(Gravity.CENTER_VERTICAL);
        Button library = toolbarButton("보관함");
        library.setContentDescription("연결한 컷노트 보관함 열기");
        library.setOnClickListener(v -> { if (base.isEmpty() || pairing.isEmpty()) showSettings(); else { shareActive = false; shareIssue = null; recoveredConnection = false; updateShareNotice(); verifyConnection(base, pairing, false, false, "/"); } });
        bar.addView(library);
        View actionGap = new View(this);
        bar.addView(actionGap, new LinearLayout.LayoutParams(dp(6), 1));
        Button connection = toolbarButton("설정");
        connection.setContentDescription("동기화와 컴퓨터 연결 설정");
        connection.setOnClickListener(v -> showSettingsMenu());
        bar.addView(connection);
        root.addView(bar);
        shareNotice = text("", 13);
        shareNotice.setLineSpacing(dp(3), 1);
        shareNotice.setPadding(dp(14), dp(12), dp(14), dp(12));
        shareNotice.setBackground(rounded(SOFT_YELLOW, 14, 0));
        shareNotice.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        shareNotice.setOnClickListener(v -> {
            if (pendingShare == null || shareActive) return;
            shareActive = true; shareIssue = null; restoreWeb = null;
            currentPath = pendingShare.mobilePath();
            updateShareNotice(); openPending(false);
        });
        LinearLayout.LayoutParams noticeParams = new LinearLayout.LayoutParams(-1, -2);
        noticeParams.setMargins(dp(16), dp(10), dp(16), dp(10));
        root.addView(shareNotice, noticeParams);
        updateShareNotice();
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setProgressTintList(ColorStateList.valueOf(INK));
        progress.setIndeterminateTintList(ColorStateList.valueOf(INK));
        progress.setVisibility(View.GONE);
        root.addView(progress, new LinearLayout.LayoutParams(-1, dp(3)));
        content = new FrameLayout(this);
        root.addView(content, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
    }

    private void showSettingsMenu() {
        if (settingsVisible || web == null || mainLoadFailed) { showSettings(); return; }
        dismissSettingsMenu();
        LinearLayout panel = card();
        TextView status = paragraph(computerStatusText);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        panel.addView(status);
        Button sync = button("PC와 동기화");
        sync.setOnClickListener(v -> syncComputer());
        addAction(panel, sync, 16);
        Button connection = button("컴퓨터 연결 관리");
        addAction(panel, connection, 10);
        AlertDialog menu = new AlertDialog.Builder(this).setTitle("설정").setView(panel).setNegativeButton("닫기", null).create();
        connection.setOnClickListener(v -> { menu.dismiss(); showSettings(); });
        menu.setOnDismissListener(dialog -> {
            if (settingsMenu == menu) settingsMenu = null;
            if (computerStatus == status) computerStatus = null;
            if (syncButton == sync) syncButton = null;
        });
        settingsMenu = menu;
        computerStatus = status;
        syncButton = sync;
        setComputerStatus(computerStatusText);
        menu.show();
    }

    private void dismissSettingsMenu() {
        if (settingsMenu != null) settingsMenu.dismiss();
    }

    private void showSettings() {
        dismissSettingsMenu();
        connectionGeneration++;
        checkingConnection = false;
        syncing = false;
        settingsVisible = true;
        setComputerStatus("PC 연결 설정 중");
        if (web != null) { web.onPause(); web.setVisibility(View.GONE); }
        content.removeAllViews();
        progress.setVisibility(View.GONE);
        LinearLayout page = page();
        page.addView(badge("내 PC와 함께"));
        page.addView(heading("내 컴퓨터와 연결", 28));
        page.addView(paragraph("휴대폰에서 모으고, 컴퓨터에서 이어 보세요.\n한 번 연결하면 같은 보관함을 사용할 수 있어요."));
        gap(page, 24);
        LinearLayout form = card();
        form.addView(heading("연결 정보", 18));
        form.addView(paragraph("컴퓨터와 휴대폰을 같은 Wi-Fi에 연결해주세요."));
        if (pendingShare != null) form.addView(note(shareActive ? "공유한 영상은 잘 받아뒀어요. 연결되면 바로 저장하고 분석할게요." : "받아둔 링크는 보관 중이에요. 연결 후 위 안내를 눌러 이어갈 수 있어요."));
        form.addView(label("컴퓨터 주소"));
        EditText address = input("http://192.168.0.10:5174");
        address.setContentDescription("컴퓨터 주소");
        address.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        address.setText(draftBase == null ? base : draftBase);
        form.addView(address);
        form.addView(label("연결 코드"));
        EditText code = input("컴퓨터에 표시된 연결 코드");
        code.setContentDescription("연결 코드");
        code.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        code.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO);
        code.setText(draftPairing == null ? pairing : draftPairing);
        form.addView(code);
        TextView error = paragraph("");
        error.setTextColor(ERROR);
        error.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        error.setVisibility(View.GONE);
        form.addView(error);
        Button connect = primaryButton("연결하고 시작하기");
        addAction(form, connect, 24);
        connect.setOnClickListener(v -> {
            String normalized = LinkPolicy.normalizeComputerBase(address.getText().toString());
            String secret = code.getText().toString().trim();
            if (normalized == null) { error.setText("컴퓨터 안내에 표시된 http://192.168.x.x:5174 주소를 입력해주세요. 휴대폰의 localhost·127.0.0.1 주소는 컴퓨터에 연결되지 않아요."); error.setVisibility(View.VISIBLE); return; }
            if (!secret.matches("[A-Za-z0-9_-]{12,256}")) { error.setText("컴퓨터에 표시된 연결 코드를 그대로 입력해주세요."); error.setVisibility(View.VISIBLE); return; }
            draftBase = normalized; draftPairing = secret;
            recoveredConnection = false;
            verifyConnection(normalized, secret, true, false, null);
        });
        form.addView(paragraph("AI 키는 컴퓨터에 한 번만 연결하면 돼요.\n휴대폰에 다시 입력하지 않아도 괜찮아요."));
        if (!base.isEmpty() && !pairing.isEmpty()) {
            Button cancel = button("돌아가기");
            cancel.setOnClickListener(v -> { draftBase = null; draftPairing = null; openPending(false); });
            addAction(form, cancel, 14);
            Button reload = button("화면 다시 불러오기");
            reload.setOnClickListener(v -> confirmReload());
            addAction(form, reload, 10);
            form.addView(paragraph("화면이 멈추거나 오류 문구만 보이면 다시 불러올 수 있어요."));
        }
        page.addView(form);
        gap(page, 16);
        LinearLayout help = card();
        help.addView(heading("이렇게 시작해요", 17));
        help.addView(paragraph("① 컴퓨터에서 컷노트와 연결 서버 열기\n② 안내된 Wi-Fi 주소와 연결 코드 입력하기\n③ YouTube·Instagram 공유 → 컷노트 선택"));
        help.addView(paragraph("공유 목록에 안 보이면 옆으로 넘기거나 ‘더보기’를 눌러주세요."));
        page.addView(help);
        TextView version = text("컷노트 " + appVersion(), 12);
        version.setTextColor(MUTED);
        version.setGravity(Gravity.CENTER);
        version.setPadding(0, dp(24), 0, 0);
        page.addView(version);
        showPage(page);
    }

    private void verifyConnection(String address, String secret, boolean save, boolean restore, String targetPath) {
        dismissSettingsMenu();
        final int generation = ++connectionGeneration;
        checkingConnection = true;
        syncing = false;
        settingsVisible = false;
        mainLoadFailed = false;
        setComputerStatus("PC 보관함 확인 중…");
        if (web != null) { web.onPause(); web.setVisibility(View.GONE); }
        content.removeAllViews();
        LinearLayout page = page();
        page.addView(badge("잠시만 기다려주세요"));
        gap(page, 20);
        LinearLayout waiting = card();
        ProgressBar spinner = new ProgressBar(this);
        spinner.setIndeterminateTintList(ColorStateList.valueOf(INK));
        LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(dp(36), dp(36));
        spinnerParams.bottomMargin = dp(20);
        waiting.addView(spinner, spinnerParams);
        waiting.addView(heading("컴퓨터와 연결 중이에요", 23));
        waiting.addView(paragraph(!shareActive || pendingShare == null ? "내 보관함과 AI 설정을 불러오고 있어요." : "공유한 영상은 잘 받아뒀어요.\n연결되면 바로 저장하고 분석할게요."));
        page.addView(waiting);
        showPage(page);
        progress.setIndeterminate(true);
        progress.setVisibility(View.VISIBLE);
        new Thread(() -> {
            ConnectionProbe.Result result = null;
            String failure = null;
            int count = 0;
            try {
                result = ConnectionProbe.check(address, secret);
                count = libraryCount(result);
            } catch (ConnectionProbe.Failure error) { failure = error.kind; }
            catch (Exception error) { failure = "network"; }
            final ConnectionProbe.Result verified = result;
            final String problem = failure;
            final int clipCount = count;
            runOnUiThread(() -> {
                if (generation != connectionGeneration || isFinishing() || isDestroyed()) return;
                checkingConnection = false;
                progress.setIndeterminate(false);
                if (problem != null) {
                    setComputerStatus("PC 응답을 확인하지 못했어요");
                    String message = "pairing".equals(problem) ? "컴퓨터 연결 코드가 맞지 않거나 만료됐어요. 컴퓨터의 현재 코드를 입력해주세요. AI API 키를 다시 입력할 필요는 없어요."
                        : "address".equals(problem) ? "컷노트 컴퓨터 연결 서버를 확인하지 못했어요. 컴퓨터 안내에 표시된 Wi-Fi 주소(:5174)를 입력해주세요. 온라인 사이트나 :5173 주소는 휴대폰 연결 주소가 아니에요."
                        : "server".equals(problem) ? "컴퓨터의 컷노트가 아직 준비되지 않았어요. PC 웹과 연결 서버가 실행 중인지 확인해주세요."
                        : "컴퓨터에 연결하지 못했어요. 같은 Wi-Fi인지, 컴퓨터가 켜져 있는지, 주소와 연결 서버를 확인해주세요.";
                    showConnectionError(message);
                    return;
                }
                if (save) {
                    base = address; pairing = secret;
                    preferences.edit().putString("base", base).putString("pairing", pairing).apply();
                    draftBase = null; draftPairing = null;
                    destroyWeb(); restoreWeb = null;
                }
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().setCookie(address + "/", verified.cookie, accepted -> {
                    if (generation != connectionGeneration || isFinishing() || isDestroyed()) return;
                    CookieManager.getInstance().flush();
                    if (!accepted) { showConnectionError("연결 정보를 앱에 저장하지 못했어요. 앱을 다시 열고 연결해주세요."); return; }
                    markComputerChecked(clipCount);
                    if (targetPath != null) { showWebSurface(); loadPath(targetPath); }
                    else showWeb(restore);
                });
            });
        }, "cutnote-connection-check").start();
    }

    private void showWeb(boolean restore) {
        showWebSurface();
        if ((!shareActive || pendingShare == null) && restore && restoreWeb != null && web.restoreState(restoreWeb) != null) { restoreWeb = null; return; }
        loadPath(EntryPolicy.path(shareActive, pendingShare, currentPath));
    }

    private static int libraryCount(ConnectionProbe.Result result) throws ConnectionProbe.Failure {
        try {
            JSONObject workspace = new JSONObject(result.json).optJSONObject("workspace");
            if (workspace == null || !"pc".equals(workspace.optString("kind")) || !"pc".equals(workspace.optString("keyManagement"))) throw new ConnectionProbe.Failure("address");
            return new JSONObject(result.clipsJson).getJSONArray("clips").length();
        } catch (org.json.JSONException error) { throw new ConnectionProbe.Failure("server"); }
    }

    private void setComputerStatus(String message) {
        computerStatusText = message;
        if (computerStatus != null) computerStatus.setText(message);
        if (syncButton != null) syncButton.setEnabled(!checkingConnection && !syncing && !settingsVisible && !mainLoadFailed);
    }

    private void markComputerChecked(int count) {
        String time = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.KOREA).format(new java.util.Date());
        setComputerStatus("PC 응답 확인 · " + count + "개\n" + time + " · " + Uri.parse(base).getAuthority());
    }

    /** Refresh only data: never replace a draft, selected file, or active analysis. */
    private void syncComputer() {
        if (checkingConnection || syncing || settingsVisible) return;
        if (LinkPolicy.normalizeComputerBase(base) == null || pairing.isEmpty()) { showSettings(); return; }
        if (web == null || mainLoadFailed) { verifyConnection(base, pairing, false, false, null); return; }
        final int generation = ++connectionGeneration;
        final WebView original = web;
        final String address = base, secret = pairing;
        syncing = true;
        setComputerStatus("PC 보관함 확인 중…\n작성 중인 화면은 유지해요");
        new Thread(() -> {
            ConnectionProbe.Result result = null;
            String failure = null;
            int count = 0;
            try { result = ConnectionProbe.check(address, secret); count = libraryCount(result); }
            catch (ConnectionProbe.Failure error) { failure = error.kind; }
            catch (Exception error) { failure = "network"; }
            final ConnectionProbe.Result verified = result;
            final String problem = failure;
            final int clipCount = count;
            runOnUiThread(() -> {
                if (generation != connectionGeneration || web != original || !base.equals(address) || isFinishing() || isDestroyed()) return;
                if (problem != null) {
                    syncing = false;
                    setComputerStatus("PC 응답 확인 실패\n현재 화면은 그대로 유지했어요");
                    Toast.makeText(this, "pairing".equals(problem) ? "설정에서 컴퓨터의 현재 연결 코드를 확인해주세요." : "컴퓨터와 연결 서버, 같은 Wi-Fi인지 확인해주세요.", Toast.LENGTH_LONG).show();
                    return;
                }
                CookieManager.getInstance().setCookie(address + "/", verified.cookie, accepted -> {
                    if (generation != connectionGeneration || web != original || !base.equals(address) || isFinishing() || isDestroyed()) return;
                    syncing = false;
                    if (!accepted) { setComputerStatus("연결 정보를 저장하지 못했어요\n현재 화면은 그대로 유지했어요"); return; }
                    CookieManager.getInstance().flush();
                    markComputerChecked(clipCount);
                    String url = web.getUrl();
                    if (EntryPolicy.canRefreshLibrary(base, url)) {
                        web.evaluateJavascript("window.dispatchEvent(new Event('cutnote:sync'));", null);
                    } else {
                        Toast.makeText(this, "PC 응답을 확인했어요. 입력·분석 중인 화면은 유지해요.", Toast.LENGTH_SHORT).show();
                    }
                });
            });
        }, "cutnote-library-check").start();
    }

    private void confirmReload() {
        new AlertDialog.Builder(this).setTitle("화면을 다시 불러올까요?")
            .setMessage("저장 전 입력이나 진행 중 분석이 중단될 수 있어요. 받아둔 공유 링크는 유지해요.")
            .setNegativeButton("취소", null)
            .setPositiveButton("다시 불러오기", (dialog, which) -> {
                if (web != null) web.clearCache(true);
                restoreWeb = null;
                destroyWeb();
                recoveredConnection = false;
                verifyConnection(base, pairing, false, false, null);
            }).show();
    }

    private void showWebSurface() {
        settingsVisible = false;
        content.removeAllViews();
        if (web == null) createWeb();
        if (web.getParent() != null) ((ViewGroup) web.getParent()).removeView(web);
        web.setVisibility(View.VISIBLE);
        content.addView(web, new FrameLayout.LayoutParams(-1, -1));
        web.onResume();
    }

    private void createWeb() {
        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        WebSettings settings = web.getSettings();
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        if (preferences.getInt("webCacheRevision", 0) < 8) {
            web.clearCache(true);
            preferences.edit().putInt("webCacheRevision", 8).apply();
        }
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(false);
        web.setDownloadListener((url, agent, disposition, mime, length) -> fileAccess.download(url, disposition, mime, length));
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (!request.isForMainFrame()) return false;
                if (LinkPolicy.sameOrigin(base, url)) return false;
                if (request.hasGesture()) openExternal(url);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                if (view != web || checkingConnection || settingsVisible) return;
                mainLoadFailed = false;
                progress.setVisibility(View.VISIBLE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (view != web || checkingConnection || settingsVisible) return;
                progress.setVisibility(View.GONE);
                CookieManager.getInstance().flush();
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                if (view != web || !LinkPolicy.sameOrigin(base, url)) return;
                Uri location = Uri.parse(url);
                if (!"/".equals(location.getPath()) && !"/mobile".equals(location.getPath()) && !"/mobile/".equals(location.getPath())) return;
                currentPath = location.getEncodedPath() + (location.getEncodedQuery() == null ? "" : "?" + location.getEncodedQuery());
                if (pendingShare != null && pendingShare.id.equals(location.getQueryParameter("saved"))) {
                    pendingShare = null;
                    persistPendingShare();
                    updateShareNotice();
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (view == web && !checkingConnection && request.isForMainFrame()) showConnectionError("컴퓨터에 연결하지 못했어요. 같은 Wi-Fi인지, 컷노트 연결 서버가 실행 중인지 확인해주세요.");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (view != web || checkingConnection || settingsVisible || !LinkPolicy.sameOrigin(base, request.getUrl().toString())) return;
                boolean expired = false;
                Map<String, String> headers = response.getResponseHeaders();
                if (headers != null) for (Map.Entry<String, String> header : headers.entrySet()) if ("X-Cutnote-Connection".equalsIgnoreCase(header.getKey()) && "required".equals(header.getValue())) expired = true;
                if (response.getStatusCode() == 401 && (request.isForMainFrame() || expired)) {
                    if (!recoveredConnection) {
                        recoveredConnection = true;
                        verifyConnection(base, pairing, false, false, currentPath);
                    } else showConnectionError("컴퓨터 연결이 끊어졌어요. 현재 연결 코드를 확인하고 다시 연결해주세요.");
                    return;
                }
                if (!request.isForMainFrame()) return;
                if (response.getStatusCode() == 401 || response.getStatusCode() == 403) showConnectionError("연결 코드가 맞지 않거나 만료됐어요. 컴퓨터의 새 연결 코드를 입력해주세요.");
                else if (response.getStatusCode() >= 500) showConnectionError("컴퓨터의 컷노트가 아직 준비되지 않았어요. 서버 실행 상태를 확인하고 다시 연결해주세요.");
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                if (view == web) showConnectionError("보안 연결을 확인하지 못했어요. 컴퓨터 주소를 확인해주세요.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                return fileAccess.choose(view, callback, params);
            }
            @Override public void onProgressChanged(WebView view, int value) { if (view == web && !settingsVisible) progress.setProgress(value); }
            @Override public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                String target = view.getHitTestResult().getExtra();
                String internal = target == null ? null : LinkPolicy.internalPath(base, target);
                if (internal != null) { showWebSurface(); loadPath(internal); }
                else if (target != null) openExternal(target);
                return false;
            }
        });
    }

    private void loadPath(String path) {
        if (web == null) return;
        currentPath = path;
        mainLoadFailed = false;
        web.loadUrl(base + path, Collections.singletonMap("X-Cutnote-Pairing", pairing));
    }

    private void showConnectionError(String message) {
        if (mainLoadFailed || settingsVisible) return;
        dismissSettingsMenu();
        mainLoadFailed = true;
        setComputerStatus("PC 연결을 다시 확인해주세요");
        progress.setVisibility(View.GONE);
        LinearLayout page = page();
        page.addView(badge("다시 연결할 수 있어요"));
        gap(page, 20);
        LinearLayout panel = card();
        panel.addView(heading("연결을 확인해주세요", 24));
        panel.addView(paragraph(message));
        Button retry = primaryButton("다시 연결");
        retry.setOnClickListener(v -> { recoveredConnection = false; verifyConnection(draftBase == null ? base : draftBase, draftPairing == null ? pairing : draftPairing, draftBase != null, false, null); });
        addAction(panel, retry, 24);
        Button change = button("주소 · 연결 코드 바꾸기");
        change.setOnClickListener(v -> showSettings());
        addAction(panel, change, 10);
        if (pendingShare != null) panel.addView(note("공유한 링크는 그대로 있어요. 연결되면 이어서 진행할게요."));
        content.removeAllViews();
        page.addView(panel);
        showPage(page);
    }

    private void openExternal(String url) {
        if (!LinkPolicy.externalHttp(url)) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException ignored) { Toast.makeText(this, "링크를 열 수 있는 브라우저가 없어요.", Toast.LENGTH_SHORT).show(); }
    }

    @Override public void onBackPressed() {
        if (checkingConnection) { connectionGeneration++; checkingConnection = false; super.onBackPressed(); return; }
        if (settingsVisible && shareIssue == null && !base.isEmpty() && !pairing.isEmpty()) openPending(false);
        else if (web != null && !mainLoadFailed && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        super.onSaveInstanceState(state);
        fileAccess.save(state);
        if (pendingShare != null) {
            state.putString("pendingLink", pendingShare.link);
            state.putString("shareId", pendingShare.id);
        }
        state.putString("lastShareLink", lastShareLink);
        state.putString("shareIssue", shareIssue);
        state.putString("currentPath", currentPath);
        state.putBoolean("shareActive", shareActive);
        if (web != null && !mainLoadFailed && !checkingConnection && (!shareActive || pendingShare == null)) { Bundle data = new Bundle(); web.saveState(data); state.putBundle("web", data); }
    }
    @Override protected void onPause() { if (web != null) web.onPause(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null && !settingsVisible && !checkingConnection) web.onResume(); }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (!fileAccess.result(requestCode, resultCode, data)) super.onActivityResult(requestCode, resultCode, data);
    }
    @Override protected void onDestroy() { connectionGeneration++; dismissSettingsMenu(); fileAccess.destroy(); destroyWeb(); super.onDestroy(); }
    private void destroyWeb() { if (web == null) return; fileAccess.cancelChooser(); if (web.getParent() != null) ((ViewGroup) web.getParent()).removeView(web); web.stopLoading(); web.destroy(); web = null; }
    private String appVersion() {
        try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
        catch (android.content.pm.PackageManager.NameNotFoundException impossible) { return ""; }
    }
    private int dp(int n) { return Math.round(n * getResources().getDisplayMetrics().density); }
    private TextView text(String value, int size) { TextView v = new TextView(this); v.setText(value); v.setTextSize(size); v.setTextColor(INK); return v; }
    private TextView heading(String value, int size) { TextView v = text(value, size); v.setTypeface(Typeface.DEFAULT, Typeface.BOLD); v.setLineSpacing(dp(3), 1); v.setPadding(0, dp(8), 0, 0); if (Build.VERSION.SDK_INT >= 28) v.setAccessibilityHeading(true); return v; }
    private TextView paragraph(String value) { TextView v = text(value, 14); v.setTextColor(MUTED); v.setLineSpacing(dp(5), 1); v.setPadding(0, dp(10), 0, 0); return v; }
    private TextView label(String value) { TextView v = text(value, 14); v.setTypeface(Typeface.DEFAULT, Typeface.BOLD); v.setPadding(0, dp(20), 0, dp(8)); return v; }
    private GradientDrawable rounded(int color, int radius, int stroke) { GradientDrawable v = new GradientDrawable(); v.setColor(color); v.setCornerRadius(dp(radius)); if (stroke != 0) v.setStroke(dp(1), stroke); return v; }
    private TextView badge(String value) { TextView v = text(value, 12); v.setTypeface(Typeface.DEFAULT, Typeface.BOLD); v.setPadding(dp(10), dp(6), dp(10), dp(6)); v.setBackground(rounded(SOFT_YELLOW, 8, 0)); v.setLayoutParams(new LinearLayout.LayoutParams(-2, -2)); return v; }
    private TextView note(String value) { TextView v = text(value, 13); v.setLineSpacing(dp(4), 1); v.setPadding(dp(14), dp(12), dp(14), dp(12)); v.setBackground(rounded(SOFT_YELLOW, 12, 0)); LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.topMargin = dp(16); v.setLayoutParams(p); return v; }
    private LinearLayout page() { LinearLayout v = new LinearLayout(this); v.setOrientation(LinearLayout.VERTICAL); v.setPadding(dp(20), dp(24), dp(20), dp(32)); return v; }
    private LinearLayout card() { LinearLayout v = new LinearLayout(this); v.setOrientation(LinearLayout.VERTICAL); v.setPadding(dp(20), dp(16), dp(20), dp(22)); v.setBackground(rounded(Color.WHITE, 20, 0)); return v; }
    private void gap(LinearLayout parent, int size) { View v = new View(this); v.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO); parent.addView(v, new LinearLayout.LayoutParams(1, dp(size))); }
    private void showPage(LinearLayout page) { ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true); scroll.setClipToPadding(false); scroll.addView(page); content.addView(scroll, new FrameLayout.LayoutParams(-1, -1)); }
    private void addAction(LinearLayout parent, Button action, int top) { LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -2); p.topMargin = dp(top); parent.addView(action, p); }
    private EditText input(String hint) {
        EditText v = new EditText(this); v.setSingleLine(true); v.setTextSize(15); v.setHint(hint); v.setTextColor(INK); v.setHintTextColor(MUTED); v.setMinHeight(dp(56)); v.setPadding(dp(14), dp(15), dp(14), dp(15)); v.setSelectAllOnFocus(true);
        StateListDrawable background = new StateListDrawable(); background.addState(new int[]{android.R.attr.state_focused}, rounded(Color.WHITE, 14, INK)); background.addState(new int[]{}, rounded(PAPER, 14, LINE)); v.setBackgroundTintList(null); v.setBackground(background); return v;
    }
    private Button styledButton(String value, int fill) {
        Button v = new Button(this); v.setText(value); v.setTextColor(INK); v.setTextSize(14); v.setTypeface(Typeface.DEFAULT, Typeface.BOLD); v.setAllCaps(false); v.setMinWidth(0); v.setMinimumWidth(0); v.setMinHeight(dp(52)); v.setMinimumHeight(dp(52)); v.setPadding(dp(16), dp(14), dp(16), dp(14)); v.setStateListAnimator(null); v.setElevation(0); v.setBackgroundTintList(null); v.setBackground(new RippleDrawable(ColorStateList.valueOf(0x18000000), rounded(fill, 14, 0), null)); return v;
    }
    private Button button(String value) { return styledButton(value, Color.rgb(241, 241, 243)); }
    private Button primaryButton(String value) { return styledButton(value, YELLOW); }
    private Button toolbarButton(String value) { Button v = button(value); v.setTextSize(13); v.setSingleLine(true); v.setMinHeight(dp(48)); v.setMinimumHeight(dp(48)); v.setPadding(dp(12), dp(10), dp(12), dp(10)); return v; }
}
