using RealestateAPI.Admin.Models;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics.Eventing.Reader;
using System.Numerics;

namespace RealestateAPI.Property.Models
{
    public class PtHolderList
    {
        public List<PtHolder>? PtHolders { get; set; }
    }

    public class PtHolder
    {
        [Required]
        public long PtNo { get; set; }
        [Required]
        public long HolderIdx { get; set; }
        public string? HolderType { get; set; }
        [Required]
        public string? HolderRegDate { get; set; } = string.Empty;
        [Required]
        public string? HolderName { get; set; } = string.Empty;
        public string? HolderPhone { get; set; }
        public long? CustNo { get; set; }
        public string? HolderRelation { get; set; }
        public string? HolderMemo { get; set; }
        public string? HolderAddress { get; set; }
        public DateTime? RegDt { get; set; }
        public string? RegId { get; set; }
        public DateTime? UpdDt { get; set; }
        public string? UpdId { get; set; }
    }

    public class PtHolderSaveDto
    {
        public string? HolderType { get; set; }
        public string HolderRegDate { get; set; } = default!;
        public string HolderName { get; set; } = default!;
        public string? HolderPhone { get; set; }
        public long? CustNo { get; set; }
        public string? HolderRelation { get; set; }
        public string? HolderMemo { get; set; }
        public string? HolderAddress { get; set; }
    }

    public class PtHolderUpdateDto
    {
        public string? HolderType { get; set; }
        public string? HolderRegDate { get; set; }
        public string? HolderName { get; set; }
        public string? HolderPhone { get; set; }
        public long? CustNo { get; set; }
        public string? HolderRelation { get; set; }
        public string? HolderMemo { get; set; }
        public string? HolderAddress { get; set; }
    }
}
