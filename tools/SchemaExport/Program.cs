// SchemaExport — 운영 PostgreSQL 스키마를 읽기 전용으로 추출하고 SQLite DDL로 변환한다.
//
// 사용법 (저장소 루트에서):
//   dotnet run --project tools/SchemaExport -- .
// 연결 문자열: 환경변수 NEOSIS_PG 우선, 없으면 legacy/API/appsettings.json 의 ConnectionStrings:DEV
//
// 출력:
//   schema/pg/tables.json           테이블·컬럼·제약조건·인덱스 메타데이터
//   schema/pg/functions/*.sql        함수(SP) 정의 원문 + INDEX.md
//   schema/pg/views/*.sql            뷰 정의 원문
//   schema/sqlite/schema.sql         SQLite DDL (검증 통과분)
//   schema/sqlite/conversion_report.md  변환 시 제외·변경된 항목
//   schema/sqlite/seed.sql           기준 데이터(공통코드·메뉴) INSERT 문
//
// DB에는 아무것도 쓰지 않는다: 세션을 default_transaction_read_only=on 으로 열고 READ ONLY 트랜잭션에서만 조회한다.

using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;
using Npgsql;

const string PgTypes = @"character varying|character|varchar|bpchar|text|integer|bigint|smallint|numeric|double precision|real|timestamp without time zone|timestamp with time zone|timestamptz|timestamp|date|time without time zone|time|boolean|jsonb|json|uuid|regclass|interval|name";

var root = Path.GetFullPath(args.Length > 0 ? args[0] : ".");
var outPg = Path.Combine(root, "schema", "pg");
var outLite = Path.Combine(root, "schema", "sqlite");
Directory.CreateDirectory(Path.Combine(outPg, "functions"));
Directory.CreateDirectory(Path.Combine(outPg, "views"));
Directory.CreateDirectory(outLite);

string connStr = Environment.GetEnvironmentVariable("NEOSIS_PG") ?? ReadDevConnection(root);
var csb = new NpgsqlConnectionStringBuilder(connStr) { Options = "-c default_transaction_read_only=on", CommandTimeout = 120 };
Console.WriteLine($"Host={csb.Host} Database={csb.Database} (read-only)");

await using var conn = new NpgsqlConnection(csb.ConnectionString);
await conn.OpenAsync();
await using var tx = await conn.BeginTransactionAsync();
await Exec("SET TRANSACTION READ ONLY");

var tables = await Rows(@"SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1");
var columns = await Rows(@"SELECT table_name, column_name, ordinal_position, data_type, udt_name, is_nullable,
       column_default, character_maximum_length, numeric_precision, numeric_scale, is_identity
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position");
var constraints = await Rows(@"SELECT c.conrelid::regclass::text AS tbl, c.conname, c.contype::text AS contype,
       pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c WHERE c.connamespace='public'::regnamespace AND c.contype IN ('p','u','f','c')
    ORDER BY 1, 2");
var indexes = await Rows(@"SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY 1, 2");
var rowEst = await Rows(@"SELECT c.relname, c.reltuples::bigint AS est FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'");
// PostgreSQL 11 미만에는 pg_proc.prokind 가 없다(운영 DB 확인됨) → proisagg/proiswindow 로 일반 함수만 거른다
var pgVersion = Convert.ToInt32((await Rows("SHOW server_version_num"))[0]["server_version_num"]);
var kindFilter = pgVersion >= 110000 ? "p.prokind IN ('f','p')" : "NOT p.proisagg AND NOT p.proiswindow";
var functions = await Rows($@"SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args,
       pg_get_function_result(p.oid) AS result, l.lanname, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang
    WHERE n.nspname='public' AND {kindFilter}
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid=p.oid AND d.deptype='e')
    ORDER BY 1, 2");
Console.WriteLine($"server_version_num={pgVersion}");
var views = await Rows(@"SELECT viewname, definition FROM pg_views WHERE schemaname='public' ORDER BY 1");
// 기준 데이터(공통코드·메뉴·계약서 서식) — 로컬 DB 시드로 넣는다. 업무 데이터는 가져오지 않는다.
string[] seedTables = { "sys_code_cat", "sys_code_mid", "sys_code_sub", "sys_menu", "cn_contract_template" };
var seedRows = new List<(string Table, List<string> Cols, List<object?[]> Rows)>();
foreach (var st in seedTables.Where(st => tables.Any(t => (string)t["table_name"]! == st)))
    seedRows.Add(await RawRows(st));
await tx.RollbackAsync();

// ---------- 원본 메타데이터 저장 ----------
var jsonOpts = new JsonSerializerOptions { WriteIndented = true, Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping };
await File.WriteAllTextAsync(Path.Combine(outPg, "tables.json"), JsonSerializer.Serialize(new { tables, columns, constraints, indexes, rowEst }, jsonOpts));

var tableNames = tables.Select(t => (string)t["table_name"]!).ToList();
var fnIndex = new StringBuilder("# PostgreSQL 함수(SP) 목록\n\n자동 생성 파일 — `tools/SchemaExport`로 다시 만든다.\n\n| 함수 | 인자 | 반환 | 언어 | 참조 테이블 |\n| --- | --- | --- | --- | --- |\n");
var fnCount = new Dictionary<string, int>();
foreach (var f in functions)
{
    var name = (string)f["proname"]!;
    fnCount[name] = fnCount.GetValueOrDefault(name) + 1;
    var file = fnCount[name] == 1 ? $"{name}.sql" : $"{name}__{fnCount[name]}.sql";
    var def = (string)f["def"]!;
    await File.WriteAllTextAsync(Path.Combine(outPg, "functions", file), def);
    var refs = tableNames.Where(t => Regex.IsMatch(def, $@"\b{Regex.Escape(t)}\b", RegexOptions.IgnoreCase)).ToList();
    fnIndex.Append($"| [{name}](functions/{file}) | `{Esc(f["args"])}` | `{Esc(f["result"])}` | {f["lanname"]} | {string.Join(", ", refs)} |\n");
}
await File.WriteAllTextAsync(Path.Combine(outPg, "functions", "INDEX.md"), fnIndex.ToString());
foreach (var v in views)
    await File.WriteAllTextAsync(Path.Combine(outPg, "views", $"{v["viewname"]}.sql"), $"-- view {v["viewname"]}\n{v["definition"]}");

// ---------- SQLite 변환 ----------
var report = new List<string>();
var stmts = new List<(string Kind, string Name, string Sql)>();
var colsByTable = columns.GroupBy(c => (string)c["table_name"]!).ToDictionary(g => g.Key, g => g.ToList());
var consByTable = constraints.GroupBy(c => StripSchema((string)c["tbl"]!)).ToDictionary(g => g.Key, g => g.ToList());
var constraintNames = new HashSet<string>(constraints.Select(c => (string)c["conname"]!));

foreach (var t in tableNames)
{
    var cols = colsByTable.GetValueOrDefault(t) ?? new();
    var cons = consByTable.GetValueOrDefault(t) ?? new();
    var pk = cons.FirstOrDefault(c => (string)c["contype"]! == "p");
    var pkCols = pk != null ? ParenCols((string)pk["def"]!) : new List<string>();
    string? inlinePk = null;
    if (pkCols.Count == 1)
    {
        var pc = cols.FirstOrDefault(c => (string)c["column_name"]! == pkCols[0]);
        if (pc != null && IsIntType((string)pc["udt_name"]!) &&
            (((string?)pc["column_default"])?.StartsWith("nextval(") == true || (string?)pc["is_identity"] == "YES"))
            inlinePk = pkCols[0];
    }

    var lines = new List<string>();
    foreach (var c in cols)
    {
        var name = (string)c["column_name"]!;
        var type = MapType((string)c["data_type"]!, (string)c["udt_name"]!);
        var sb = new StringBuilder($"    {Q(name)} {type}");
        if (name == inlinePk) { sb.Clear().Append($"    {Q(name)} INTEGER PRIMARY KEY AUTOINCREMENT"); lines.Add(sb.ToString()); continue; }
        if ((string)c["is_nullable"]! == "NO") sb.Append(" NOT NULL");
        var d = (string?)c["column_default"];
        if (d != null)
        {
            var conv = ConvertDefault(d);
            if (conv != null) sb.Append($" DEFAULT {conv}");
            else report.Add($"- `{t}.{name}` 기본값 제외: `{d}`");
        }
        lines.Add(sb.ToString());
    }
    if (pk != null && inlinePk == null) lines.Add($"    PRIMARY KEY ({string.Join(", ", pkCols.Select(Q))})");
    foreach (var c in cons.Where(c => (string)c["contype"]! == "u"))
        lines.Add($"    CONSTRAINT {Q((string)c["conname"]!)} UNIQUE ({string.Join(", ", ParenCols((string)c["def"]!).Select(Q))})");
    foreach (var c in cons.Where(c => (string)c["contype"]! == "f"))
        lines.Add($"    CONSTRAINT {Q((string)c["conname"]!)} {StripSchema(StripCasts((string)c["def"]!)).Replace(" NOT VALID", "")}");
    foreach (var c in cons.Where(c => (string)c["contype"]! == "c"))
    {
        var chk = ConvertCheck((string)c["def"]!);
        if (chk != null) lines.Add($"    CONSTRAINT {Q((string)c["conname"]!)} {chk}");
        else report.Add($"- `{t}` CHECK 제외 `{c["conname"]}`: `{c["def"]}`");
    }
    stmts.Add(("table", t, $"CREATE TABLE IF NOT EXISTS {Q(t)} (\n{string.Join(",\n", lines)}\n);"));
}

foreach (var ix in indexes)
{
    var name = (string)ix["indexname"]!;
    if (constraintNames.Contains(name)) continue; // PK/UNIQUE 제약이 만든 인덱스는 제약으로 이미 생성됨
    var def = (string)ix["indexdef"]!;
    var m = Regex.Match(def, @"USING (\w+)");
    if (m.Success && m.Groups[1].Value is not ("btree" or "hash")) { report.Add($"- 인덱스 제외 `{name}` ({m.Groups[1].Value}): `{def}`"); continue; }
    var sql = Regex.Replace(StripSchema(StripCasts(def)), @" USING (btree|hash)", "");
    sql = Regex.Replace(sql, @"\s+(text|varchar|bpchar)_pattern_ops", ""); // PG 전용 연산자 클래스 제거
    sql = Regex.Replace(sql, @"^CREATE (UNIQUE )?INDEX ", "CREATE $1INDEX IF NOT EXISTS ");
    stmts.Add(("index", name, sql + ";"));
}

// ---------- SQLite 검증: 실제 DB를 만들어 문장별 실행 ----------
var verifyDb = Path.Combine(outLite, "verify.db");
if (File.Exists(verifyDb)) File.Delete(verifyDb);
var ok = new List<(string Kind, string Name, string Sql)>();
await using (var lite = new SqliteConnection($"Data Source={verifyDb};Pooling=False"))
{
    await lite.OpenAsync();
    foreach (var s in stmts)
    {
        try { await using var cmd = lite.CreateCommand(); cmd.CommandText = s.Sql; await cmd.ExecuteNonQueryAsync(); ok.Add(s); }
        catch (SqliteException e) { report.Add($"- SQLite 실행 실패 {s.Kind} `{s.Name}`: {e.Message}\n\n```sql\n{s.Sql}\n```"); }
    }
}

// ---------- 시드(기준 데이터) — 같은 검증 DB에 실행해 확인 ----------
var seed = new StringBuilder();
seed.AppendLine("-- Neosys Local 기준 데이터 시드 — tools/SchemaExport 가 운영 PostgreSQL에서 읽기 전용으로 자동 생성 (직접 수정 금지)");
seed.AppendLine($"-- 원본: {csb.Host}/{csb.Database}, 생성: {DateTime.Now:yyyy-MM-dd HH:mm}");
foreach (var (table, cols, rows) in seedRows)
{
    seed.AppendLine($"\n-- {table}: {rows.Count}건");
    var colList = string.Join(", ", cols.Select(Q));
    foreach (var r in rows)
        seed.AppendLine($"INSERT OR IGNORE INTO {Q(table)} ({colList}) VALUES ({string.Join(", ", r.Select(Lit))});");
}
await using (var lite = new SqliteConnection($"Data Source={verifyDb};Pooling=False"))
{
    await lite.OpenAsync();
    await using var cmd = lite.CreateCommand();
    cmd.CommandText = seed.ToString();
    try { await cmd.ExecuteNonQueryAsync(); }
    catch (SqliteException e) { report.Add($"- 시드 실행 실패: {e.Message}"); }
}
await File.WriteAllTextAsync(Path.Combine(outLite, "seed.sql"), seed.ToString());
File.Delete(verifyDb);

var ddl = new StringBuilder();
ddl.AppendLine("-- Neosys Local SQLite 스키마 — tools/SchemaExport 가 운영 PostgreSQL에서 자동 생성 (직접 수정 금지)");
ddl.AppendLine($"-- 원본: {csb.Host}/{csb.Database}, 생성: {DateTime.Now:yyyy-MM-dd HH:mm}");
ddl.AppendLine("PRAGMA foreign_keys = ON;\n");
foreach (var s in ok) ddl.AppendLine(s.Sql).AppendLine();
await File.WriteAllTextAsync(Path.Combine(outLite, "schema.sql"), ddl.ToString());

var rep = new StringBuilder("# SQLite 변환 보고서\n\n자동 생성 파일 — `tools/SchemaExport`로 다시 만든다.\n\n");
rep.AppendLine($"- 테이블 {tableNames.Count}개, 인덱스 문장 {stmts.Count(s => s.Kind == "index")}개, 함수(SP) {functions.Count}개, 뷰 {views.Count}개");
rep.AppendLine($"- SQLite 실행 성공 {ok.Count} / {stmts.Count}\n");
rep.AppendLine("## 타입 매핑\n\n정수류 → INTEGER, numeric → NUMERIC, real/double → REAL, boolean → INTEGER(0/1), 날짜·시간 → TEXT(ISO 8601), json/jsonb·배열·uuid·문자열 → TEXT, bytea → BLOB.\n");
rep.AppendLine("## 제외·변경 항목\n");
rep.AppendLine(report.Count == 0 ? "없음" : string.Join("\n", report));
await File.WriteAllTextAsync(Path.Combine(outLite, "conversion_report.md"), rep.ToString());

Console.WriteLine($"tables={tableNames.Count} functions={functions.Count} views={views.Count} sqlite_ok={ok.Count}/{stmts.Count} report_items={report.Count}");
Console.WriteLine("seed: " + string.Join(", ", seedRows.Select(s => $"{s.Table}={s.Rows.Count}")));
return;

// ================= helpers =================
async Task Exec(string sql) { await using var c = new NpgsqlCommand(sql, conn, tx); await c.ExecuteNonQueryAsync(); }
async Task<(string, List<string>, List<object?[]>)> RawRows(string table)
{
    await using var c = new NpgsqlCommand($"SELECT * FROM {Q(table)} ORDER BY 1", conn, tx);
    await using var r = await c.ExecuteReaderAsync();
    var cols = Enumerable.Range(0, r.FieldCount).Select(r.GetName).ToList();
    var list = new List<object?[]>();
    while (await r.ReadAsync())
        list.Add(Enumerable.Range(0, r.FieldCount).Select(i => r.IsDBNull(i) ? null : r.GetValue(i)).ToArray());
    return (table, cols, list);
}
async Task<List<Dictionary<string, object?>>> Rows(string sql)
{
    var list = new List<Dictionary<string, object?>>();
    await using var c = new NpgsqlCommand(sql, conn, tx);
    await using var r = await c.ExecuteReaderAsync();
    while (await r.ReadAsync())
    {
        var d = new Dictionary<string, object?>();
        for (int i = 0; i < r.FieldCount; i++)
        {
            if (r.IsDBNull(i)) { d[r.GetName(i)] = null; continue; }
            var v = r.GetValue(i);
            d[r.GetName(i)] = v is long or int or short or decimal ? v : v.ToString();
        }
        list.Add(d);
    }
    return list;
}

static string ReadDevConnection(string root)
{
    var path = Path.Combine(root, "legacy", "API", "appsettings.json");
    using var doc = JsonDocument.Parse(File.ReadAllText(path), new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true });
    return doc.RootElement.GetProperty("ConnectionStrings").GetProperty("DEV").GetString()!;
}

static string Esc(object? o) => (o?.ToString() ?? "").Replace("|", "\\|").Replace("\n", " ");
static string Q(string id) => "\"" + id.Replace("\"", "\"\"") + "\"";
// SQLite 리터럴 — 날짜는 'yyyy-MM-dd HH:mm:ss', bool은 1/0, 숫자는 문화권 무관
static string Lit(object? v) => v switch
{
    null => "NULL",
    bool b => b ? "1" : "0",
    DateTime d => $"'{d:yyyy-MM-dd HH:mm:ss}'",
    DateTimeOffset d => $"'{d.LocalDateTime:yyyy-MM-dd HH:mm:ss}'",
    IFormattable f when v is not string and not char => f.ToString(null, System.Globalization.CultureInfo.InvariantCulture),
    _ => "'" + v.ToString()!.Replace("'", "''") + "'",
};
static string StripSchema(string s) => Regex.Replace(s, @"\bpublic\.", "");
static bool IsIntType(string udt) => udt is "int2" or "int4" or "int8";

static List<string> ParenCols(string def)
{
    var m = Regex.Match(def, @"\(([^)]*)\)");
    return m.Success ? m.Groups[1].Value.Split(',').Select(x => x.Trim().Trim('"')).ToList() : new();
}

static string MapType(string dataType, string udt) => udt switch
{
    "int2" or "int4" or "int8" => "INTEGER",
    "numeric" => "NUMERIC",
    "float4" or "float8" => "REAL",
    "bool" => "INTEGER",
    "bytea" => "BLOB",
    _ => "TEXT",
};

static string StripCasts(string s) => Regex.Replace(s, $@"::""?({PgTypes})""?(\(\d+(,\s*\d+)?\))?(\[\])?", "", RegexOptions.IgnoreCase);

static string? ConvertDefault(string d)
{
    var s = StripCasts(d).Trim();
    if (s.StartsWith("nextval(")) return null;
    var lower = s.ToLowerInvariant();
    if (lower is "now()" or "current_timestamp" or "localtimestamp" or "transaction_timestamp()" or "statement_timestamp()" or "clock_timestamp()") return "CURRENT_TIMESTAMP";
    if (lower == "current_date") return "CURRENT_DATE";
    if (lower == "true") return "1";
    if (lower == "false") return "0";
    if (lower == "gen_random_uuid()" || lower == "uuid_generate_v4()") return "(lower(hex(randomblob(16))))";
    if (lower == "null") return "NULL";
    var bit = Regex.Match(d.Trim(), @"^B'([01]+)'"); // 비트 리터럴 B'0'::bit → 정수
    if (bit.Success) return Convert.ToInt64(bit.Groups[1].Value, 2).ToString();
    if (Regex.IsMatch(s, @"^'([^']|'')*'$")) return s;                 // 문자열 리터럴
    if (Regex.IsMatch(s, @"^\(?-?\d+(\.\d+)?\)?$")) return s.Trim('(', ')'); // 숫자 리터럴
    return null;
}

static string? ConvertCheck(string def)
{
    var s = StripCasts(def);
    // num_nonnulls(a, b)  →  ((a IS NOT NULL) + (b IS NOT NULL))
    s = Regex.Replace(s, @"num_nonnulls\(([^)]*)\)", m =>
        "(" + string.Join(" + ", m.Groups[1].Value.Split(',').Select(x => $"({x.Trim()} IS NOT NULL)")) + ")");
    // x = ANY (ARRAY['a', 'b'])  →  x IN ('a', 'b')
    s = Regex.Replace(s, @"=\s*ANY\s*\(\s*ARRAY\[(.*?)\]\s*\)", "IN ($1)");
    s = Regex.Replace(s, @"<>\s*ALL\s*\(\s*ARRAY\[(.*?)\]\s*\)", "NOT IN ($1)");
    if (Regex.IsMatch(s, @"::|ARRAY|~|\bSIMILAR\b|\bILIKE\b", RegexOptions.IgnoreCase)) return null;
    return s;
}
