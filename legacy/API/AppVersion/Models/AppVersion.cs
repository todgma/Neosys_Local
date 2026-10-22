namespace RealestateAPI.AppVersion.Models
{
    /// <summary>
    /// 프로그램 버전 정보 (app_version)
    /// </summary>
    public class AppVersionInfo
    {
        public long VersionId { get; set; }
        public string? Platform { get; set; }
        public string? Version { get; set; }
        public string? DownloadUrl { get; set; }
        public char? MandatoryYn { get; set; }
        public string? ReleaseNote { get; set; }
        public bool IsActive { get; set; }
        public DateTime? RegDt { get; set; }
    }
}
