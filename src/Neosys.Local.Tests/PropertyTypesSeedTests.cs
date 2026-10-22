using Neosys.Local.Core;
using Neosys.Local.Core.Services;
using Neosys.Local.Data;

namespace Neosys.Local.Tests;

/// <summary>
/// 물건관리 — 아파트 이외 유형 14종을 유형마다 5건씩(70건) 화면과 같은 서비스로 등록하고, 유형별 목록·유형별 항목 저장을 확인한다.
/// 환경변수 NEOSYS_SEED_DB(+ OFF_NO·RT_NO·USER)를 주면 SeedTypesExistingDb가 같은 데이터를 기존 로컬 DB에 넣는다.
/// </summary>
public class PropertyTypesSeedTests
{
    private sealed record Place(string A1, string A2, string A3, string Bjd);

    private static readonly Place Yeoksam = new("서울특별시", "강남구", "역삼동", "1168010100");
    private static readonly Place Samsung = new("서울특별시", "강남구", "삼성동", "1168010500");
    private static readonly Place Seocho = new("서울특별시", "서초구", "서초동", "1165010800");
    private static readonly Place Jamsil = new("서울특별시", "송파구", "잠실동", "1171010100");
    private static readonly Place Seogyo = new("서울특별시", "마포구", "서교동", "1144012000");
    private static readonly Place Seongsu = new("서울특별시", "성동구", "성수동2가", "1120011500");
    private static readonly Place Jeongja = new("경기도", "성남시 분당구", "정자동", "4113510300");
    private static readonly Place Pogok = new("경기도", "용인시 처인구", "포곡읍", "4146125000");
    private static readonly Place Bongpyeong = new("강원특별자치도", "평창군", "봉평면", "5176032000");
    private static readonly Place Yangpyeong = new("경기도", "양평군", "양평읍", "4183025000");

    private static Row Pt(PropertyService svc, string type, Place p, out PropertyDetail d)
    {
        d = svc.New(type);
        var r = d.Pt;
        r["addr1"] = p.A1; r["addr2"] = p.A2; r["addr3"] = p.A3; r["bjd_code"] = p.Bjd;
        return r;
    }

    private static void Owner(PropertyDetail d, string name, int i) { d.Holders[0]["holder_name"] = name; d.Holders[0]["holder_phone"] = $"010-{3000 + i}-{1000 + i % 100:0000}"; }   // i = 100~1404 → 010-3100-1000 형식

    private static void Memo(PropertyDetail d, string text) =>
        d.Memos.Add(new Row { ["memo_date"] = LocalDate.Now, ["memo_content"] = text, ["user_id"] = "tester" });

    /// <summary>유형 14종 × 5건. 반환: 유형 코드 → 물건번호 5개</summary>
    public static async Task<Dictionary<string, List<long>>> SeedAllTypesAsync(PropertyService svc)
    {
        var result = new Dictionary<string, List<long>>();
        async Task Add(string type, Action<int, Row, PropertyDetail> fill, Place place, string? danjiCode = null)
        {
            var ids = new List<long>();
            for (int i = 0; i < 5; i++)
            {
                var p = Pt(svc, type, place, out var d);
                if (danjiCode is not null) p["danji_code"] = danjiCode;
                p["pt_sts"] = i == 4 ? "PTSTS02" : "PTSTS01";
                if (i == 4) p["contract_date"] = LocalDate.Today;
                fill(i, p, d);
                ids.Add(await svc.SaveAsync(d));
            }
            result[type] = ids;
        }

        // 오피스텔 — 단지형(동·호·층), 매매/전세/월세 섞어서
        await Add("SYCA102", (i, p, d) =>
        {
            p["addr4"] = "강남역센트럴오피스텔"; p["jibun"] = "825-1"; p["sub_type"] = i % 2 == 0 ? "주거용" : "업무용";
            p["dong"] = "A"; p["ho"] = $"{10 + i}0{i + 1}"; p["floor1"] = 10 + i; p["floor2"] = 20;
            p["apt_typ"] = i < 3 ? "28A" : "42B"; p["sup_area"] = i < 3 ? 52.3 : 78.6; p["exc_area"] = i < 3 ? 28.1 : 42.4;
            p["sale_div"] = new[] { "SALEDIV01", "SALEDIV02", "SALEDIV03", "SALEDIV01,SALEDIV03", "SALEDIV03" }[i];
            p["sale_amt"] = 32000 + i * 2000; p["les_amt"] = 25000 + i * 1000; p["prot_amt"] = 1000; p["mon_amt"] = 90 + i * 5;
            p["maint_cost"] = 150000; p["current_status"] = i % 2 == 0 ? "월세" : "공실"; p["heat_method"] = "개별난방"; p["dir_std"] = "남향";
            Owner(d, $"오피{i + 1}", 100 + i); Memo(d, $"역세권 오피스텔 {p["ho"]}호 — 즉시 입주 가능");
        }, Yeoksam, "OFT10001");

        // 아파트분양권 — 분양가·확장·옵션·프리미엄
        await Add("SYCA105", (i, p, d) =>
        {
            p["addr4"] = "래미안원펜타스"; p["jibun"] = "1-2"; p["sub_type"] = "분양권";
            p["dong"] = $"{101 + i}"; p["ho"] = $"{5 + i}02"; p["floor1"] = 5 + i; p["floor2"] = 35;
            p["apt_typ"] = i < 2 ? "84A" : "59B"; p["sup_area"] = i < 2 ? 112.0 : 82.5; p["exc_area"] = i < 2 ? 84.9 : 59.9;
            p["sale_div"] = "SALEDIV01";
            var presale = i < 2 ? 210000 : 165000;
            p["presale_amt"] = presale; p["expansion_amt"] = 1500; p["option_amt"] = 800 + i * 100; p["premium_amt"] = 30000 + i * 5000;
            p["sale_amt"] = presale + 1500 + 800 + i * 100 + 30000 + i * 5000;   // 분양가+확장+옵션+프리미엄
            Owner(d, $"분양{i + 1}", 200 + i); Memo(d, "전매 가능 — 중도금 대출 승계");
        }, Seocho, "BUN10002");

        // 재건축 — 정비구역·종전 정보·권리가액·추가분담금
        await Add("SYCA104", (i, p, d) =>
        {
            p["addr4"] = "잠실주공5단지"; p["jibun"] = "27"; p["sub_type"] = i < 3 ? "입주권" : "전부"; p["maint_zone_name"] = "잠실주공5단지 재건축정비구역";
            p["dong"] = $"{501 + i}"; p["ho"] = $"{i + 1}04"; p["floor1"] = i + 1; p["floor2"] = 15; p["apt_typ"] = "34평";
            p["sup_area"] = 112.4; p["exc_area"] = 76.5; p["land_share"] = 53.2;
            p["former_pt_type"] = "SYCA101"; p["former_addr"] = "서울특별시 송파구 잠실동"; p["former_jibun"] = "27"; p["former_dong"] = $"{501 + i}"; p["former_ho"] = $"{i + 1}04";
            p["former_area"] = 76.5; p["former_land_share_ratio"] = 53.2;
            p["sale_div"] = "SALEDIV01"; p["sale_amt"] = 280000 + i * 10000;
            p["right_value_amt"] = 150000 + i * 5000; p["add_contrib_amt"] = 30000; p["moving_cost"] = 40000; p["premium_amt"] = 90000;
            Owner(d, $"재건{i + 1}", 300 + i); Memo(d, "관리처분 인가 완료 — 이주 예정");
        }, Jamsil, "RCN10003");

        // 재개발 — 빌라 입주권
        await Add("SYCA120", (i, p, d) =>
        {
            p["addr4"] = "성수전략정비구역1지구"; p["jibun"] = $"{72 + i}-{i + 3}"; p["sub_type"] = "입주권"; p["maint_zone_name"] = "성수전략정비구역 제1지구";
            p["former_pt_type"] = "SYCA118"; p["former_addr"] = "서울특별시 성동구 성수동2가"; p["former_jibun"] = $"{72 + i}-{i + 3}";
            p["former_area"] = 45.0 + i * 3; p["former_land_share_ratio"] = 28.0 + i * 2;
            p["exc_area"] = 59.9; p["sup_area"] = 84.0; p["land_share"] = 28.0 + i * 2;
            p["sale_div"] = "SALEDIV01"; p["sale_amt"] = 180000 + i * 8000; p["right_value_amt"] = 60000 + i * 3000; p["add_contrib_amt"] = 45000; p["premium_amt"] = 70000;
            Owner(d, $"재개{i + 1}", 400 + i); Memo(d, "조합원 입주권 — 59㎡ 신청");
        }, Seongsu, "RDV10004");

        // 오피스텔분양권
        await Add("SYCA106", (i, p, d) =>
        {
            p["addr4"] = "힐스테이트삼성"; p["jibun"] = "159-9"; p["sub_type"] = "주거용";
            p["dong"] = "B"; p["ho"] = $"{15 + i}0{i + 2}"; p["floor1"] = 15 + i; p["floor2"] = 30;
            p["apt_typ"] = "39A"; p["sup_area"] = 70.5; p["exc_area"] = 39.8;
            p["sale_div"] = "SALEDIV01"; p["presale_amt"] = 48000; p["option_amt"] = 500; p["premium_amt"] = 3000 + i * 1000; p["sale_amt"] = 51500 + i * 1000;
            Owner(d, $"오분{i + 1}", 500 + i); Memo(d, "준공 2027년 예정");
        }, Samsung, "OFB10005");

        // 원투룸
        await Add("SYCA117", (i, p, d) =>
        {
            p["addr5"] = "서교하우스"; p["jibun"] = $"{395 + i}-12"; p["sub_type"] = i < 3 ? "도시형생활주택" : "빌라 | 연립";
            p["dong"] = ""; p["ho"] = $"{2 + i % 3}0{i + 1}"; p["floor1"] = 2 + i % 3; p["floor2"] = 5;
            p["sup_area"] = 33.0 + i; p["exc_area"] = 19.8 + i; p["room_cnt"] = i < 3 ? 1 : 2; p["bath_cnt"] = 1;
            p["sale_div"] = i == 2 ? "SALEDIV02" : "SALEDIV03"; p["les_amt"] = 18000; p["prot_amt"] = 1000 + i * 500; p["mon_amt"] = 60 + i * 5;
            p["maint_cost"] = 70000; p["maint_dtl"] = "수도·인터넷 포함"; p["current_status"] = "공실"; p["heat_method"] = "개별난방";
            p["child_yn"] = "N"; p["pet_allow"] = i % 2 == 0 ? "가능" : "불가능";
            Owner(d, $"원룸{i + 1}", 600 + i); Memo(d, "홍대입구역 도보 7분, 풀옵션");
        }, Seogyo);

        // 빌라·연립 — 대지지분
        await Add("SYCA118", (i, p, d) =>
        {
            p["addr5"] = $"정자빌라 {(char)('가' + i)}동"; p["jibun"] = $"{120 + i}-3"; p["dong"] = $"{(char)('가' + i)}"; p["ho"] = $"{i + 2}01"; p["floor1"] = i + 2; p["floor2"] = 4;
            p["sup_area"] = 72.0 + i * 3; p["exc_area"] = 59.5 + i * 2; p["land_share"] = 33.1 + i;
            p["sale_div"] = i % 2 == 0 ? "SALEDIV01" : "SALEDIV02"; p["sale_amt"] = 52000 + i * 3000; p["les_amt"] = 30000 + i * 1000;
            p["room_cnt"] = 3; p["bath_cnt"] = 1 + i % 2; p["current_status"] = "주인거주"; p["comp_year"] = $"{1998 + i}"; p["pk_cnt"] = 4;
            Owner(d, $"빌라{i + 1}", 700 + i); Memo(d, "리모델링 완료, 남향");
        }, Jeongja);

        // 단독·다가구 — 건축면적·연면적·대지면적, 다가구는 임대차현황서
        await Add("SYCA119", (i, p, d) =>
        {
            p["addr5"] = $"역삼동 {(i < 3 ? "다가구" : "단독")}주택"; p["jibun"] = $"{640 + i}-{i + 5}"; p["sub_type"] = i < 3 ? "다가구주택" : "단독주택";
            p["floor1"] = 1; p["floor2"] = i < 3 ? 4 : 2;
            p["land_share"] = 198.0 + i * 10; p["building_area"] = 118.5 + i * 5; p["gross_area"] = i < 3 ? 420.0 : 210.0;
            p["sale_div"] = "SALEDIV01"; p["sale_amt"] = 280000 + i * 20000; p["loan_amt"] = 50000;
            p["room_cnt"] = i < 3 ? 12 : 5; p["bath_cnt"] = i < 3 ? 8 : 2; p["comp_year"] = $"{1995 + i}";
            Owner(d, $"주택{i + 1}", 800 + i); Memo(d, i < 3 ? "임대 수익형 다가구" : "실거주 단독주택");
            if (i < 3)
                for (int r = 1; r <= 3; r++)
                    d.LeaseRows.Add(new Row { ["room_no"] = $"{r}01", ["area"] = 33.0, ["cur_status"] = "임대중", ["deposit"] = 5000, ["monthly_rent"] = 55, ["contract_start"] = "2025-03-01", ["contract_end"] = "2027-02-28" });
        }, Yeoksam);

        // 상가·사무실 — 권리금·시설비·업종
        await Add("SYCA113", (i, p, d) =>
        {
            p["addr5"] = "삼성스퀘어"; p["jibun"] = "143-40"; p["sub_type"] = i < 3 ? "일반상가" : "사무실";
            p["dong"] = ""; p["ho"] = $"{i + 1}0{i + 1}"; p["floor1"] = i + 1; p["floor2"] = 10;
            p["sup_area"] = 99.0 + i * 20; p["exc_area"] = 66.0 + i * 15;
            p["sale_div"] = i == 4 ? "SALEDIV01" : "SALEDIV03"; p["sale_amt"] = 150000; p["prot_amt"] = 5000 + i * 2000; p["mon_amt"] = 300 + i * 50;
            p["lay_amt"] = i < 3 ? 5000 + i * 2000 : 0; p["facility_cost"] = i < 3 ? 3000 : 0; p["maint_cost"] = 40;
            p["business_name"] = i < 3 ? $"카페{i + 1}" : ""; p["business_type"] = i < 3 ? "휴게음식점" : "사무실"; p["recommended_business"] = "카페, 베이커리";
            p["current_status"] = i < 3 ? "월세" : "공실"; p["building_use"] = "USG04"; p["elevator_cnt"] = 2;
            Owner(d, $"상가{i + 1}", 900 + i); Memo(d, i < 3 ? "1층 코너 · 유동인구 많음" : "역세권 사무실 · 즉시 입주");
        }, Samsung);

        // 지식산업센터
        await Add("SYCA116", (i, p, d) =>
        {
            p["addr5"] = "성수SK V1 타워"; p["jibun"] = "277-17"; p["dong"] = "B"; p["ho"] = $"{8 + i}1{i}"; p["floor1"] = 8 + i; p["floor2"] = 15;
            p["sup_area"] = 165.0 + i * 10; p["exc_area"] = 82.5 + i * 5; p["gross_area"] = 165.0 + i * 10;
            p["sale_div"] = i % 2 == 0 ? "SALEDIV01" : "SALEDIV03"; p["sale_amt"] = 62000 + i * 4000; p["prot_amt"] = 3000; p["mon_amt"] = 250;
            p["maint_cost"] = 35; p["elevator_cnt"] = 6; p["power_receiving"] = "설치"; p["city_gas"] = "인입완료"; p["current_status"] = "공실";
            Owner(d, $"지산{i + 1}", 1000 + i); Memo(d, "드라이브인 가능, 화물 엘리베이터");
        }, Seongsu);

        // 건물·빌딩 — 지하/지상 층수, 수익표, 임대차현황서
        await Add("SYCA108", (i, p, d) =>
        {
            p["addr5"] = $"서초 {(char)('A' + i)} 빌딩"; p["jibun"] = $"{1300 + i * 7}-{i + 1}"; p["sub_type"] = i < 3 ? "상가 | 사무실" : "사옥";
            p["basement_floor"] = 2; p["ground_floor"] = 7 + i; p["land_share"] = 330.0 + i * 30; p["building_area"] = 198.0 + i * 15; p["gross_area"] = 1650.0 + i * 120;
            p["sale_div"] = "SALEDIV01"; p["sale_amt"] = 850000 + i * 100000;
            p["deposit_total"] = 120000; p["loan_total"] = 300000; p["invest_amt"] = 430000 + i * 100000;
            p["inc_rent_m"] = 3200 + i * 300; p["inc_rent_y"] = (3200 + i * 300) * 12; p["inc_mgmt_m"] = 400; p["inc_mgmt_y"] = 4800;
            p["exp_loan_m"] = 1100; p["exp_loan_y"] = 13200; p["buid_struct"] = "철근콘크리트"; p["main_building_use"] = "주용도1"; p["elevator_cnt"] = 2; p["comp_year"] = $"{2005 + i}";
            Owner(d, $"빌딩{i + 1}", 1100 + i); Memo(d, "대로변 코너 · 수익률 3.8%");
            for (int f = 1; f <= 3; f++)
                d.LeaseRows.Add(new Row { ["room_no"] = $"{f}층", ["area"] = 198.0, ["cur_status"] = "임대중", ["deposit"] = 30000, ["monthly_rent"] = 900 + f * 50, ["maint_cost"] = 120, ["business_type"] = f == 1 ? "은행" : "사무실", ["business_name"] = f == 1 ? "OO은행" : $"OO컴퍼니{f}" });
        }, Seocho);

        // 숙박·펜션 — 객실수·권리금
        await Add("SYCA110", (i, p, d) =>
        {
            p["addr5"] = $"봉평 {(i < 3 ? "펜션" : "모텔")} {i + 1}"; p["jibun"] = $"{560 + i}"; p["sub_type"] = i < 3 ? "펜션" : "모텔"; p["addr_detail"] = "메밀꽃 마을 입구";
            p["basement_floor"] = 0; p["ground_floor"] = i < 3 ? 2 : 5; p["land_share"] = 990.0 + i * 100; p["building_area"] = 330.0; p["gross_area"] = i < 3 ? 495.0 : 1320.0;
            p["sup_area"] = 495.0; p["exc_area"] = 400.0; p["guest_room_cnt"] = i < 3 ? 8 + i : 30;
            p["sale_div"] = i == 3 ? "SALEDIV03" : "SALEDIV01"; p["sale_amt"] = 120000 + i * 30000; p["prot_amt"] = 20000; p["mon_amt"] = 500;
            p["lay_amt"] = i == 3 ? 10000 : 0; p["business_name"] = $"봉평스테이{i + 1}"; p["business_type"] = "숙박업"; p["city_gas"] = "인입불가";
            Owner(d, $"숙박{i + 1}", 1200 + i); Memo(d, "계곡 인접, 주말 만실");
        }, Bongpyeong);

        // 공장·창고 — 사무실 면적·진입도로·수전
        await Add("SYCA111", (i, p, d) =>
        {
            p["addr5"] = $"포곡 {(i < 3 ? "공장" : "물류창고")} {i + 1}동"; p["jibun"] = $"산{10 + i}"; p["addr_detail"] = "영동고속도로 용인IC 10분";
            p["basement_floor"] = 0; p["ground_floor"] = i < 3 ? 1 : 2; p["land_share"] = 1650.0 + i * 200; p["building_area"] = 660.0 + i * 50; p["gross_area"] = 660.0 + i * 50;
            p["office_area"] = 66.0; p["access_road"] = 8.0 + i; p["toilet"] = "양호"; p["power_receiving"] = "설치"; p["elec_capacity"] = $"{100 + i * 50}kW";
            p["sale_div"] = i % 2 == 0 ? "SALEDIV03" : "SALEDIV01"; p["sale_amt"] = 250000 + i * 30000; p["prot_amt"] = 10000; p["mon_amt"] = 600 + i * 50;
            p["business_type"] = i < 3 ? "제조업" : "물류"; p["buid_struct"] = "철골"; p["building_use"] = "USG17";
            Owner(d, $"공장{i + 1}", 1300 + i); Memo(d, "40피트 컨테이너 진입 가능, 층고 9m");
        }, Pogok);

        // 토지 — 지목·용도지역·규제·필지목록
        await Add("SYCA115", (i, p, d) =>
        {
            p["addr5"] = $"양평읍 {(i < 3 ? "전원주택부지" : "임야")}"; p["jibun"] = $"{230 + i}-{i + 1}";
            p["land_share"] = 660.0 + i * 330; p["land_category"] = i < 3 ? "대" : "임야"; p["land_use"] = i < 3 ? "계획관리지역" : "보전관리지역";
            p["sale_div"] = "SALEDIV01"; p["sale_amt"] = 30000 + i * 15000; p["loan_amt"] = 0; p["road_info"] = 4.0 + i;
            p["build_permit"] = i < 2 ? 1 : 0; if (i < 2) p["permit_date"] = "2026-06-15";
            p["zone_dev_restrict"] = 0; p["zone_land_permit"] = i == 4 ? 1 : 0; p["right_grave"] = i == 3 ? 1 : 0;
            p["business_type"] = ""; p["recommended_business"] = i < 3 ? "전원주택, 카페" : "농막, 주말농장"; p["other_restrictions"] = i == 4 ? "토지거래허가 필요" : "";
            Owner(d, $"토지{i + 1}", 1400 + i); Memo(d, i < 3 ? "남향 완경사 · 전기/수도 인입" : "산림 경관 우수");
            for (int s = 1; s <= 2; s++)
                d.Parcels.Add(new Row { ["jibun"] = $"{230 + i}-{i + s + 1}", ["land_area"] = 330.0, ["land_category"] = i < 3 ? "대" : "임야", ["land_use"] = i < 3 ? "계획관리지역" : "보전관리지역" });
        }, Yangpyeong);

        return result;
    }

    [Fact]
    public async Task 아파트_이외_유형_5건씩()
    {
        using var t = new TestDb();
        var svc = new PropertyService(t.Sp, t.SessionAccessor);
        var seeded = await SeedAllTypesAsync(svc);

        Assert.Equal(14, seeded.Count);
        Assert.All(seeded.Values, ids => Assert.Equal(5, ids.Distinct().Count()));
        var counts = await svc.TypeCountsAsync();
        foreach (var type in seeded.Keys) Assert.Equal(5, counts[type]);
        Assert.False(counts.ContainsKey("SYCA101"));
        Assert.Equal(70, (await svc.ListAsync()).Count);
        // 화면의 유형 버튼과 같은 필터(상가·사무실 = SYCA109,SYCA113,SYCA114)
        Assert.Equal(5, (await svc.ListAsync(new Row { ["q_pt_type"] = "SYCA109,SYCA113,SYCA114" })).Count);

        // 유형별 항목이 저장되는지
        var building = (await svc.GetAsync(seeded["SYCA108"][0]))!;
        Assert.Equal(3, building.LeaseRows.Count);
        Assert.Equal(2, building.Pt.Long("basement_floor"));
        Assert.Equal(3200, building.Pt.Long("inc_rent_m"));
        var land = (await svc.GetAsync(seeded["SYCA115"][0]))!;
        Assert.Equal(2, land.Parcels.Count);
        Assert.Equal("대", land.Pt.Str("land_category"));
        Assert.Equal(1, land.Pt.Long("build_permit"));
        var redev = (await svc.GetAsync(seeded["SYCA104"][0]))!;
        Assert.Equal("잠실주공5단지 재건축정비구역", redev.Pt.Str("maint_zone_name"));
        Assert.Equal(150000, redev.Pt.Long("right_value_amt"));
        Assert.Equal("SYCA101", redev.Pt.Str("former_pt_type"));
        var shop = (await svc.GetAsync(seeded["SYCA113"][0]))!;
        Assert.Equal(5000, shop.Pt.Long("lay_amt"));
        Assert.Equal("카페1", shop.Pt.Str("business_name"));
        var lodging = (await svc.GetAsync(seeded["SYCA110"][0]))!;
        Assert.Equal(8, lodging.Pt.Long("guest_room_cnt"));
        var presale = (await svc.GetAsync(seeded["SYCA105"][0]))!;
        Assert.Equal(30000, presale.Pt.Long("premium_amt"));
        Assert.Equal("래미안원펜타스 101동 502호", presale.Pt.Str("pt_name"));

        // 단지형은 좌측 물건리스트에 단지별 묶음, 나머지는 1건씩
        var officetel = await svc.SummaryAsync("SYCA102");
        Assert.Equal(5, officetel.Single().Long("property_count"));
        Assert.Equal(5, (await svc.SummaryAsync("SYCA117")).Count);
        // 계약 상태(5번째) 유형마다 1건
        Assert.Equal(14, (await svc.ListAsync(new Row { ["q_pt_sts"] = "PTSTS02" })).Count);
    }

    /// <summary>기존 로컬 DB에 같은 데이터 넣기 — NEOSYS_SEED_DB가 없으면 아무것도 안 함</summary>
    [Fact]
    public async Task SeedTypesExistingDb()
    {
        var path = Environment.GetEnvironmentVariable("NEOSYS_SEED_DB");
        if (string.IsNullOrEmpty(path)) return;
        var db = new LocalDatabase(path);
        db.Initialize();
        var sp = new SpRunner(db);
        var session = new AppSession
        {
            OffNo = long.Parse(Environment.GetEnvironmentVariable("NEOSYS_SEED_OFF_NO")!),
            RtNo = long.Parse(Environment.GetEnvironmentVariable("NEOSYS_SEED_RT_NO")!),
            UserId = Environment.GetEnvironmentVariable("NEOSYS_SEED_USER") ?? "tester",
            RtType = "RTTYP01",
        };
        await SeedAllTypesAsync(new PropertyService(sp, () => session));
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
    }
}
