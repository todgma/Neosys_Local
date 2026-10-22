namespace Neosys.Local.App.Ui;

/// <summary>
/// 버튼 점검(디버그 --audit) 중 메시지·토스트·인쇄/파일 창·외부 열기를 띄우지 않고 기록하는 곳.
/// 평소(Active = false)에는 아무 일도 하지 않는다.
/// </summary>
public static class AuditHook
{
    public static bool Active { get; set; }
    public static List<(string Kind, string Text)> Events { get; } = new();

    public static void Log(string kind, string text)
    {
        if (Active) Events.Add((kind, text.Replace("\r", " ").Replace("\n", " ")));
    }
}
