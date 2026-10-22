using RealestateAPI.Customer.Models;
using System.ComponentModel.DataAnnotations;

namespace RealestateAPI.Contract.Models
{
    public class ContractList
    {
        public List<ContractInfo>? Contracts { get; set; }
    }

    public class ContractInfo
    {
        [Required]
        public int CnNo { get; set; }

        [Required]
        public string CnSts { get; set; } = string.Empty;

        [Required]
        public string CnDate { get; set; } = string.Empty;

        [Required]
        public string PtType { get; set; } = string.Empty;

        [Required]
        public string Addr { get; set; } = string.Empty;

        [Required]
        public string PtNm { get; set; } = string.Empty;

        [Required]
        public int Dong { get; set; }

        [Required]
        public int Ho { get; set; }

        [Required]
        public int PtNo { get; set; }

        [Required]
        public string SellerNm { get; set; } = string.Empty;

        [Required]
        public string SellerTel { get; set; } = string.Empty;

        [Required]
        public int SellerCustNo { get; set; }

        [Required]
        public string BuyerNm { get; set; } = string.Empty;

        [Required]
        public string BuyerTel { get; set; } = string.Empty;

        [Required]
        public int BuyerCustNo { get; set; }

        [Required]
        public string TrdType { get; set; } = string.Empty;

        [Required]
        public int SellAmt { get; set; }

        [Required]
        public int MidAmt1 { get; set; }

        [Required]
        public int MidAmt2 { get; set; }

        [Required]
        public string BalAmtDate { get; set; } = string.Empty;

        [Required]
        public string TrdReport { get; set; } = string.Empty;

        [Required]
        public string ContractYn { get; set; } = string.Empty;

        [Required]
        public string BrokerType { get; set; } = string.Empty;

        [Required]
        public int RTNo { get; set; }

        [Required]
        public int OffNo { get; set; }

        [Required]
        public int VendorId { get; set; }

        [Required]
        public DateTime RegDt { get; set; }

        [Required]
        public string RegId { get; set; } = string.Empty;

        [Required]
        public DateTime UpdDt { get; set; }

        [Required]
        public string UpdId { get; set; } = string.Empty;
    }

    public class ContractSpclList
    {
        public List<ContractSpcl>? ContractSpcls{ get; set; }
    }

    public class ContractSpcl
    {
        [Required]
        public int CnNo { get; set; }

        [Required]
        public int CnsNo { get; set; }

        [Required]
        public string SpclDesc {  get; set; } = string.Empty;

        [Required]
        public string FileId { get; set; } = string.Empty;
    }
}
