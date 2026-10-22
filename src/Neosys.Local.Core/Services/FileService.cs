using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>첨부 종류 — sys_file의 file_typ / file_div 조합(기존 프런트와 같은 코드)</summary>
public sealed record FileKind(string Typ, string Div, string Title, long MaxBytes, string? Filter = null)
{
    private const string Images = "이미지|*.jpg;*.jpeg;*.png;*.gif;*.bmp;*.webp|모든 파일|*.*";

    /// <summary>물건 평면도 (SYFTY01 이미지 / SYFDV05 평면도), ref_key = pt_no</summary>
    public static readonly FileKind FloorPlan = new("SYFTY01", "SYFDV05", "평면도", 20 * 1024 * 1024, Images);
    /// <summary>물건사진 (SYFTY04 사진 / SYFDV01 물건사진), ref_key = pt_no</summary>
    public static readonly FileKind PropertyPhoto = new("SYFTY04", "SYFDV01", "물건사진", 20 * 1024 * 1024, Images);
    /// <summary>계약서·확인설명서 등 첨부 (SYFTY03 계약서 / SYFDV07 계약-직접등록), ref_key = master_id, 최대 10개·5MB</summary>
    public static readonly FileKind ContractFile = new("SYFTY03", "SYFDV07", "계약 첨부", 5 * 1024 * 1024);
    /// <summary>공제증서 (SYFTY05 증빙 / SYFDV06 공제증서), ref_key = master_id</summary>
    public static readonly FileKind GongjeCert = new("SYFTY05", "SYFDV06", "공제증서", 5 * 1024 * 1024);
}

/// <summary>
/// 첨부파일 — 기존 FileService(네이버클라우드 오브젝트 스토리지 + sys_file)를 로컬 폴더 + sys_file로 바꾼 것.
/// 파일은 %LOCALAPPDATA%\Neosys\files\&lt;file_div&gt;\&lt;yyyyMM&gt;\&lt;GUID&gt;.&lt;확장자&gt; 로 복사하고,
/// sys_file.object_key 에 이 폴더 기준 상대 경로를 남긴다. 삭제는 기존처럼 사용안함 처리 + 파일을 _trash 폴더로 옮긴다.
/// </summary>
public sealed class FileService : ServiceBase
{
    public string Root { get; }

    public static string DefaultRoot =>
        Environment.GetEnvironmentVariable("NEOSYS_FILES")
        ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "files");

    public FileService(SpRunner sp, Func<AppSession> session, string? root = null) : base(sp, session)
    {
        Root = root ?? DefaultRoot;
    }

    public Task<List<Row>> ListAsync(FileKind kind, string refKey) =>
        Sp.QueryRowsAsync("sys_file", "LIST", new { file_typ = kind.Typ, file_div = kind.Div, ref_key = refKey });

    /// <summary>대상(ref_key)의 모든 첨부(종류 무관)</summary>
    public Task<List<Row>> ListAllAsync(string refKey) =>
        Sp.QueryRowsAsync("sys_file", "LIST", new { ref_key = refKey });

    /// <summary>파일을 첨부 폴더로 복사하고 sys_file에 기록. 새 file_id를 채운 행을 돌려준다.</summary>
    public async Task<Row> AttachAsync(FileKind kind, string refKey, string sourcePath, string? descr = null)
    {
        if (string.IsNullOrWhiteSpace(refKey)) throw new InvalidOperationException("먼저 저장한 뒤 첨부할 수 있습니다.");
        var info = new FileInfo(sourcePath);
        if (!info.Exists) throw new InvalidOperationException($"파일을 찾을 수 없습니다: {sourcePath}");
        if (info.Length > kind.MaxBytes)
            throw new InvalidOperationException($"{info.Name}: 파일이 너무 큽니다(최대 {kind.MaxBytes / 1024 / 1024}MB).");

        var ext = info.Extension.TrimStart('.').ToLowerInvariant();
        var rel = Path.Combine(kind.Div, DateTime.Now.ToString("yyyyMM"), $"{Guid.NewGuid():N}{(ext.Length > 0 ? "." + ext : "")}");
        var dest = Path.Combine(Root, rel);
        Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
        File.Copy(sourcePath, dest);

        var row = new Row
        {
            ["file_typ"] = kind.Typ, ["file_div"] = kind.Div, ["ref_key"] = refKey,
            ["orig_name"] = info.Name, ["object_key"] = rel.Replace('\\', '/'),
            ["content_type"] = ContentType(ext), ["file_size"] = info.Length, ["ext"] = ext, ["descr"] = descr,
        };
        try
        {
            row["file_id"] = await Sp.InsertAsync("sys_file", "INS", P(row));
        }
        catch
        {
            File.Delete(dest);   // 기록 실패 시 복사본 정리
            throw;
        }
        return row;
    }

    /// <summary>첨부의 실제 파일 경로(없으면 null)</summary>
    public string? PathOf(Row file)
    {
        var key = file.Str("object_key");
        if (string.IsNullOrEmpty(key)) return null;
        var full = Path.GetFullPath(Path.Combine(Root, key.Replace('/', Path.DirectorySeparatorChar)));
        // 첨부 폴더 밖을 가리키는 키는 쓰지 않는다
        if (!full.StartsWith(Path.GetFullPath(Root), StringComparison.OrdinalIgnoreCase)) return null;
        return File.Exists(full) ? full : null;
    }

    public Task SetDescrAsync(long fileId, string? descr) =>
        Sp.ExecuteAsync("sys_file", "UPD", P(new { file_id = fileId, descr }));

    /// <summary>삭제 — 사용안함 처리하고 실제 파일은 _trash 폴더로 옮긴다(복구 가능)</summary>
    public async Task DeleteAsync(long fileId)
    {
        var row = await Sp.QueryRowAsync("sys_file", "GET", new { file_id = fileId });
        await Sp.ExecuteAsync("sys_file", "DEL", P(new { file_id = fileId }));
        if (row is not null && PathOf(row) is { } path)
        {
            var trash = Path.Combine(Root, "_trash", row.Str("object_key")!.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(trash)!);
            File.Move(path, trash, overwrite: true);
        }
    }

    public static bool IsImage(Row file) => file.Str("content_type")?.StartsWith("image/") == true;

    private static string ContentType(string ext) => ext switch
    {
        "jpg" or "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        "pdf" => "application/pdf",
        "hwp" => "application/x-hwp",
        "doc" => "application/msword",
        "docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xls" => "application/vnd.ms-excel",
        "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "txt" => "text/plain",
        _ => "application/octet-stream",
    };
}
