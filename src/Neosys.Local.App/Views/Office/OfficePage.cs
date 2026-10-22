using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Office;

/// <summary>
/// 사무실관리 허브의 [직원관리] 탭 — 기존 StaffAccountManagementPage.
///  위: 대표자 정보(본인은 목록에서 빼고 따로 표시), 표: 아이디·이름·구분·직급·이메일·전화번호·입사일·퇴사일·비고,
///  [직원 추가] · 행 [메뉴권한]/[수정]/[삭제](우클릭·도구줄). 직원 계정은 서버 데이터라 운영 서버에 바로 저장한다.
/// </summary>
public sealed class OfficePage : ListPage
{
    /// <summary>직원 메뉴 권한 대상(기존 MENU_PERM_ITEMS)</summary>
    private static readonly IReadOnlyList<Opt> PermItems = Opt.Pairs(
        ("네오봇", "네오봇"), ("공동중개망", "공동중개망"), ("물건관리", "물건관리"), ("고객관리", "고객관리"), ("계약관리", "계약관리"),
        ("협력업체관리", "협력업체관리"), ("일정관리", "일정관리"), ("쪽지관리", "쪽지관리"), ("문자관리", "문자관리"), ("만기안내", "만기관리"),
        ("업무일지", "업무일지"), ("커뮤니티", "커뮤니티"), ("메모", "메모"), ("PC폰관리", "PC폰관리"), ("원격지원", "원격지원"));

    /// <summary>구분(기존 RT_TYPE_LABEL)</summary>
    private static readonly IReadOnlyList<Opt> RtTypes = Opt.Pairs(("RTTYP01", "대표"), ("RTTYP02", "소속공인중개사"), ("RTTYP03", "중개보조원"), ("RTTYP04", "기타"));

    private readonly WrapPanel _rep = new() { VerticalAlignment = VerticalAlignment.Center };
    private readonly Border _repCard;

    public OfficePage() : base("직원관리", "직원 이름·아이디")
    {
        if (AppServices.Session.IsOwner)
        {
            AddButton("삭제", DeleteStaffAsync, "DangerButton");
            AddButton("메뉴권한", PermAsync);
            AddButton("직원 추가", () => EditStaffAsync(null), "PrimaryButton");
            AddRowMenu("메뉴권한", PermAsync);
            AddRowMenu("수정", async () => { if (Selected is { } r) await EditStaffAsync(r); else Toast.Show("수정할 직원을 선택하세요."); });
            AddRowMenu("삭제", DeleteStaffAsync);
        }
        _repCard = new Border
        {
            Child = _rep, Padding = new Thickness(16, 12, 16, 12), Margin = new Thickness(8, 0, 8, 10), Visibility = Visibility.Collapsed,
            Background = Brushes.White, BorderBrush = Legacy.B("#E5E7EB"), BorderThickness = new Thickness(1), CornerRadius = new CornerRadius(8),
        };
        SetDock(_repCard, Dock.Top);
        Children.Insert(2, _repCard);

        GridBuilder.SetColumns(Grid, new[]
        {
            ColDef.Text("id", "아이디", 120),
            ColDef.Text("rtNm", "이름", 90),
            new ColDef("rtType", "구분", 110, ColKind.Lookup, v => RtTypes.FirstOrDefault(o => o.Value == v)?.Label ?? v),
            ColDef.Text("grade", "직급", 80),
            ColDef.Text("email", "이메일", 170),
            ColDef.Text("rtTel", "전화번호", 120),
            ColDef.Date("joinDate", "입사일"),
            ColDef.Date("leaveDate", "퇴사일"),
            ColDef.Text("note", "비고", 0),
        });
    }

    protected override async Task<List<Row>> LoadAsync()
    {
        var s = AppServices.Session;
        if (s.OffNo is null) { Toast.Error("사무실 정보를 먼저 등록해야 합니다."); return new(); }
        List<Row> rows;
        try { rows = await AppServices.Server.GetRealtorsAsync(s.OffNo.Value); }
        catch (Exception ex)
        {
            CountText.Text = "직원 목록을 서버에서 불러오지 못했습니다: " + ex.Message;
            return new();
        }

        // 대표자는 위 카드에, 목록에서는 본인(로그인 계정) 제외 — 기존과 같음
        var rep = rows.FirstOrDefault(r => r.Str("rtType") == "RTTYP01");
        _rep.Children.Clear();
        if (rep is not null)
        {
            void Add(string text, double size, string color, FontWeight w) =>
                _rep.Children.Add(new TextBlock { Text = text, FontSize = size, FontWeight = w, Foreground = Legacy.B(color), Margin = new Thickness(0, 0, 16, 0), VerticalAlignment = VerticalAlignment.Center });
            Add("대표자", 15, "#4F46E5", FontWeights.ExtraBold);
            Add(rep.Str("rtNm") ?? "-", 15, "#111827", FontWeights.ExtraBold);
            Add($"아이디 {rep.Str("id") ?? "-"}", 14, "#334155", FontWeights.SemiBold);
            if (rep.Has("rtTel")) Add($"전화 {rep.Str("rtTel")}", 14, "#334155", FontWeights.SemiBold);
            if (rep.Has("email")) Add($"이메일 {rep.Str("email")}", 14, "#334155", FontWeights.SemiBold);
        }
        _repCard.Visibility = rep is null ? Visibility.Collapsed : Visibility.Visible;

        var visible = rows.Where(r => r.Long("rtNo") != s.RtNo && r.Str("id") != s.UserId);
        var kw = Keyword;
        return (kw is null ? visible : visible.Where(r => (r.Str("rtNm") ?? "").Contains(kw) || (r.Str("id") ?? "").Contains(kw))).ToList();
    }

    protected override Task OpenAsync(Row? row) =>
        row is null ? EditStaffAsync(null) : AppServices.Session.IsOwner ? EditStaffAsync(row) : Task.CompletedTask;

    /// <summary>직원 등록/수정(서버 /api/realestaters) — 기존 StaffModal: 구분·이름·전화·등록번호·아이디·비밀번호·직급·이메일·입사일·퇴사일·비고</summary>
    private async Task EditStaffAsync(Row? staff)
    {
        var s = AppServices.Session;
        if (s.OffNo is not { } offNo) { Toast.Error("사무실 정보를 먼저 등록해야 합니다."); return; }
        var isNew = staff is null;
        var r = isNew ? new Row { ["rtType"] = "RTTYP02" } : staff!.Clone();
        r.Remove("pw");
        if (!isNew) r["__key"] = 1L;
        var pw = new PasswordBox();
        var fields = new List<FieldDef>
        {
            F.Combo("rtType", "구분", RtTypes.Where(o => o.Value != "RTTYP01").ToList()), F.Text("rtNm", "이름").Required(),
            F.Text("rtTel", "전화번호"), F.Text("rtRegNo", "등록번호"),
            isNew ? F.Text("id", "아이디").Required() : F.View("id", "아이디"),
            F.Custom(isNew ? "비밀번호 *" : "비밀번호 변경", _ => pw),
            F.Text("grade", "직급"), F.Text("email", "이메일"),
            F.Date("joinDate", "입사일"), F.Date("leaveDate", "퇴사일"), F.Memo("note", "비고", 50).Span(2),
        };
        var w = new FormEditWindow(isNew ? "직원" : $"직원 {staff!.Str("rtNm")}", r, "__key", fields, async x =>
        {
            if (!x.Has("rtNm")) throw new InvalidOperationException("이름을 입력하세요.");
            if (pw.Password.Length > 0) x["pw"] = pw.Password; else x.Remove("pw");
            if (isNew && (!x.Has("id") || !x.Has("pw"))) throw new InvalidOperationException("아이디와 비밀번호를 입력하세요.");
            if (x.Has("pw") && pw.Password.Length < 4) throw new InvalidOperationException("비밀번호는 4자 이상으로 입력하세요.");
            if (!Dialogs.Confirm($"직원 정보를 서버에 {(isNew ? "등록" : "저장")}합니다. 계속하시겠습니까?")) throw new InvalidOperationException("저장을 취소했습니다.");
            if (isNew) await AppServices.Server.CreateRealtorAsync(offNo, x, s.UserId);
            else await AppServices.Server.UpdateRealtorAsync(staff!.Long("rtNo")!.Value, x, s.UserId);
            x.Remove("pw");
            pw.Clear();
            Toast.Success(isNew ? "직원이 등록되었습니다." : "직원 정보가 수정되었습니다.");
            return 1;
        }, width: 760, height: 500);
        if (w.ShowAndReport()) await RefreshAsync();
    }

    private async Task DeleteStaffAsync()
    {
        var s = AppServices.Session;
        if (Selected is not { } staff) { Toast.Show("삭제할 직원을 선택하세요."); return; }
        if (staff.Str("rtType") == "RTTYP01" || staff.Str("id") == s.UserId) { Dialogs.Info("대표(본인) 계정은 삭제할 수 없습니다."); return; }
        if (!Dialogs.Confirm($"{staff.Str("rtNm")} 직원을 삭제하시겠습니까?\n(서버 계정이 삭제됩니다)")) return;
        if (await Dialogs.RunAsync(() => AppServices.Server.DeleteRealtorAsync(staff.Long("rtNo")!.Value, s.UserId), "직원 삭제에 실패했습니다."))
        {
            Toast.Success("직원이 삭제되었습니다.");
            await RefreshAsync();
        }
    }

    /// <summary>선택 직원의 메뉴 권한(체크한 메뉴만 허용) — 서버에 전체 교체 저장(기존 StaffMenuPermModal)</summary>
    private async Task PermAsync()
    {
        if (!AppServices.Session.IsOwner) return;
        if (Selected is not { } staff) { Toast.Show("메뉴 권한을 설정할 직원을 선택하세요."); return; }
        if (staff.Str("rtType") == "RTTYP01") { Dialogs.Info("대표는 메뉴 제한이 없습니다."); return; }
        var rtNo = staff.Long("rtNo")!.Value;
        List<string> current;
        try { current = await AppServices.Server.GetStaffMenuPermAsync(rtNo); }
        catch (Exception ex) { Dialogs.Error("권한을 불러오지 못했습니다.\n" + ex.Message); return; }

        var r = new Row { ["keys"] = string.Join(",", current), ["__key"] = 1L };
        var w = new FormEditWindow($"{staff.Str("rtNm")} 메뉴 권한", r, "__key",
            new[] { F.Checks("keys", "허용 메뉴", PermItems).Span(2) },
            async x =>
            {
                var keys = (x.Str("keys") ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries);
                await AppServices.Server.SetStaffMenuPermAsync(rtNo, keys, AppServices.Session.UserId);
                return 1;
            }, columns: 1, width: 620, height: 320);
        w.ShowAndReport();
    }
}
