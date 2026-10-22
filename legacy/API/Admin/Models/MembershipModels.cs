using System;
using System.Collections.Generic;

namespace RealestateAPI.Admin.Models
{
    public class MembershipProduct
    {
        public long ProdId { get; set; }
        public string ProdName { get; set; } = "";
        public int PcCnt { get; set; }
        public int MobCnt { get; set; }
        public int AcctCnt { get; set; }
        public int PeriodMonths { get; set; }
        public int Price { get; set; }
        public string? Descr { get; set; }
        public int SortOrder { get; set; }
        public string UseYn { get; set; } = "Y";
        public DateTime? RegDt { get; set; }
    }

    public class MembershipProductDto
    {
        public string ProdName { get; set; } = "";
        public int PcCnt { get; set; }
        public int MobCnt { get; set; }
        public int AcctCnt { get; set; }
        public int PeriodMonths { get; set; }
        public int Price { get; set; }
        public string? Descr { get; set; }
        public int SortOrder { get; set; }
        public string? UseYn { get; set; }
    }

    public class MembershipListResult
    {
        public List<MembershipProduct> Items { get; set; } = new();
    }
}
