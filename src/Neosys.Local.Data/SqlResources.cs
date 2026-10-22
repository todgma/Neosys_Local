using System.Collections.Concurrent;
using System.Reflection;

namespace Neosys.Local.Data;

/// <summary>임베디드 SQL 리소스(Sql/**.sql) 로더. 한 번 읽은 파일은 캐시한다.</summary>
public static class SqlResources
{
    private static readonly Assembly Asm = typeof(SqlResources).Assembly;
    private static readonly ConcurrentDictionary<string, string> Cache = new();

    // 리소스 이름의 경로 구분자는 빌드 환경에 따라 '\' 또는 '/' — '/'로 통일해 찾는다.
    private static readonly Dictionary<string, string> Names = Asm.GetManifestResourceNames()
        .ToDictionary(n => n.Replace('\\', '/'), n => n, StringComparer.OrdinalIgnoreCase);

    /// <summary>예: Read("Procs/fn_ct_cust.SEL.sql")</summary>
    public static string Read(string relativePath)
    {
        return Cache.GetOrAdd(relativePath, p =>
        {
            var key = "Sql/" + p.Replace('\\', '/');
            if (!Names.TryGetValue(key, out var name))
                throw new FileNotFoundException($"SQL 리소스가 없습니다: {key}");
            using var s = Asm.GetManifestResourceStream(name)!;
            using var r = new StreamReader(s);
            return r.ReadToEnd();
        });
    }

    public static bool Exists(string relativePath) => Names.ContainsKey("Sql/" + relativePath.Replace('\\', '/'));

    /// <summary>폴더 안의 리소스 경로 목록(Sql/ 이후 경로, 이름순)</summary>
    public static IEnumerable<string> List(string folder)
    {
        var prefix = "Sql/" + folder.TrimEnd('/') + "/";
        return Names.Keys.Where(k => k.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            .Select(k => k[4..]).OrderBy(k => k, StringComparer.Ordinal);
    }
}
