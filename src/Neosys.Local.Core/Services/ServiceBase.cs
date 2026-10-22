using System.Reflection;
using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>메뉴별 서비스 공통. SP 파라미터에 로그인 세션 값(@session_rt_no, @session_off_no, @session_user_id)을 붙여 준다.</summary>
public abstract class ServiceBase
{
    protected readonly SpRunner Sp;
    protected readonly Func<AppSession> SessionAccessor;

    protected ServiceBase(SpRunner sp, Func<AppSession> session)
    {
        Sp = sp;
        SessionAccessor = session;
    }

    protected AppSession Session => SessionAccessor();

    /// <summary>여러 값(Row·사전·익명 객체)을 하나의 파라미터 Row로 합친다. 뒤에 오는 값이 우선. 세션 값은 항상 포함.</summary>
    protected Row P(params object?[] parts)
    {
        var row = new Row();
        foreach (var part in parts) Merge(row, part);
        var s = Session;
        row["session_rt_no"] = s.RtNo;
        row["session_off_no"] = s.OffNo;
        row["session_user_id"] = s.UserId;
        return row;
    }

    internal static void Merge(Row target, object? part)
    {
        switch (part)
        {
            case null: return;
            case IDictionary<string, object?> d:
                foreach (var kv in d) target[kv.Key] = kv.Value;
                return;
            default:
                foreach (var p in part.GetType().GetProperties(BindingFlags.Public | BindingFlags.Instance))
                    if (p.GetIndexParameters().Length == 0) target[p.Name] = p.GetValue(part);
                return;
        }
    }
}
