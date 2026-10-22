using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 사무실관리 허브의 [사무실정보 수정] 탭 — 기존 OfficeManagementPage.
///  대표 정보(대표자명·전화) · 사무소 정보(상호·사무실 전화·소재지·개설등록번호·사업자등록번호) 2열 폼,
///  개설등록증·사업자등록증(서버 파일: 보기·삭제·첨부), 등록 정보(사무실번호·등록일시·수정일시),
///  하단 [패스워드 변경][수정][닫기]. 모두 서버 데이터라 운영 서버에 바로 저장한다(웹·다른 PC에도 반영).
/// </summary>
public sealed class OfficeInfoPanel : DockPanel
{
    // 증빙 파일 구분(기존 BIZ_FILE_* / OPEN_FILE_*)
    private const string FileTyp = "SYFTY05";
    private const string BizDiv = "SYFDV03";   // 사업자등록증
    private const string OpenDiv = "SYFDV04";  // 개설등록증

    private readonly Row _form = new();
    private Row? _office;
    private readonly StackPanel _files = new();
    private readonly StackPanel _regInfo = new();
    private readonly Button _save = new() { Content = "수정", Style = (Style)Application.Current.FindResource("PrimaryButton"), Padding = new Thickness(20, 6, 20, 6) };

    public OfficeInfoPanel()
    {
        Background = Legacy.B("#F9FAFB");

        // 하단 버튼바
        var bar = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };
        var pw = new Button { Content = "패스워드 변경", Padding = new Thickness(20, 6, 20, 6) };
        pw.Click += (_, _) => ChangePassword();
        _save.Click += async (_, _) => await SaveAsync();
        var close = new Button { Content = "닫기", Padding = new Thickness(20, 6, 20, 6) };
        close.Click += (_, _) => Window.GetWindow(this)?.Close();
        bar.Children.Add(pw);
        bar.Children.Add(_save);
        bar.Children.Add(close);
        var barBorder = new Border { Child = bar, Background = Brushes.White, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 1, 0, 0), Padding = new Thickness(16, 8, 16, 8) };
        SetDock(barBorder, Dock.Bottom);
        Children.Add(barBorder);

        var body = new StackPanel { Margin = new Thickness(24) };
        body.Children.Add(Form());
        body.Children.Add(_files);
        body.Children.Add(_regInfo);
        Children.Add(new ScrollViewer { Content = body, VerticalScrollBarVisibility = ScrollBarVisibility.Auto });

        Loaded += async (_, _) => await LoadAsync();
    }

    // ---------------- 폼(회원가입 화면과 같은 라벨 | 입력창 2열) ----------------

    private FrameworkElement Form()
    {
        var g = new Grid();
        g.ColumnDefinitions.Add(new ColumnDefinition());
        g.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(20) });
        g.ColumnDefinitions.Add(new ColumnDefinition());
        int row = 0;
        void Section(string text)
        {
            g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            var h = new Border
            {
                BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 2), Padding = new Thickness(0, 0, 0, 6), Margin = new Thickness(0, row == 0 ? 2 : 14, 0, 12),
                Child = new TextBlock { Text = text, FontSize = 15, FontWeight = FontWeights.ExtraBold, Foreground = Legacy.B("#111827") },
            };
            Grid.SetRow(h, row++);
            Grid.SetColumnSpan(h, 3);
            g.Children.Add(h);
        }
        int col = 0;
        void Field(string label, string key, string placeholder, bool full = false)
        {
            if (col == 0 || full) { g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); if (full && col != 0) { row++; g.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto }); } }
            var dp = new DockPanel { Margin = new Thickness(0, 0, 0, 12) };
            var l = new TextBlock { Text = label, Width = 112, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Legacy.B("#111827"), VerticalAlignment = VerticalAlignment.Center };
            SetDock(l, Dock.Left);
            dp.Children.Add(l);
            var tb = FormBuilder.MakeTextBox(_form, key, placeholder);
            tb.Height = 34;
            tb.FontSize = 14;
            tb.FontWeight = FontWeights.SemiBold;
            tb.Tag = "4";
            Placeholder.Set(tb, placeholder);
            dp.Children.Add(tb);
            Grid.SetRow(dp, row);
            Grid.SetColumn(dp, full ? 0 : col * 2);
            if (full) Grid.SetColumnSpan(dp, 3);
            g.Children.Add(dp);
            if (full || col == 1) { row++; col = 0; } else col = 1;
        }
        void EndRow() { if (col == 1) { row++; col = 0; } }

        Section("대표 정보");
        Field("대표자명 *", "RpsNm", "대표자명을 입력하세요");
        Field("대표자 전화번호", "RpsPhone", "010-0000-0000");
        EndRow();
        Section("사무소 정보");
        Field("상호 *", "OffNm", "상호를 입력하세요");
        Field("사무실 전화번호", "OffTel", "02-0000-0000");
        Field("사업장 소재지", "Addr", "사업장 소재지를 입력하세요", full: true);
        Field("개설등록번호", "RegNo", "중개업 등록번호");
        Field("사업자등록번호", "BizNo", "000-00-00000");
        EndRow();
        return g;
    }

    private async Task LoadAsync()
    {
        var s = AppServices.Session;
        // 서버 최신값(없으면 로그인 때 받은 로컬 사본)
        _office = await AppServices.Server.GetUserOfficeAsync(s.UserId) ?? await AppServices.Sp.QueryRowAsync("ofc_realter_office", "GET", s.Params);
        foreach (var k in new[] { "OffNm", "Addr", "RpsNm", "RpsPhone", "OffTel", "OffFax", "RegNo", "BizNo" })
            _form[k] = _office?.Str(k);
        _save.Content = _office?.Long("offNo") is null ? "등록" : "수정";
        await RenderFilesAsync();
        RenderRegInfo();
    }

    private async Task SaveAsync()
    {
        var s = AppServices.Session;
        (System.Windows.Input.Keyboard.FocusedElement as FrameworkElement)?.MoveFocus(new System.Windows.Input.TraversalRequest(System.Windows.Input.FocusNavigationDirection.Next));
        if (!_form.Has("OffNm") || !_form.Has("RpsNm")) { Dialogs.Warn("상호와 대표자명은 필수입니다."); return; }
        if (_office?.Long("offNo") is not { } offNo)
        {
            // 신규 사무소 등록은 회원가입(웹)에서 — 로그인 계정에는 항상 사무소가 있다
            Dialogs.Info("사무소 신규 등록은 네오시스 웹(회원가입)에서 진행합니다.");
            return;
        }
        if (!Dialogs.Confirm("사무소 정보를 서버에 저장합니다(웹·다른 PC에도 반영). 계속하시겠습니까?")) return;
        _save.IsEnabled = false;
        try
        {
            if (await Dialogs.RunAsync(async () =>
            {
                await AppServices.Server.UpdateOfficeAsync(offNo, _form, s.UserId);
                await AppServices.Auth.RefreshOfficeAsync(s);
            }, "사무실 정보 저장 중 오류가 발생했습니다."))
            {
                Dialogs.Info("사무실 정보가 수정되었습니다.");
                await LoadAsync();
            }
        }
        finally { _save.IsEnabled = true; }
    }

    // ---------------- 개설등록증 · 사업자등록증(서버 파일) ----------------

    private async Task RenderFilesAsync()
    {
        _files.Children.Clear();
        if (_office?.Long("offNo") is not { } offNo) return;
        foreach (var (title, div) in new[] { ("개설등록증", OpenDiv), ("사업자등록증", BizDiv) })
        {
            var box = new StackPanel { Margin = new Thickness(0, 28, 0, 0) };
            box.Children.Add(new Border
            {
                BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(0, 0, 0, 8), Margin = new Thickness(0, 0, 0, 14),
                Child = new TextBlock { Text = title, FontSize = 18, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#111827") },
            });
            List<Row> files;
            try { files = await AppServices.Server.ListFilesAsync(FileTyp, div, offNo.ToString()); }
            catch (Exception ex) { files = new(); box.Children.Add(new TextBlock { Text = "파일 목록을 불러오지 못했습니다: " + ex.Message, Foreground = Legacy.B("#DC2626"), Margin = new Thickness(0, 0, 0, 10) }); }
            if (files.Count == 0)
                box.Children.Add(new TextBlock { Text = $"첨부된 {title}이 없습니다. 아래에서 업로드하세요.", FontSize = 14, Foreground = Legacy.B("#6B7280"), Margin = new Thickness(0, 0, 0, 12) });
            foreach (var f in files)
            {
                var item = f;
                var row = new DockPanel { Margin = new Thickness(0, 0, 0, 8) };
                var view = new Button { Content = "보기", Foreground = Legacy.B("#4F46E5"), BorderBrush = Legacy.B("#C7D2FE"), FontWeight = FontWeights.Bold, Padding = new Thickness(12, 2, 12, 2) };
                view.Click += async (_, _) => await OpenFileAsync(item);
                var del = new Button { Content = "삭제", Foreground = Legacy.B("#DC2626"), BorderBrush = Legacy.B("#FECACA"), FontWeight = FontWeights.Bold, Padding = new Thickness(12, 2, 12, 2) };
                del.Click += async (_, _) => await DeleteFileAsync(item, title);
                SetDock(del, Dock.Right);
                SetDock(view, Dock.Right);
                row.Children.Add(del);
                row.Children.Add(view);
                row.Children.Add(new TextBlock { Text = item.Str("origName") ?? title, FontSize = 14, FontWeight = FontWeights.SemiBold, VerticalAlignment = VerticalAlignment.Center, TextTrimming = TextTrimming.CharacterEllipsis });
                box.Children.Add(new Border { Child = row, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(6), Padding = new Thickness(8, 4, 4, 4) });
            }
            var upload = new Button { Content = $"{title} 첨부", HorizontalAlignment = HorizontalAlignment.Left, Margin = new Thickness(0, 4, 0, 0) };
            upload.Click += async (_, _) => await UploadAsync(div, title, offNo);
            box.Children.Add(upload);
            box.Children.Add(new TextBlock { Text = "PDF·JPG·PNG, 10MB 이하", FontSize = 12, Foreground = Legacy.B("#6B7280"), Margin = new Thickness(2, 4, 0, 0) });
            _files.Children.Add(box);
        }
    }

    private static async Task OpenFileAsync(Row f)
    {
        var url = f.Str("url");
        if (string.IsNullOrEmpty(url) && f.Str("objectKey") is { Length: > 0 } key)
            try { url = await AppServices.Server.GetFileUrlAsync(key); } catch { /* 아래에서 안내 */ }
        if (string.IsNullOrEmpty(url)) { Dialogs.Warn("파일 URL을 가져올 수 없습니다."); return; }
        Dialogs.OpenExternal(url);
    }

    private async Task DeleteFileAsync(Row f, string title)
    {
        if (f.Long("fileId") is not { } id) return;
        if (!Dialogs.Confirm($"{title} 파일을 삭제할까요?")) return;
        if (await Dialogs.RunAsync(() => AppServices.Server.DeleteFileAsync(id, AppServices.Session.UserId), "삭제 실패"))
            await RenderFilesAsync();
    }

    private async Task UploadAsync(string div, string title, long offNo)
    {
        var dlg = new Microsoft.Win32.OpenFileDialog { Title = $"{title} 첨부", Filter = "증빙 파일(*.pdf;*.jpg;*.jpeg;*.png)|*.pdf;*.jpg;*.jpeg;*.png" };
        if (!Dialogs.ShowFile(dlg)) return;
        var info = new FileInfo(dlg.FileName);
        if (info.Length > Core.Server.ServerApi.MaxUploadBytes) { Dialogs.Warn("파일 용량은 10MB를 초과할 수 없습니다."); return; }
        var type = info.Extension.ToLowerInvariant() switch { ".pdf" => "application/pdf", ".png" => "image/png", ".jpg" or ".jpeg" => "image/jpeg", _ => null };
        if (await Dialogs.RunAsync(async () =>
            await AppServices.Server.UploadFileAsync(FileTyp, div, offNo.ToString(), info.Name, await File.ReadAllBytesAsync(info.FullName), type, AppServices.Session.UserId), "업로드에 실패했습니다."))
        {
            Toast.Success($"{title}이 첨부되었습니다.");
            await RenderFilesAsync();
        }
    }

    private void RenderRegInfo()
    {
        _regInfo.Children.Clear();
        if (_office?.Long("offNo") is null) return;
        _regInfo.Children.Add(new Border
        {
            BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(0, 0, 0, 1), Padding = new Thickness(0, 0, 0, 8), Margin = new Thickness(0, 28, 0, 14),
            Child = new TextBlock { Text = "등록 정보", FontSize = 18, FontWeight = FontWeights.SemiBold, Foreground = Legacy.B("#111827") },
        });
        var g = new UniformGrid3();
        static string Dt(string? v) => DateTime.TryParse(v, out var d) ? d.ToString("yyyy. M. d. tt h:mm:ss", new System.Globalization.CultureInfo("ko-KR")) : "-";
        g.Add("사무실번호", _office.Str("offNo") ?? "-");
        g.Add("등록일시", Dt(_office.Str("regDt")));
        g.Add("수정일시", Dt(_office.Str("modDt") ?? _office.Str("updDt")));
        _regInfo.Children.Add(g);
    }

    /// <summary>등록 정보 3칸(라벨 위 · 값 아래)</summary>
    private sealed class UniformGrid3 : System.Windows.Controls.Primitives.UniformGrid
    {
        public UniformGrid3() { Columns = 3; }
        public void Add(string label, string value)
        {
            var sp = new StackPanel();
            sp.Children.Add(new TextBlock { Text = label, FontSize = 14, Foreground = Legacy.B("#4B5563") });
            sp.Children.Add(new TextBlock { Text = value, FontSize = 14, Foreground = Legacy.B("#111827"), Margin = new Thickness(0, 4, 0, 0) });
            Children.Add(sp);
        }
    }

    // ---------------- 패스워드 변경(서버) ----------------

    private void ChangePassword()
    {
        var cur = new PasswordBox();
        var p1 = new PasswordBox();
        var p2 = new PasswordBox();
        var err = new TextBlock { Foreground = Legacy.B("#DC2626"), FontWeight = FontWeights.SemiBold, Margin = new Thickness(0, 8, 0, 0), TextWrapping = TextWrapping.Wrap };
        var body = new StackPanel { Margin = new Thickness(20) };
        foreach (var (label, box) in new[] { ("현재 패스워드", cur), ("변경할 패스워드", p1), ("변경할 패스워드 확인", p2) })
        {
            body.Children.Add(new TextBlock { Text = label, FontSize = 14, FontWeight = FontWeights.Bold, Margin = new Thickness(0, 8, 0, 4) });
            body.Children.Add(box);
        }
        body.Children.Add(err);
        var ok = new Button { Content = "변경", Style = (Style)Application.Current.FindResource("PrimaryButton"), MinWidth = 80, IsDefault = true };
        var cancel = new Button { Content = "취소", MinWidth = 80, IsCancel = true };
        var buttons = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right, Margin = new Thickness(0, 16, 0, 0) };
        buttons.Children.Add(cancel);
        buttons.Children.Add(ok);
        body.Children.Add(buttons);
        var w = new Window
        {
            Title = "패스워드 변경", Width = 400, SizeToContent = SizeToContent.Height, ResizeMode = ResizeMode.NoResize,
            Owner = Window.GetWindow(this), WindowStartupLocation = WindowStartupLocation.CenterOwner, Content = body,
        };
        ok.Click += async (_, _) =>
        {
            // 기존 handleChangePassword와 같은 검사
            if (cur.Password.Length == 0 || p1.Password.Length == 0 || p2.Password.Length == 0) { err.Text = "모든 항목을 입력하세요."; return; }
            if (p1.Password != p2.Password) { err.Text = "새 패스워드가 일치하지 않습니다."; return; }
            if (p1.Password.Length < 4) { err.Text = "새 패스워드는 4자 이상으로 입력하세요."; return; }
            if (cur.Password == p1.Password) { err.Text = "현재 패스워드와 다른 패스워드로 변경하세요."; return; }
            ok.IsEnabled = false;
            try
            {
                await AppServices.Server.ChangePasswordAsync(AppServices.Session.UserId, cur.Password, p1.Password);
                Dialogs.Info("패스워드가 변경되었습니다.");
                w.Close();
            }
            catch (Exception ex) { err.Text = ex.Message; }
            finally { ok.IsEnabled = true; }
        };
        w.Loaded += (_, _) => cur.Focus();
        w.ShowDialog();
    }
}
