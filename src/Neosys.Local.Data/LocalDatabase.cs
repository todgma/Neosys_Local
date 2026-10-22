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

    public static string DefaultPath =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Neosys", "neosis_local.db");

    static LocalDatabase() => DapperSetup.Register();

    public LocalDatabase(string? filePath = null)
    {
        FilePath = filePath ?? DefaultPath;
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = FilePath,
            ForeignKeys = true,
            Mode = SqliteOpenMode.ReadWriteCreate,
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

    private static readonly Regex MigrationName = new(@"^Migrations/(\d+)_.+\.sql$", RegexOptions.IgnoreCase);

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
                var col = srcSet.Contains("OffNo") ? $"{row}.\"OffNo\"" : srcSet.Contains("off_no") ? $"{row}.\"off_no\"" : null;
                return col is null ? byOffice : $"COALESCE({col}, {byOffice})";
            }

            foreach (var (op, row, timing) in new[] { ("I", "NEW", "INSERT"), ("U", "NEW", "UPDATE"), ("D", "OLD", "DELETE") })
            {
                var trg = $"trg_{src}_hist_{op}";
                var colList = string.Join(", ", common.Select(c => $"\"{c}\"").Concat(extraCols.Select(c => $"\"{c}\"")));
                var values = common.Select(c => $"{row}.\"{c}\"").ToList();
                foreach (var e in extraCols)
                    values.Add(e switch
                    {
                        "log_type" => $"'{op}'",
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
