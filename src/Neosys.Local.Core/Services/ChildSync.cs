using Neosys.Local.Data;

namespace Neosys.Local.Core.Services;

/// <summary>하위 목록 저장 도우미 — 기존 API의 Sync* 메서드(전체 교체 / 변경분 반영)를 대신한다.</summary>
internal static class ChildSync
{
    /// <summary>
    /// 전체 삭제 후 다시 넣기(희망지역·구입자·공동중개사·임대차현황 등). 빈 행은 건너뛰고 seq를 1부터 다시 매긴다.
    /// </summary>
    public static async Task ReplaceAllAsync(SpTransaction tx, string sp, Row owner, IEnumerable<Row> rows,
        string seqKey, IReadOnlyList<string> contentKeys, Func<Row, Row> param)
    {
        await tx.ExecuteAsync(sp, "DEL", param(owner));
        int seq = 1;
        foreach (var r in rows)
        {
            if (!contentKeys.Any(r.Has)) continue;
            var p = param(r);
            foreach (var kv in owner) p[kv.Key] = kv.Value;
            p[seqKey] = seq++;
            await tx.ExecuteAsync(sp, "INS", p);
        }
    }

    /// <summary>
    /// 변경분만 반영(메모·상담이력): 키가 없는 행은 INS(내용이 있을 때만), 키가 있으면 UPD, 목록에서 빠진 기존 키는 DEL.
    /// </summary>
    public static async Task MergeAsync(SpTransaction tx, string sp, string keyName, IEnumerable<long> existingKeys,
        IEnumerable<Row> rows, string contentKey, Func<Row, Row> param, string updMode = "UPD",
        Func<Row, Task>? afterInsert = null)
    {
        var list = rows.ToList();
        var keep = list.Select(r => r.Long(keyName)).Where(k => k is > 0).Select(k => k!.Value).ToHashSet();
        foreach (var k in existingKeys.Where(k => !keep.Contains(k)))
            await tx.ExecuteAsync(sp, "DEL", new Row { [keyName] = k });

        foreach (var r in list)
        {
            var p = param(r);
            if (r.Long(keyName) is > 0)
            {
                await tx.ExecuteAsync(sp, updMode, p);
            }
            else if (r.Has(contentKey))
            {
                r[keyName] = await tx.InsertAsync(sp, "INS", p);
                if (afterInsert is not null) await afterInsert(r);
            }
        }
    }
}
