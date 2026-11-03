using System.Windows;
using System.Windows.Controls;

namespace Neosys.Local.App.Views;

/// <summary>좌측 메뉴 정의. PermKey = 직원 메뉴 권한 키(rt_menu_perm.menu_key, 기존 MENU_PERM_ITEMS와 동일). null이면 항상 표시.</summary>
public sealed record MenuDef(string Key, string Title, string? PermKey, Func<FrameworkElement> Create);

public static class MenuRegistry
{
    public static readonly IReadOnlyList<MenuDef> All = new List<MenuDef>
    {
        new("neobot", "통합검색(네오봇)", "네오봇", () => new Neobot.NeobotPage()),
        new("property", "물건관리", "물건관리", () => new Properties.PropertyPage()),
        new("customer", "고객관리", "고객관리", () => new Customers.CustomerPage()),
        new("contract", "계약관리", "계약관리", () => new Contracts.ContractPage()),
        new("schedule", "일정관리", "일정관리", () => new Schedules.SchedulePage()),
        new("interview", "상담관리", "고객관리", () => new Interviews.InterviewPage()),
        new("vendor", "협력업체관리", "협력업체관리", () => new Vendors.VendorPage()),
        new("expiry", "만기관리", "만기안내", () => new Expiry.ExpiryPage()),
        new("worklog", "업무일지", "업무일지", () => new Worklog.WorklogPage()),
        new("memo", "메모", "메모", () => new Memos.MemoPage()),
        new("report", "보고서", "물건관리", () => new Reports.ReportPage()),
        new("office", "사무실관리", null, () => new Office.OfficeHubPage()),
    };

    /// <summary>현재 사용자에게 허용된 메뉴 권한 키. null = 제한 없음(대표)</summary>
    public static Task<IReadOnlySet<string>?> AllowedKeysAsync() => Task.FromResult(AppServices.Session.AllowedMenus);

    private static FrameworkElement Placeholder(string title) => new TextBlock
    {
        Text = $"{title} — 준비 중",
        Margin = new Thickness(24),
        FontSize = 16,
    };
}
