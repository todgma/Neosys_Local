using System.Text;
using System.Text.RegularExpressions;
using Dapper;
using Microsoft.Data.Sqlite;

namespace Neosys.Local.Data;

/// <summary>
/// 로컬 SQLite DB 파일. 첫 실행 시 스키마(Sql/schema.sql)로 생성하고, 이후 Sql/Migrations/NNN_*.sql을
/// PRAGMA user_version 순서대로 적용한다. 변경 이력(_hist) 트리거는 시작할 때마다 다시 만든다.
/// </summary>
public sealed class LocalDatabase
{
    public string FilePath { get; }
    private readonly string _connectionString;

    /// <summary>경로를 주지 않았을 때의 기본값(예전 단일 DB 위치). 앱은 계정별 경로(AccountStore.DbPath)를 넘긴다.</summary>
    public static string DefaultPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "neosis_local.db");

    static LocalDatabase() => DapperSetup.Register();

    /// <summary>읽기 전용으로 열었는지(대표의 직원 DB 보기) — 쓰기는 SQLite가 SQLITE_READONLY로 막는다</summary>
    public bool ReadOnly { get; }

    public LocalDatabase(string? filePath = null, bool readOnly = false)
    {
        FilePath = filePath ?? DefaultPath;
        ReadOnly = readOnly;
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = FilePath,
            ForeignKeys = true,
            Mode = readOnly ? SqliteOpenMode.ReadOnly : SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Private,
        }.ToString();
    }

    public SqliteConnection Open()
    {
        var conn = new SqliteConnection(_connectionString);
        conn.Open();
        // PostgreSQL regexp_replace(x,'[^0-9]','','g') 대신 쓰는 함수 — 전화번호 비교용
        conn.CreateFunction("digits", (string? s) => s is null ? null : new string(s.Where(char.IsDigit).ToArray()), isDeterministic: true);
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout = 5000;";
        cmd.ExecuteNonQuery();
        return conn;
    }

    /// <summary>DB 파일이 없으면 만들고, 마이그레이션·시드·이력 트리거를 적용한다. 앱 시작 시 한 번 호출.</summary>
    public void Initialize()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(FilePath)!);
        using var conn = Open();
        conn.Execute("PRAGMA journal_mode = WAL;");

        var tableCount = conn.ExecuteScalar<long>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
        if (tableCount == 0)
        {
            using var tx = conn.BeginTransaction();
            conn.Execute(SqlResources.Read("schema.sql"), transaction: tx);
            foreach (var seed in SqlResources.List("Seed"))
                conn.Execute(SqlResources.Read(seed), transaction: tx);
            tx.Commit();
        }

        ApplyMigrations(conn);
        InstallHistTriggers(conn);
    }

    /// <summary>
    /// 사용 중에도 일관된 사본을 dest에 만든다(SQLite 온라인 백업 — 파일 복사와 달리 WAL 내용까지 반영, 쓰기 중이어도 깨지지 않음).
    /// 사본은 WAL 없이 파일 하나로 끝나도록 journal_mode를 DELETE로 바꿔 둔다.
    /// </summary>
    public void BackupTo(string dest)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(dest))!);
        if (File.Exists(dest)) File.Delete(dest);
        using (var src = Open())
        using (var dst = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = dest, Pooling = false }.ToString()))
        {
            dst.Open();
            src.BackupDatabase(dst);
            dst.Execute("PRAGMA journal_mode = DELETE;");
        }
    }

    /// <summary>DB 파일 검사(읽기 전용으로 열어 integrity_check) — 정상 여부와 스키마 버전(user_version)</summary>
    public static (bool Ok, long Version, string? Error) Inspect(string path)
    {
        try
        {
            using var conn = new SqliteConnection(new SqliteConnectionStringBuilder
            {
                DataSource = path, Mode = SqliteOpenMode.ReadOnly, Pooling = false,
            }.ToString());
            conn.Open();
            var check = conn.Query<string>("PRAGMA integrity_check").ToList();
            var version = conn.ExecuteScalar<long>("PRAGMA user_version");
            var ok = check.Count == 1 && check[0] == "ok";
            return (ok, version, ok ? null : string.Join("; ", check.Take(5)));
        }
        catch (Exception ex)
        {
            return (false, 0, ex.Message);
        }
    }

    private static readonly Regex MigrationName = new(@"^Migrations/(\d+)_.+\.sql$", RegexOptions.IgnoreCase);

    /// <summary>이 프로그램이 아는 최신 DB 버전(마지막 마이그레이션 번호) — 이보다 새 버전의 백업은 복구하지 않는다</summary>
    public static long SchemaVersion =>
        SqlResources.List("Migrations").Select(p => MigrationName.Match(p)).Where(m => m.Success)
            .Select(m => long.Parse(m.Groups[1].Value)).DefaultIfEmpty(0).Max();

    private static void ApplyMigrations(SqliteConnection conn)
    {
        var current = conn.ExecuteScalar<long>("PRAGMA user_version");
        var pending = SqlResources.List("Migrations")
            .Select(p => (Path: p, M: MigrationName.Match(p)))
            .Where(x => x.M.Success)
            .Select(x => (x.Path, Version: long.Parse(x.M.Groups[1].Value)))
            .Where(x => x.Version > current)
            .OrderBy(x => x.Version);

        foreach (var (path, version) in pending)
        {
            using var tx = conn.BeginTransaction();
            conn.Execute(SqlResources.Read(path), transaction: tx);
            conn.Execute($"PRAGMA user_version = {version}", transaction: tx);
            tx.Commit();
        }
    }

    /// <summary>
    /// 운영 DB의 fn_hist_snapshot 트리거를 SQLite 트리거로 대신한다.
    /// 테이블 X와 X_hist가 모두 있으면 INSERT/UPDATE/DELETE 때 X_hist에 행 스냅샷 + log_type(I/U/D)·logged_at·changed_by·changed_off를 남긴다.
    /// </summary>
    private static void InstallHistTriggers(SqliteConnection conn)
    {
        var tables = conn.Query<string>("SELECT name FROM sqlite_master WHERE type='table'").ToHashSet(StringComparer.OrdinalIgnoreCase);
        var sb = new StringBuilder();

        foreach (var hist in tables.Where(t => t.EndsWith("_hist", StringComparison.OrdinalIgnoreCase)))
        {
            var src = hist[..^5];
            if (!tables.Contains(src)) continue;

            var srcCols = Columns(conn, src);
            var histCols = Columns(conn, hist).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var common = srcCols.Where(histCols.Contains).ToList();
            if (common.Count == 0) continue;

            bool Has(string c) => histCols.Contains(c);
            var extraCols = new List<string>();
            if (Has("log_type")) extraCols.Add("log_type");
            if (Has("logged_at")) extraCols.Add("logged_at");
            if (Has("changed_by")) extraCols.Add("changed_by");
            if (Has("changed_off")) extraCols.Add("changed_off");

            var srcSet = srcCols.ToHashSet(StringComparer.OrdinalIgnoreCase);
            string ByExpr(string row)
            {
                var cands = new[] { "UpdId", "RegId", "upd_id", "mod_id", "reg_id", "reg_user_id", "sender_id", "owner_id", "crt_id" }
                    .Where(srcSet.Contains).Select(c => $"NULLIF({row}.\"{c}\",'')").ToList();
                return cands.Count switch
                {
                    0 => "NULL",
                    1 => cands[0],
                    _ => $"COALESCE({string.Join(", ", cands)})",
                };
            }
            // 사무소: 행의 사무소 컬럼 → 없으면 작성자(changed_by)의 사무소(기존 fn_hist_snapshot과 동일)
            string OffExpr(string row)
            {
                var byOffice = $"(SELECT r.\"OffNo\" FROM rt_realtor_info r WHERE r.\"Id\" = {ByExpr(row)} LIMIT 1)";
                var col = new[] { "OffNo", "off_no", "office_id" }.Where(srcSet.Contains).Select(c => $"{row}.\"{c}\"").FirstOrDefault();
                return col is null ? byOffice : $"COALESCE({col}, {byOffice})";
            }

            foreach (var (op, row, timing) in new[] { ("I", "NEW", "INSERT"), ("U", "NEW", "UPDATE"), ("D", "OLD", "DELETE") })
            {
                var trg = $"trg_{src}_hist_{op}";
                var colList = string.Join(", ", common.Select(c => $"\"{c}\"").Concat(extraCols.Select(c => $"\"{c}\"")));
                var values = common.Select(c => $"{row}.\"{c}\"").ToList();
                // 사용안함 처리(use_yn 'Y'→'N')는 논리 삭제라 'D'로 남긴다(업무일지 삭제 집계·활동목록이 '수정'으로 세지 않게)
                var logType = op == "U" && srcSet.Contains("use_yn")
                    ? "CASE WHEN NEW.\"use_yn\" = 'N' AND COALESCE(OLD.\"use_yn\", 'Y') <> 'N' THEN 'D' ELSE 'U' END"
                    : $"'{op}'";
                foreach (var e in extraCols)
                    values.Add(e switch
                    {
                        "log_type" => logType,
                        "logged_at" => "datetime('now','localtime')",
                        "changed_by" => ByExpr(row),
                        "changed_off" => OffExpr(row),
                        _ => "NULL",
                    });

                sb.AppendLine($"DROP TRIGGER IF EXISTS \"{trg}\";");
                sb.AppendLine($"CREATE TRIGGER \"{trg}\" AFTER {timing} ON \"{src}\" BEGIN");
                sb.AppendLine($"  INSERT INTO \"{hist}\" ({colList}) VALUES ({string.Join(", ", values)});");
                sb.AppendLine("END;");
            }
        }

        if (sb.Length == 0) return;
        using var tx = conn.BeginTransaction();
        conn.Execute(sb.ToString(), transaction: tx);
        tx.Commit();
    }

    private static List<string> Columns(SqliteConnection conn, string table) =>
        conn.Query<string>($"SELECT name FROM pragma_table_info('{table.Replace("'", "''")}')").ToList();
}
