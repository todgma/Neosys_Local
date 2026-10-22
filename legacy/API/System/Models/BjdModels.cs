namespace RealestateAPI.System.Models
{
    public class BjdListRequest
    {
        public int AddressType { get; set; }
        public string? AddressCode { get; set; }
    }

    public class BjdDto
    {
        public long? Idx { get; set; }
        public string? DongCode { get; set; }
        public string? DongName { get; set; }
        public string? HjdCode { get; set; }
        public string? HjdName { get; set; }
        public string? BjdCode { get; set; }
        public string? BjdName { get; set; }
        public string? StartDate { get; set; }
        public string? EndDate { get; set; }
        public bool? IsSigungu { get; set; }
        public string? SidoName { get; set; }
        public string? SidoNameShort { get; set; }
        public string? SigunguName { get; set; }
        public string? SigunguName2 { get; set; }
        public string? MapX { get; set; }
        public string? MapY { get; set; }
        public int? Sort { get; set; }
    }
}
