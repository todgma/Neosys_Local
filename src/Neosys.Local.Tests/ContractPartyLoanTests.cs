using System.Text.Json.Nodes;
using Neosys.Local.Core.Services;

namespace Neosys.Local.Tests;

/// <summary>계약서 추가 당사자(대리인)·융자금 여러 건 — 기존 _addParties / _loans 구조</summary>
public class ContractPartyLoanTests
{
    [Fact]
    public void 융자금_목록()
    {
        // 저장된 목록이 있으면 그대로
        var doc = new JsonObject { ["_loans"] = new JsonArray(new JsonObject { ["amt"] = "5000", ["승계"] = "매수인이 인수한다.", ["라벨"] = "현임대보증금" }) };
        var loans = ContractCatalog.Loans(doc, templateHasLoanRow: true);
        Assert.Single(loans);
        Assert.Equal("현임대보증금", (string?)loans[0]["라벨"]);

        // 구버전 단일값 → 1건
        loans = ContractCatalog.Loans(new JsonObject { ["융자금한글"] = "3000" }, false);
        Assert.Equal("3000", (string?)loans[0]["amt"]);
        Assert.Equal(ContractCatalog.LoanTerms[0], (string?)loans[0]["승계"]);

        // 서식에 융자금 행이 있으면 빈 1건, 숨겼거나 없으면 0건
        Assert.Single(ContractCatalog.Loans(new JsonObject(), true));
        Assert.Empty(ContractCatalog.Loans(new JsonObject { ["_융자금표시"] = false }, true));
        Assert.Empty(ContractCatalog.Loans(new JsonObject(), false));
    }

    [Fact]
    public void 추가_당사자()
    {
        var doc = new JsonObject();
        var role = ContractCatalog.AddParty(doc, "매 도 인", 1700000000000);
        Assert.Equal("매 도 인#1700000000000", role);
        Assert.Equal("대리인", (string?)doc["_addlabel_매 도 인#1700000000000"]);
        ContractCatalog.AddParty(doc, "매 수 인", 1700000000001);
        var added = ContractCatalog.AddedParties(doc).ToList();
        Assert.Equal(2, added.Count);
        Assert.Equal(("매 수 인", "매 수 인#1700000000001", 1700000000001L), added[1]);
    }
}
