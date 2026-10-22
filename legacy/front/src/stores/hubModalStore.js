import { create } from 'zustand';
import { toRentBsnCode } from '../constants/propertyOptions';

/**
 * 공동중개망 모달 전역 상태 관리
 */
export const useHubModalStore = create((set) => ({
  isOpen: false,
  editData: null,
  defaultTradeDiv: 'CUST',

  openModal: (data = null, tradeDiv = 'CUST') => {
    set({
      isOpen: true,
      editData: data,
      defaultTradeDiv: tradeDiv,
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      editData: null,
      defaultTradeDiv: 'CUST',
    });
  },

  // 고객 데이터로 모달 열기
  openWithCustomer: (customerData) => {
    set({
      isOpen: true,
      defaultTradeDiv: 'CUST',
      editData: {
        tradeDiv: 'CUST',
        custNo: customerData.custNo,
        custName: customerData.name,
        custAlias: customerData.alias,
        custTel: customerData.tel,
        custAddr: customerData.addr,
        custMemo: customerData.memo,
        custRentBsnYn: customerData.rentBsnYn,
        custTrdPrg: customerData.trdPrg,
        custWantType: customerData.wantType,
        custExcAreaFr: customerData.excAreaFr,
        custExcAreaTo: customerData.excAreaTo,
        custRegion1: customerData.address1,
        custRegion2: customerData.address2,
        custRegion3: customerData.address3,
        custTrdType: customerData.trdType,
        custSaleAmtFr: customerData.saleAmtFr,
        custSaleAmtTo: customerData.saleAmtTo,
        custLesAmtFr: customerData.lesAmtFr,
        custLesAmtTo: customerData.lesAmtTo,
        custProtAmtFr: customerData.protAmtFr,
        custProtAmtTo: customerData.protAmtTo,
        custMonAmtFr: customerData.monAmtFr,
        custMonAmtTo: customerData.monAmtTo,
        custMoveinYn: customerData.moveinYn,
        custMoveDateFr: customerData.moveDateFr,
        custMoveDateTo: customerData.moveDateTo,
        custCashAblt: customerData.cashAblt,
        custRmk: customerData.rmk,
      },
    });
  },

  // 물건 데이터로 모달 열기 (물건등록폼 → 공동중개망 자동채움)
  openWithProperty: (propertyData) => {
    const firstSaleDiv = propertyData.saleDiv
      ? String(propertyData.saleDiv).split(',')[0].trim()
      : '';
    set({
      isOpen: true,
      defaultTradeDiv: 'PT',
      editData: {
        tradeDiv: 'PT',
        ptNo: propertyData.ptNo,
        pPtName: propertyData.ptName,
        pPtType: propertyData.ptType,     // SYCA 코드
        pSaleDiv: firstSaleDiv,           // SALEDIV 코드
        pSaleAmt: propertyData.saleAmt,
        pNowDepAmt: propertyData.nowDepAmt,
        pNowMonAmt: propertyData.nowMonAmt,
        pExcArea: propertyData.excArea,
        pSupArea: propertyData.supArea,
        // 구조화 주소 (HubFormPage editData 분기에서 addr*로 매핑)
        pAddr1: propertyData.addr1,
        pAddr2: propertyData.addr2,
        pAddr3: propertyData.addr3,
        pAddr4: propertyData.addr4,
        pAddr5: propertyData.addr5,
        pBjdCode: propertyData.bjdCode,
        pDanjiCode: propertyData.danjiCode,
        pAddrFull: [propertyData.addr1, propertyData.addr2, propertyData.addr3, propertyData.addr4, propertyData.addr5]
          .filter(Boolean)
          .join(' '),
        pDong: propertyData.dong,
        pHo: propertyData.ho,
        pFloor1: propertyData.floor1,
        pFloor2: propertyData.floor2,
        pFloorDesc: propertyData.floorDesc,
        pDirStd: propertyData.dirStd,
        pBalcExt: propertyData.balcExt,
        pRoomCnt: propertyData.roomCnt,
        pBathCnt: propertyData.bathCnt,
        pPkCnt: propertyData.pkCnt,
        pMaintCost: propertyData.maintCost,
        pMaintDtl: propertyData.maintDtl,
        pHeatMethod: propertyData.heatMethod,
        pHeatFuel: propertyData.heatFuel,
        pHeatSystem: propertyData.heatSystem,
        pBuidStruct: propertyData.buidStruct,
        pEntrStruct: propertyData.entrStruct,
        immediateMoveinYn: propertyData.immediateMoveinYn,
        pExptDate: propertyData.exptDate,
        pPrgSts: propertyData.prgSts,
        pOpt: propertyData.opt,
        pPtExpl: propertyData.ptExpl,
        pCompYear: propertyData.compYear,
        // 중개정보 추가 자동채움
        pAptTyp: propertyData.aptTyp,
        pLandShare: propertyData.landShare,
        pCurrentStatus: propertyData.currentStatus,
        pLesAmt: propertyData.lesAmt,
        pLoanAmtAft: propertyData.loanAmtAft,
        pContractRenewalRight: propertyData.contractRenewalRight,
        pHouseCnt: propertyData.houseCnt,
        ownerRentBsnYn: toRentBsnCode(propertyData.houseRental || propertyData.ownerRentBsnYn),
      },
    });
  },
}));
