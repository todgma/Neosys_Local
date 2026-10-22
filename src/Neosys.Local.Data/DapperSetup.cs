using System.Data;
using System.Globalization;
using Dapper;

namespace Neosys.Local.Data;

/// <summary>SQLite는 날짜를 TEXT로 저장한다 — Dapper가 문자열 ↔ DateTime을 문화권과 무관하게 변환하도록 등록.</summary>
internal static class DapperSetup
{
    private static int _done;

    public static void Register()
    {
        if (Interlocked.Exchange(ref _done, 1) == 1) return;
        SqlMapper.AddTypeHandler(new DateTimeHandler());
        SqlMapper.AddTypeHandler(new DateOnlyHandler());
    }

    private const string Format = "yyyy-MM-dd HH:mm:ss";

    private sealed class DateTimeHandler : SqlMapper.TypeHandler<DateTime>
    {
        public override void SetValue(IDbDataParameter parameter, DateTime value)
        {
            parameter.DbType = DbType.String;
            parameter.Value = value.ToString(Format, CultureInfo.InvariantCulture);
        }

        public override DateTime Parse(object value) => value switch
        {
            DateTime d => d,
            string s => DateTime.Parse(s, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces),
            long l => DateTimeOffset.FromUnixTimeSeconds(l).LocalDateTime,
            _ => Convert.ToDateTime(value, CultureInfo.InvariantCulture),
        };
    }

    private sealed class DateOnlyHandler : SqlMapper.TypeHandler<DateOnly>
    {
        public override void SetValue(IDbDataParameter parameter, DateOnly value)
        {
            parameter.DbType = DbType.String;
            parameter.Value = value.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }

        public override DateOnly Parse(object value) =>
            DateOnly.FromDateTime(DateTime.Parse(Convert.ToString(value, CultureInfo.InvariantCulture)!, CultureInfo.InvariantCulture));
    }
}
