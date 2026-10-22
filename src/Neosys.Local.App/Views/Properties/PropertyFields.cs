using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using Neosys.Local.App.Ui;
using Neosys.Local.Core;
using Neosys.Local.Data;

namespace Neosys.Local.App.Views.Properties;

/// <summary>
/// 물건 등록 폼 필드 — 기존 유형별 폼(ApartmentForm·BillaForm·OneRoomForm·HouseForm·RedevelopmentForm·SalesRightForm·
/// CommercialForm·KnowledgeCenterForm·BuildingForm·LodgingForm·FactoryForm·LandForm)의 항목을 유형 조건(When)으로 합친 것.
/// 면적은 ㎡로 저장한다.
/// </summary>
public static class PropertyFields
{
    // ---- 유형 판단 ----
    private static string T(Row r) => r.Str("pt_type") ?? "";
    public static bool Apt(Row r) => Catalog.ApartmentFormCodes.Contains(T(r));                 // 아파트·오피스텔·주상복합·분양권
    public static bool SalesRight(Row r) => Catalog.SalesRightCodes.Contains(T(r));             // 아파트/오피스텔 분양권
    public static bool Redev(Row r) => Catalog.RedevCodes.Contains(T(r));                       // 재건축·재개발
    public static bool Villa(Row r) => T(r) == "SYCA118";
    public static bool OneRoom(Row r) => T(r) == "SYCA117";
    public static bool House(Row r) => T(r) == "SYCA119";
    public static bool Commercial(Row r) => Catalog.CommercialOfficeCodes.Contains(T(r));        // 상가·사무실
    public static bool Knowledge(Row r) => T(r) == Catalog.KnowledgeCode;                       // 지식산업센터
    public static bool Building(Row r) => T(r) == "SYCA108";                                    // 건물·빌딩
    public static bool Lodging(Row r) => T(r) == "SYCA110";                                     // 숙박·펜션
    public static bool Factory(Row r) => T(r) == "SYCA111";                                     // 공장·창고
    public static bool Land(Row r) => T(r) == Catalog.LandCode;                                 // 토지

    public static bool Residential(Row r) => Apt(r) || Redev(r) || Villa(r) || OneRoom(r) || House(r);
    public static bool BizUnit(Row r) => Commercial(r) || Knowledge(r);
    public static bool BigBuilding(Row r) => Building(r) || Lodging(r) || Factory(r);
    /// <summary>해당층/총층 입력(토지·건물·숙박·공장은 지하/지상 층수로 대신)</summary>
    public static bool FloorPair(Row r) => !Land(r) && !BigBuilding(r);
    private static bool Div(Row r, string code) => SaleDivEditor.Has(r, code);

    /// <summary>
    /// 왼쪽 메인 폼의 행(기존 PropertyFormPageV2 + 유형별 폼 순서): 물건명 · 면적 · 거래구분 · 금액 · 현상황 · 일정 · 제한사항 · 상세정보 · 옵션 · 메모.
    /// 물건유형·세부유형·소재지·물건상태·종전 정보는 창 위쪽 노란/회색 줄(PropertyEditWindow)에서 입력한다.
    /// </summary>
    public static IEnumerable<FieldDef> Rows()
    {
        static FieldDef A(string key, string label) => F.Amount(key, label, null);   // 금액 행은 라벨에 "단위(만원)"

        // ---------------- 물건명 ----------------
        yield return F.Section("물건명");
        yield return F.Text("addr4", "단지명").When(r => Apt(r) || Redev(r)).W(150);
        yield return F.Text("addr5", "건물명", "건물명 (예: OO빌딩)").When(r => !Apt(r) && !Redev(r)).W(150);
        yield return F.Text("dong", "동").When(r => !Land(r) && !BigBuilding(r)).W(60);
        yield return F.Text("ho", "호").When(r => !Land(r) && !BigBuilding(r)).W(60);
        yield return F.Int("floor1", "해당층").When(FloorPair).W(44);
        yield return F.Int("floor2", "총층").When(FloorPair).W(44);
        yield return F.Int("basement_floor", "지하", "층").When(BigBuilding).W(70);
        yield return F.Int("ground_floor", "지상", "층").When(BigBuilding).W(70);
        yield return F.Text("addr_detail", "상세주소").When(r => Lodging(r) || Factory(r)).W(150);
        yield return F.Text("pt_name", "표시명", "비우면 단지/건물명·동·호로 자동").W(170);

        // ---------------- 면적 ----------------
        yield return F.Section("면적|(㎡)");
        yield return F.Text("apt_typ", "타입").When(r => Apt(r) || Redev(r)).W(70);
        yield return F.Dec("sup_area", "공급면적").When(r => Apt(r) || Redev(r) || Villa(r) || OneRoom(r) || BizUnit(r) || Lodging(r));
        yield return F.Dec("exc_area", "전용면적").When(r => Apt(r) || Redev(r) || Villa(r) || OneRoom(r) || BizUnit(r) || Lodging(r));
        yield return F.Dec("land_share", "대지지분").When(r => Villa(r) || Redev(r));
        yield return F.Dec("land_share", "대지면적").When(r => House(r) || BizUnit(r) || BigBuilding(r));
        yield return F.Dec("land_share", "토지면적").When(Land);
        yield return F.Dec("building_area", "건축면적").When(r => House(r) || BigBuilding(r));
        yield return F.Dec("gross_area", "연면적").When(r => House(r) || BizUnit(r) || BigBuilding(r));

        // ---------------- 거래구분 ----------------
        yield return F.Section("거래구분");
        yield return F.Custom("거래구분", r => new SaleDivEditor(r)).Span(2);
        yield return F.Checks("etc_lease_type", "기타임대유형", Catalog.EtcLeaseTypes).Span(2).When(r => Div(r, "SALEDIV04"));

        // ---------------- 금액(만원) ----------------
        yield return F.Section("금액|단위(만원)");
        yield return A("presale_amt", "분양금액").When(r => SalesRight(r) || Redev(r));
        yield return A("expansion_amt", "확장금액").When(r => SalesRight(r) || Redev(r));
        yield return A("option_amt", "옵션금액").When(r => SalesRight(r) || Redev(r));
        yield return A("premium_amt", "프리미엄").When(r => SalesRight(r) || Redev(r));
        yield return A("add_contrib_amt", "추가분담금").When(Redev);
        yield return A("right_value_amt", "권리가액").When(Redev);
        yield return A("moving_cost", "이주비").When(Redev);
        yield return A("sale_amt", "매매").When(r => Div(r, "SALEDIV01") || Building(r));
        yield return A("les_amt", "전세").When(r => Div(r, "SALEDIV02") && !Building(r));
        yield return A("prot_amt", "월세 보증금").When(r => Div(r, "SALEDIV03") && !Building(r));
        yield return A("mon_amt", "차임").When(r => Div(r, "SALEDIV03") && !Building(r));
        yield return A("etc_amt", "기타임대 보증금").When(r => Div(r, "SALEDIV04") && !Building(r));
        yield return A("etc_amt2", "차임").When(r => Div(r, "SALEDIV04") && !Building(r));
        yield return A("loan_amt", "대출금액").When(r => Residential(r) || Land(r));
        yield return A("lay_amt", "권리금").When(r => BizUnit(r) || Lodging(r) || Factory(r));
        yield return A("facility_cost", "시설비").When(r => BizUnit(r) || Lodging(r) || Factory(r));
        yield return F.Int("maint_cost", "관리비", "원").When(Residential);
        yield return A("maint_cost", "관리비").When(r => BizUnit(r) || Lodging(r) || Factory(r));
        yield return F.Text("maint_dtl", "관리비내역").When(r => !Land(r) && !Building(r)).W(160);
        // 건물·빌딩 수익표
        yield return A("deposit_total", "보증금총액").When(Building);
        yield return A("loan_total", "대출금액").When(Building);
        yield return A("invest_amt", "투자금액").When(Building);
        yield return A("inc_rent_m", "차임(월)").When(Building);
        yield return A("inc_rent_y", "차임(년)").When(Building);
        yield return A("inc_mgmt_m", "관리비(월)").When(Building);
        yield return A("inc_mgmt_y", "관리비(년)").When(Building);
        yield return A("inc_etc_m", "기타수입(월)").When(Building);
        yield return A("inc_etc_y", "기타수입(년)").When(Building);
        yield return A("exp_labor_m", "인건비(월)").When(Building);
        yield return A("exp_labor_y", "인건비(년)").When(Building);
        yield return A("exp_util_m", "공과금(월)").When(Building);
        yield return A("exp_util_y", "공과금(년)").When(Building);
        yield return A("exp_loan_m", "대출이자(월)").When(Building);
        yield return A("exp_loan_y", "대출이자(년)").When(Building);
        yield return A("exp_etc_m", "기타지출(월)").When(Building);
        yield return A("exp_etc_y", "기타지출(년)").When(Building);

        // ---------------- 현상황 ----------------
        yield return F.Section("현상황");
        yield return F.Combo("current_status", "현상태", Catalog.CurrentStatus).When(r => !Building(r));
        yield return A("now_dep_amt", "보증금").When(r => !Building(r));
        yield return A("now_mon_amt", "월차임").When(r => !Building(r));
        yield return F.Combo("house_rental", "임대사업자", Catalog.RentBusiness).When(Residential);
        yield return F.Combo("contract_renewal_right", "갱신청구권", "사용", "미사용").When(Residential).W(80);
        yield return F.Text("business_name", "사업체명").When(r => BizUnit(r) || Lodging(r) || Factory(r) || Land(r));
        yield return F.Text("business_type", "업종").When(r => BizUnit(r) || Lodging(r) || Factory(r) || Land(r));
        yield return F.Text("recommended_business", "추천업종").When(r => BizUnit(r) || Land(r));

        // ---------------- 일정 ----------------
        yield return F.Section("일정");
        yield return F.Date("mtry_date", "만기일").When(r => !Building(r));
        yield return F.Date("expt_mov_date", "이사예정일").When(r => !Building(r));
        yield return F.Date("expt_date", "잔금예정일").When(r => !Building(r));

        // ---------------- 제한사항 ----------------
        yield return F.Section("제한사항");
        yield return F.Combo("child_yn", "어린이", Opt.Pairs(("Y", "가능"), ("N", "불가능"), ("C", "조건부"))).When(Residential).W(80);
        yield return F.Combo("pet_allow", "반려동물", "가능", "불가능", "조건부").When(Residential).W(80);
        yield return F.Text("child_cond", "어린이 조건").When(r => Residential(r) && r.Str("child_yn") == "C").W(150);
        yield return F.Text("pet_cond", "반려동물 조건").When(r => Residential(r) && r.Str("pet_allow") == "조건부").W(150);
        // 토지 규제·권리
        yield return F.Bool("build_permit", "", "건축허가").When(Land);
        yield return F.Date("permit_date", "허가일").When(r => Land(r) && r.Long("build_permit") == 1);
        yield return F.Bool("zone_dev_restrict", "", "개발제한구역").When(Land);
        yield return F.Bool("zone_land_permit", "", "토지거래허가구역").When(Land);
        yield return F.Bool("right_surface", "", "지상권").When(Land);
        yield return F.Bool("right_grave", "", "분묘기지권").When(Land);
        yield return F.Bool("right_easement", "", "지역권").When(Land);
        yield return F.Text("other_restrictions", "기타제한사항").Span(2);

        // ---------------- 상세정보 ----------------
        yield return F.Section("상세정보");
        yield return F.Int("house_cnt", "세대수").When(Residential).W(60);
        yield return F.Dec("pk_cnt", "주차").When(r => !Land(r)).W(50);
        yield return F.Text("comp_year", "준공년도").When(r => !Land(r)).W(60);
        yield return F.Int("room_cnt", "방").When(Residential).W(40);
        yield return F.Int("bath_cnt", "욕실").When(Residential).W(40);
        yield return F.Int("ev_charger_cnt", "전기차충전").When(r => Apt(r) || Redev(r) || BizUnit(r) || Building(r) || Lodging(r)).W(40);
        yield return F.Int("guest_room_cnt", "객실수").When(Lodging).W(50);
        yield return F.Combo("heat_method", "난방방식", Catalog.HeatMethods).When(r => !Land(r)).W(90);
        yield return F.Combo("heat_fuel", "난방연료", Catalog.HeatFuels).When(r => !Land(r)).W(90);
        yield return F.Combo("entr_struct", "현관구조", Catalog.EntranceStructs).When(Residential).W(80);
        yield return F.Combo("building_form", "건물형태", Catalog.BuildingForms).When(Residential).W(80);
        yield return F.Combo("balc_ext", "발코니", Catalog.Balcony).When(Residential).W(80);
        yield return F.Combo("dir_std", "방향", Catalog.Directions).When(r => Residential(r) || BizUnit(r)).W(80);
        yield return F.Combo("dir_base", "방향기준", Catalog.DirectionBases).When(r => Residential(r) || BizUnit(r)).W(80);
        yield return F.Int("elevator_cnt", "승강기").When(r => BizUnit(r) || Building(r)).W(40);
        yield return F.Int("stairs_cnt", "계단").When(r => BizUnit(r) || Building(r)).W(40);
        yield return F.Combo("buid_struct", "건물구조", "철근콘크리트", "철골", "철골콘크리트", "벽돌", "기타").When(BigBuilding);
        yield return F.Combo("main_building_use", "건축물주용도", "주용도1", "주용도2", "주용도3").When(Building);
        yield return F.Dec("access_road", "진입도로", "m").When(Factory);
        yield return F.Dec("office_area", "사무실", "㎡").When(Factory);
        yield return F.Combo("toilet", "화장실", "양호", "열악", "이동식", "없음").When(Factory).W(80);
        yield return F.Combo("city_gas", "도시가스", "인입완료", "인입가능", "인입불가").When(r => BigBuilding(r) || BizUnit(r)).W(90);
        yield return F.Combo("power_receiving", "수전", "설치", "미설치").When(r => BigBuilding(r) || BizUnit(r)).W(70);
        yield return F.Text("elec_capacity", "전기용량").When(r => BigBuilding(r) || BizUnit(r)).W(80);
        yield return F.Dec("road_info", "도로", "m").When(Land);
        yield return F.Combo("building_use", "건축물용도", Catalog.BuildingUses).When(r => !Land(r) && !Building(r) && !Apt(r));
        yield return F.Combo("land_category", "지목", Catalog.LandCategories).When(r => !Apt(r)).W(90);
        yield return F.Combo("land_use", "용도지역", Catalog.LandUses).When(r => !Apt(r));
        yield return F.Text("community_facility", "커뮤니티시설").Span(2).When(r => Apt(r) || Redev(r));

        yield return F.Section("옵션");
        yield return F.Memo("opt", "옵션", 46).Span(2);
        yield return F.Section("메모");
        yield return F.Memo("pt_memo", "메모", 50).Span(2);
    }

    /// <summary>소재지 표시 + [지역·단지 선택] 버튼. 단지 선택 시 단지명·지번·세대수·준공년도·주차대수를 채운다.</summary>
    public static FrameworkElement AddressEditor(Row row)
    {
        var dp = new DockPanel();
        var btn = new Button { Content = "지역·단지 선택", Padding = new Thickness(8, 1, 8, 1), MinHeight = 24, Margin = new Thickness(0, 0, 8, 0) };
        var text = new TextBlock { VerticalAlignment = VerticalAlignment.Center, TextWrapping = TextWrapping.Wrap };
        void Update() => text.Text = row.Has("bjd_code")
            ? string.Join(" ", new[] { row.Str("addr1"), row.Str("addr2"), row.Str("addr3") }.Where(s => !string.IsNullOrEmpty(s)))
            : "지역을 선택하세요";
        Update();
        row.PropertyChanged += (_, e) => { if (e.PropertyName is "addr1" or "addr2" or "addr3" or "bjd_code" or "danji_code") Update(); };

        btn.Click += (_, _) =>
        {
            var withDanji = Apt(row) || Redev(row);
            var p = RegionPicker.Pick(withDanji, "소재지 선택");
            if (p is null) return;
            row["addr1"] = p["addr1"];
            row["addr2"] = p["addr2"];
            row["addr3"] = p["addr3"];
            row["bjd_code"] = p["bjd_code"];
            if (p["danji"] is Row danji)
            {
                row["danji_code"] = p.Str("danji_code");
                row["addr4"] = p.Str("danji_name");
                if (!row.Has("jibun")) row["jibun"] = p.Str("danji_bunji");
                if (danji.Long("familyCnt") is { } fam && !row.Has("house_cnt")) row["house_cnt"] = fam;
                if (danji.Str("approveDate") is { Length: >= 4 } ap && !row.Has("comp_year")) row["comp_year"] = ap[..4];
                if (danji.Long("totprkCnt") is { } pk && !row.Has("pk_cnt")) row["pk_cnt"] = pk;
            }
            else if (withDanji)
            {
                row["danji_code"] = null;
            }
        };
        DockPanel.SetDock(btn, Dock.Left);
        dp.Children.Add(btn);
        dp.Children.Add(text);
        return dp;
    }
}
