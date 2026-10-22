using System.Text.Json;

namespace Neosys.Local.Core;

/// <summary>%LOCALAPPDATA%\Neosys\settings.json — 서버 주소, 마지막 로그인 ID 등 PC별 설정</summary>
public sealed class AppSettings
{
    public string ServerApiBase { get; set; } = "https://api.neosis.kr";
    public string? LastUserId { get; set; }
    public bool RememberId { get; set; } = true;
    /// <summary>상담모드(기존 대시보드 토글): 켜면 물건/고객 등록창의 오른쪽 카드(특징·상담내용·소유자 등)를 숨긴다</summary>
    public bool ConsultMode { get; set; }

    public static string FilePath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "settings.json");

    private static readonly JsonSerializerOptions Json = new() { WriteIndented = true };

    public static AppSettings Load()
    {
        try
        {
            if (File.Exists(FilePath))
                return JsonSerializer.Deserialize<AppSettings>(File.ReadAllText(FilePath)) ?? new();
        }
        catch { /* 손상된 설정은 기본값으로 */ }
        return new();
    }

    public void Save()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        File.WriteAllText(FilePath, JsonSerializer.Serialize(this, Json));
    }
}
