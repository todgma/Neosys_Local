import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import ContractDocumentEditor from '../../components/contracts/ContractDocumentEditor';
import { CONTRACT_DOCS } from '../../constants/contractTemplates';
import { loadContractTemplates } from '../../services/contractTemplateCache';
import { saveContract } from '../../utils/contractStore';
import { contractApiService } from '../../services/contractApiService';
import { useAuthStore } from '../../stores/authStore';
import ReceiptForm from '../../components/contracts/ReceiptForm';
import UtilitySettlementForm from '../../components/contracts/UtilitySettlementForm';
import BalanceSettlementForm from '../../components/contracts/BalanceSettlementForm';
import BrokerFeeReceiptForm from '../../components/contracts/BrokerFeeReceiptForm';
import PreContractSmsModal from '../../components/contracts/PreContractSmsModal';
import SettlementPrepModal, { EMPTY_PREP_DATA } from '../../components/contracts/SettlementPrepModal';
import PrivacyConsentForm from '../../components/contracts/PrivacyConsentForm';
import ConfirmExplainForm from '../../components/contracts/ConfirmExplainForm';
import ConfirmExplainFormII from '../../components/contracts/ConfirmExplainFormII';
import ConfirmExplainFormIII from '../../components/contracts/ConfirmExplainFormIII';
import ConfirmExplainFormIV from '../../components/contracts/ConfirmExplainFormIV';
import ContractDocModal from '../../components/contracts/ContractDocModal';
import { TRADE_FORMS, downloadForm } from '../../constants/tradeForms';
import molitIcon from '../../assets/molit.ico';

/**
 * 계약서 작성 워크스페이스 (계약관리 → 계약서작성)
 *  - 노란 필터바 + (좌)계약서 문서영역 + (우)자료 사이드바 + 하단 미리보기/저장
 *  참고 이미지 레이아웃 재현. 세부 연동(공부발급/증명서 등)은 준비중.
 */

const TRADE_TYPES = [
  { value: 'SALEDIV01', label: '매매' },
  { value: 'SALEDIV02', label: '전세' },
  { value: 'SALEDIV03', label: '월세' },
  { value: 'SALEDIV04', label: '연세' },
];

// 계약서 종류(대분류) 및 종류별 물건유형 목록
const CONTRACT_KINDS = ['부동산', '분양권', '입주권', '권리금'];
const PT_TYPES_BY_KIND = {
  부동산: ['아파트', '오피스텔', '단독주택', '다가구주택', '다세대주택', '상가', '사무실', '공장', '창고', '지식산업센터', '건물', '토지', '표준임대차계약서', '주택임대차표준계약서'],
  분양권: ['아파트', '오피스텔', '상가'],
  입주권: ['관리처분인가후 이주전', '이주후 멸실전', '멸실후 동호수추첨전', '동호수 추첨 및 분양계약 완료'],
  권리금: ['상가건물 임대차 권리금 계약서', '권리(시설) 양수 양도 계약서'],
};

const soon = () => toast('준비 중입니다.');

// 공적장부 발급/열람 링크는 상단 탭바(ContractsPage: 공제증서 우측 '공적장부 ▾')로 이동됨


// 거래유형(SALEDIV) → 계약서 카테고리
const TRADE_TO_CATEGORY = { SALEDIV01: 'sale', SALEDIV02: 'jeonse', SALEDIV03: 'wolse', SALEDIV04: 'wolse' };

// 마스터 UUID 생성(보안 컨텍스트면 crypto.randomUUID, 아니면 폴백)
const genMasterId = () => (typeof window !== 'undefined' && window.crypto?.randomUUID)
  ? window.crypto.randomUUID()
  : `${Date.now()}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;

export default function ContractComposePage({ masterId: initialMasterId = null, onSaved = null, onMasterId = null, onComposeMeta = null } = {}) {
  const [contractKind, setContractKind] = useState('부동산');
  const [docType, setDocType] = useState(PT_TYPES_BY_KIND['부동산'][0]); // 물건유형(=문서 종류)
  const [tradeType, setTradeType] = useState('SALEDIV01');
  const [showPreContract, setShowPreContract] = useState(false); // 가계약 문자 모달
  const [receiptForm, setReceiptForm] = useState(null); // 영수증 편집 팝업(제목) — null이면 닫힘
  const [docData, setDocData] = useState({});             // 계약서 입력 데이터(부모 보관)
  const { user, office } = useAuthStore();
  // 계약 화면 진입 시 서식 템플릿 버전 확인(관리자 수정분 즉시 반영) — ver 바뀌었을 때만 재캐싱
  useEffect(() => { loadContractTemplates(); }, []);
  // 마스터 UUID — 기존 계약이면 그 id, 신규면 진입 시 미리 생성(메모리). 재진입 시 새로 생성.
  const [masterId, setMasterId] = useState(() => initialMasterId || genMasterId());
  // 현재 계약 masterId를 부모(상단 네비)로 통지 — 공제증서 등 계약 PK 기준 첨부에 사용
  useEffect(() => { onMasterId?.(masterId); }, [masterId]); // eslint-disable-line react-hooks/exhaustive-deps
  // 현재 계약종류/물건유형/거래유형을 부모로 통지 — 공제증서 등 파일만 첨부 시 마스터 보장에 사용
  useEffect(() => { onComposeMeta?.({ contractKind, docType, tradeType }); }, [contractKind, docType, tradeType]); // eslint-disable-line react-hooks/exhaustive-deps
  const [loadedDoc, setLoadedDoc] = useState(null);       // 기존 계약 편집: 로드된 표내용(에디터 초기값 병합용)
  const skipResetRef = useRef(false);                     // 로드 직후 템플릿 리셋 1회 스킵
  const [pvMount, setPvMount] = useState(false);          // 미리보기용 전체 템플릿(숨김) 마운트
  const [override, setOverride] = useState(null);         // 중개계약서/약정서 등 별도 서식 강제 로드 {label, category}
  const [brokerMenu, setBrokerMenu] = useState(false);    // 중개계약서 선택 팝업
  const [formMenu, setFormMenu] = useState(false);        // 거래관련서식 드롭다운
  const [prepMenu, setPrepMenu] = useState(false);        // 준비서면 드롭다운
  const [showSettlementPrep, setShowSettlementPrep] = useState(false); // 잔금시 준비사항(웹 폴백 인페이지 모달)
  const [showContractPrep, setShowContractPrep] = useState(false); // 계약시 준비사항(웹 폴백 인페이지 모달)
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false); // 개인정보 동의서(웹 폴백)
  const [loading, setLoading] = useState(false);          // 계약서 전환 로딩 표시
  const [reloadNonce, setReloadNonce] = useState(0);      // '계약서' 버튼: 강제 재로드용(에디터 remount)
  const [docTab, setDocTab] = useState('계약서');         // 문서 탭: 계약서 | 확인설명서 | 개인정보활용동의서
  const [ceType, setCeType] = useState('주거용');         // 확인설명서 종류: 주거용 | 비주거용 | 토지용 | 입목용 (현재 주거용만 구현)
  const [docModal, setDocModal] = useState(null);         // 부속문서 인앱 모달 { type, data } (가계약 제외)
  const [previewHtml, setPreviewHtml] = useState(null);   // 메인 계약서 미리보기 모달(iframe srcDoc)
  const [privacyInitial, setPrivacyInitial] = useState(null); // 개인정보동의서 로드값(백엔드)
  const [privacyLoaded, setPrivacyLoaded] = useState(false);  // 개인정보동의서 최초 로드 완료 여부
  // 개인정보활용동의서 탭 최초 진입 시 백엔드에서 저장분 로드(masterId+docKind)
  useEffect(() => {
    if (docTab !== '개인정보활용동의서' || privacyLoaded) return;
    (async () => {
      try { const d = await contractApiService.getDocument(masterId, '개인정보동의서'); setPrivacyInitial(d || null); }
      catch (e) { console.error('개인정보동의서 로드 실패:', e); }
      finally { setPrivacyLoaded(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTab, privacyLoaded]);
  // 탭별 입력 초안 — 어느 탭에서 '저장'해도 계약서·확인설명서·개인정보동의서를 한 번에 저장
  //  draft: 폼의 최신 입력값 / saved: 마지막 저장(또는 최초 로드) 시점 값 → 다를 때만 저장
  const ceDraftRef = useRef(null), ceSavedRef = useRef(null);
  const privacyDraftRef = useRef(null), privacySavedRef = useRef(null);
  const onPrivacyChange = (f) => { privacyDraftRef.current = f; if (privacySavedRef.current == null) privacySavedRef.current = JSON.stringify(f); };
  const onCeChange = (f) => { ceDraftRef.current = f; if (ceSavedRef.current == null) ceSavedRef.current = JSON.stringify({ ...f, _ceType: ceInitial?._ceType || '주거용' }); };
  // 개인정보동의서 탭의 '저장' 버튼 → 일괄 저장
  const savePrivacy = async (formData) => !!(await saveAll({ privacy: formData }));
  // 확인설명서 — 계약서 PK(masterId)+docKind로 로드/저장(다른 부속문서와 동일)
  const [ceInitial, setCeInitial] = useState(null);
  const [ceLoaded, setCeLoaded] = useState(false);
  useEffect(() => {
    if (docTab !== '확인설명서' || ceLoaded) return;
    (async () => {
      try {
        const d = await contractApiService.getDocument(masterId, '확인설명서');
        setCeInitial(d || null);
        if (d?._ceType) setCeType(d._ceType);   // 저장된 종류로 복원
      }
      catch (e) { console.error('확인설명서 로드 실패:', e); }
      finally { setCeLoaded(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docTab, ceLoaded]);
  // 확인설명서 탭의 '저장' 버튼 → 일괄 저장
  const saveConfirmExplain = async (formData) => !!(await saveAll({ ce: formData }));
  // 별도 서식 즉시 로드(override + 데이터 초기화)
  const loadOverrideDoc = (label, category) => { setBrokerMenu(false); setOverride({ label, category }); setDocData({ docType: label, category }); };
  // '계약서' 버튼: 현재 계약서종류/물건유형/거래유형에 맞는 기본 계약서를 새로 로드(별도 서식 해제 + 에디터 remount)
  const reloadContractDoc = () => {
    setOverride(null);
    setLoading(true);
    setReloadNonce((n) => n + 1);
    setTimeout(() => setLoading(false), 350);
  };
  // 부속문서 — 인앱 모달(ContractDocModal)로 렌더. 단, 가계약(pre-contract)은 기존 새 창 유지.
  const openDocWindow = (type, docKind, extra = {}, size = {}) => {
    // meta: 계약서 미저장 상태라도 부속문서 저장 시 마스터에 현재 계약종류/물건유형/거래유형 기록(소재지=(임시))
    const data = { masterId, docKind, meta: { contractKind, docType, tradeType }, ...extra };
    if (type === 'pre-contract') {
      const w = size.width || 960, h = size.height || 980;
      if (window.electronAPI?.modal?.open) {
        window.electronAPI.modal.open({ type, data, width: w, height: h, minWidth: size.minWidth || 760, minHeight: size.minHeight || 600, resizable: true, maximized: true })
          .catch((e) => console.error('문서 창 열기 실패:', e));
      } else {
        const initData = encodeURIComponent(JSON.stringify({ type, data }));
        window.open(`#/modal/${type}?initData=${initData}`, '_blank', `noopener,width=${w},height=${h}`);
      }
      return;
    }
    setDocModal({ type, data });
  };
  // 잔금시/계약시 준비사항 — 새 창, masterId+kind 전달
  const openSettlementPrep = () => { setPrepMenu(false); openDocWindow('settlement-prep', '준비서면:잔금시', {}, { width: 1040, height: 840, minWidth: 800, minHeight: 560 }); };
  const openContractPrep = () => { setPrepMenu(false); openDocWindow('contract-prep', '준비서면:계약시', {}, { width: 1040, height: 840, minWidth: 800, minHeight: 560 }); };
  // 영수증 등 — 종류별로 새 창, kind는 영수증:*/정산서:*
  const openReceiptDoc = (value) => {
    if (!value) return;
    if (value === '공과금등 정산서') return openDocWindow('utility-settlement', '정산서:공과금', { title: '공과금 등 정산서' }, { width: 960, height: 1040, minWidth: 760, minHeight: 640 });
    if (value === '잔금정산서') return openDocWindow('balance-settlement', '정산서:잔금', { title: '잔금 정산서' }, { width: 980, height: 1040, minWidth: 780, minHeight: 640 });
    if (value === '중개보수영수증') return openDocWindow('broker-fee-receipt', '영수증:중개보수', { title: '중개보수 영수증', defaults: {
      bizNo: office?.bizNo || '', officeName: office?.offNm || '', officeAddr: office?.addr || '', regNo: office?.regNo || '', repName: office?.rpsNm || '',
    } }, { width: 1120, height: 820, minWidth: 900, minHeight: 620 });
    // 영수증 · 반환금영수증 — 동일 UI(좌측 입력 + 우측 미리보기), 명칭만 다름
    if (value === '영수증') return openDocWindow('return-receipt', '영수증:영수증', { title: '영수증' }, { width: 1120, height: 820, minWidth: 900, minHeight: 600 });
    if (value === '반환금영수증') return openDocWindow('return-receipt', '영수증:반환금', { title: '반환금 영수증' }, { width: 1120, height: 820, minWidth: 900, minHeight: 600 });
    return openDocWindow('receipt-form', `영수증:${value}`, { title: value }, { width: 900, height: 1000, minWidth: 720, minHeight: 620 });
  };
  // 개인정보활용동의서 — 탭 인라인 렌더(PrivacyConsentForm)로 전환. 새 창 오픈 제거.

  // 거래관련서식 다운로드 — 확인 후 저장 위치 선택(지원 브라우저) 또는 기본 다운로드. 실제 파일은 추후 배치.
  const handleFormDownload = async (name) => {
    setFormMenu(false);
    // 미납지방세/미납국세 등 열람신청서 — 다운로드 대신 새 창(작성/미리보기/인쇄)
    const viewType = name === '계약갱신요구권행사여부확인서' ? 'contract-renewal-confirm'
      : name === '미납지방세 등 열람신청서' ? 'tax-arrears-view'
      : name === '미납국세 등 열람신청서' ? 'tax-national-view'
      : name === '임대보증금 일부보증에 대한 임차인동의서' ? 'rent-deposit-consent'
      : name === '임대보증금 미가입에 대한 임차인동의서' ? 'rent-deposit-noninsure'
      : name === '(주거용)임대차정보제공요청서' ? 'rent-info-request'
      : name === '(상가건물용)임대차정보제공요청서' ? 'rent-info-request-commercial'
      : name === '주민등록전입세대열람신청서' ? 'resident-transfer-confirm'
      : name === '토지자금조달계획서' ? 'land-fund-plan'
      : name === '주택자금조달계획서' ? 'housing-fund-plan' : null;
    if (viewType) {
      // 작성형 서식 — 새 창 + masterId/kind 전달(팝업에서 백엔드 저장/조회)
      openDocWindow(viewType, `거래관련서식:${name}`, {}, { width: 900, height: 1100, minWidth: 720, minHeight: 640 });
      return;
    }
    if (!window.confirm(`[${name}]\n\n다운로드 하시겠습니까?`)) return;
    try {
      await downloadForm(name);
      toast.success('다운로드되었습니다.');
    } catch (err) {
      if (err?.name === 'AbortError') return; // 사용자가 저장 취소
      toast.error('아직 파일이 준비되지 않았습니다.');
    }
  };

  // 거래유형 고정 규칙
  const LEASE_DOCTYPES = ['표준임대차계약서', '주택임대차표준계약서'];
  const saleOnly = contractKind === '분양권' || contractKind === '입주권'; // 매매 고정
  const emptyOnly = contractKind === '권리금' || (contractKind === '부동산' && LEASE_DOCTYPES.includes(docType)); // 빈값 고정(표준임대차 포함)

  // 거래유형 고정값 동기화
  useEffect(() => {
    if (saleOnly && tradeType !== 'SALEDIV01') setTradeType('SALEDIV01');
    else if (emptyOnly && tradeType !== '') setTradeType('');
    else if (!saleOnly && !emptyOnly && tradeType === '') setTradeType('SALEDIV01');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saleOnly, emptyOnly]);

  // 계약서종류(대분류) 변경 시 물건유형 첫 항목으로 초기화 (별도 서식 override 해제)
  const handleKindChange = (kind) => {
    setOverride(null);
    setContractKind(kind);
    setDocType((PT_TYPES_BY_KIND[kind] || [])[0] || '');
    if (kind === '분양권' || kind === '입주권') setTradeType('SALEDIV01');
    else if (kind === '권리금') setTradeType('');
  };

  // 거래유형(SALEDIV) → 표기명
  const TRADE_NAME = { SALEDIV01: '매매', SALEDIV02: '전세', SALEDIV03: '월세', SALEDIV04: '연세' };
  const tradeName = TRADE_NAME[tradeType] || '매매';

  // 계약서종류/거래유형 → 계약서 내용 카테고리(sale/jeonse/wolse/assign …)
  const resolveCategory = () => {
    if (contractKind === '권리금') return docType.includes('권리금') ? 'keymoney' : 'assign';
    if (contractKind === '분양권') return 'bunyang';
    if (contractKind === '입주권') return 'ipjugwon';
    if (LEASE_DOCTYPES.includes(docType)) return 'standardLease'; // 표준임대차 전용 서식
    return TRADE_TO_CATEGORY[tradeType] || 'sale';
  };
  const baseCategory = resolveCategory();

  // 물건유형/거래유형 → 문서 라벨(제목).
  const resolveDocLabel = () => {
    // 부동산: (부동산)물건유형+거래유형계약서 형태
    if (contractKind === '부동산') {
      if (docType.includes('계약서') || docType.includes('동의서')) return `(부동산)${docType}`;
      return `(부동산)${docType}${tradeName}계약서`;
    }
    // 물건유형 자체가 완성된 서식명이면 그대로 (권리금 등)
    if (docType.includes('계약서') || docType.includes('동의서')) return docType;
    if (contractKind === '분양권') return `${docType} 분양권 매매 계약서`;
    // 입주권: 동호수 추첨 및 분양계약 완료만 '조합원 입주권 매매계약서', 그 외 단계는 포괄승계 명칭
    if (contractKind === '입주권') return (docType.includes('분양계약 완료') || docType === '동호수추첨후') ? '조합원 입주권 매매계약서' : '부동산매매계약서(조합원 입주권 포괄승계)';
    return `${docType}${tradeName}계약서(단독)`;
  };
  // 별도 서식(중개계약서/약정서 등)이 지정되면 우선 로드
  const templateCategory = override ? override.category : baseCategory;
  const templateDocLabel = override ? override.label : resolveDocLabel();
  // 입주권 단계(물건유형) — 제목이 단계별로 동일하므로 본문 레이아웃 분기를 위해 별도 전달
  const ipjuStage = contractKind === '입주권' ? docType : '';

  // 계약서종류/물건유형/거래유형이 바뀌면 별도 서식(중개계약서/약정서) 해제 → 기본 서식으로 복귀
  const firstSelRef = useRef(true);
  useEffect(() => {
    if (firstSelRef.current) { firstSelRef.current = false; return; }
    setOverride(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractKind, docType, tradeType]);

  // 계약서 서식이 바뀌면 입력 데이터 초기화(문서 종류·카테고리·입주권 단계 반영). 단, 기존 계약 로드 직후 1회는 스킵.
  useEffect(() => {
    if (skipResetRef.current) { skipResetRef.current = false; return; }
    setDocData({ docType: templateDocLabel, category: templateCategory, 입주권단계: ipjuStage });
  }, [templateDocLabel, templateCategory, ipjuStage]);

  // 기존 계약 편집: 마스터 상세 로드 → 계약서종류/물건유형/거래유형/표내용 채움
  useEffect(() => {
    if (!initialMasterId) return;
    (async () => {
      try {
        const m = await contractApiService.getDetail(initialMasterId);
        if (!m) return;
        skipResetRef.current = true;
        setMasterId(m.masterId ?? initialMasterId);
        if (m.contractKind) setContractKind(m.contractKind);
        if (m.docType) setDocType(m.docType);
        if (m.tradeType != null) setTradeType(m.tradeType);
        setLoadedDoc(m.doc || {});
        setDocData(m.doc || {});
        setReloadNonce((n) => n + 1);
      } catch (e) { console.error('계약 상세 로드 실패:', e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMasterId]);

  // 저장 → 백엔드 마스터(계약서종류/물건유형/거래유형 + 표내용 doc). 목록 헤드라인용 요약 함께 저장. (알림 없음, 실패 시 throw)
  const saveMasterOnly = async (d) => {
    const g = (...ks) => { for (const k of ks) { if (d && d[k]) return String(d[k]); } return ''; };
    const numOf = (s) => { const n = Number(String(s).replace(/[^0-9.]/g, '')); return n && !isNaN(n) ? Math.round(n) : null; };
    const id = await contractApiService.saveMaster({
      masterId, // 진입 시 생성한 UUID(기존 계약이면 그 id) — 같은 key로 upsert
      contractKind, docType, tradeType,
      title: templateDocLabel,
      addr: g('소재지'),
      seller: g('매도인_성명', '임대인_성명', '양도인_성명', '전대인_성명', '임차인_성명'),
      buyer: g('매수인_성명', '임차인_성명', '양수인_성명', '전차인_성명', '신규임차인_성명'),
      amount: numOf(g('매매대금', '보증금', '권리양도금', '총매매금액')),
      contractDate: g('계약일자') || null,
      status: '작성',
      doc: d,
      offNo: user?.offNo ?? null, rtNo: user?.rtNo ?? null, userId: user?.userId ?? null,
    });
    if (id) setMasterId(id);
    return id;
  };

  // 일괄 저장 — 계약서(마스터) + 변경된 확인설명서/개인정보동의서. 완료 알림은 1회만 표시.
  //  ce/privacy 인자: 해당 탭 저장 버튼에서 넘긴 최신값(없으면 탭 초안 사용). 한 번도 열지 않은 탭은 저장 안 함.
  const saveAll = async ({ contract = docData, ce = ceDraftRef.current, privacy = privacyDraftRef.current } = {}, { silent = false } = {}) => {
    const meta = { contractKind, docType, tradeType };
    const saved = ['계약서'];
    try {
      const id = (await saveMasterOnly(contract)) || masterId;
      if (ce) {
        const ceData = { ...ce, _ceType: ceType };
        const ceJson = JSON.stringify(ceData);
        if (ceJson !== ceSavedRef.current) {
          await contractApiService.saveDocument(id, '확인설명서', ceData, user?.userId || null, meta);
          ceSavedRef.current = ceJson;
          saved.push('확인설명서');
        }
      }
      if (privacy) {
        const pvJson = JSON.stringify(privacy);
        if (pvJson !== privacySavedRef.current) {
          await contractApiService.saveDocument(id, '개인정보동의서', privacy, user?.userId || null, meta);
          privacySavedRef.current = pvJson;
          saved.push('개인정보활용동의서');
        }
      }
      if (!silent) toast.success(`${saved.join('·')}가 저장되었습니다.`);
      onSaved?.(id);
      return id;
    } catch (e) {
      console.error('계약서 일괄 저장 실패:', e);
      toast.error(saved.length > 1 ? `${saved.join('·')}까지 저장 후 실패했습니다.` : '저장에 실패했습니다.');
      return null;
    }
  };
  // 계약서 탭 '저장' 버튼(에디터 onSave) → 일괄 저장
  const onSaveMaster = (d) => saveAll({ contract: d });

  // 계약서복사 — 계약서(마스터)만 복제(영수증/가계약 등 부속문서 제외). 소재지에 '(복사본)' 부기, 원본 pk 연결.
  //  최신 편집 반영 위해 현재 내용 저장 후 서버에서 복제 → 복사본으로 즉시 전환
  const handleCopyContract = async () => {
    try {
      const baseId = (await saveAll({}, { silent: true })) || masterId; // 현재 계약 먼저 저장(복사본이 최신 내용 반영) — 알림은 복사 완료 1회만
      if (!baseId) { toast.error('저장 후 복사할 수 있습니다.'); return; }
      const newId = await contractApiService.copy(baseId, user?.userId);
      if (!newId) { toast.error('복사에 실패했습니다.'); return; }
      toast.success('계약서가 복사되었습니다. (소재지 앞에 "(복사)" 표기)');
      onSaved?.(newId); // 복사본으로 전환 + 목록 갱신(remount되어 복사본 로드)
    } catch (e) { console.error('계약서복사 실패:', e); toast.error('복사에 실패했습니다.'); }
  };

  // 상단 버튼(부속문서)은 전부 새 창 팝업에서 masterId+kind로 백엔드 저장/조회 (openDocWindow → ModalPage)

  // 계약서 전환 시 로딩 표시
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 350);
    return () => clearTimeout(t);
  }, [templateDocLabel, templateCategory, ipjuStage]);

  // 미리보기: "원래 세팅한 전체 템플릿 + 데이터"를 숨김 렌더 → 새 창(A4 인쇄화면)으로 표시
  const openPreview = () => setPvMount(true);
  // 미리보기 iframe 헤더의 '닫기'(postMessage) 수신 → 모달 닫기
  useEffect(() => {
    const h = (e) => { if (e?.data === 'pv-close') setPreviewHtml(null); };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, []);
  useEffect(() => {
    if (!pvMount) return;
    const src = document.querySelector('.contract-print-source .contract-a4');
    if (!src) { setPvMount(false); toast('미리보기를 준비하지 못했습니다.'); return; }
    const clone = src.cloneNode(true);
    // 입력값(input/textarea/select)을 정적 텍스트로 반영 (cloneNode는 현재 value/선택을 복사하지 않음)
    const srcF = src.querySelectorAll('input, textarea, select');
    const cloF = clone.querySelectorAll('input, textarea, select');
    srcF.forEach((el, i) => {
      const c = cloF[i]; if (!c) return;
      const span = document.createElement('span');
      if (el.type === 'radio' || el.type === 'checkbox') {
        span.textContent = el.checked ? '☑' : '☐';
        span.style.cssText = 'font-size:13px;padding:0 2px;';
      } else {
        const raw = el.tagName === 'SELECT' ? (el.selectedOptions[0]?.text || '') : (el.value || '');
        span.textContent = (raw === '선택' || raw === '지목' || raw === '구조' || raw === '용도' || raw === '종류') ? '' : raw;
        // 미리보기/인쇄: 입력칸 밑줄 제거(값 없으면 빈칸). 밑줄/최소폭 없음
        span.style.cssText = 'display:inline-block;font-size:13px;padding:1px 4px;white-space:pre-wrap;';
        if (el.tagName === 'TEXTAREA') { span.style.display = 'block'; }
      }
      c.replaceWith(span);
    });
    clone.querySelectorAll('.contract-actions').forEach((n) => n.remove());
    // 특약사항 '별지로 작성' 체크 시 본문에서 분리 → 별도 페이지
    const separateSpecial = !!src.querySelector('.contract-special-toggle:checked');
    let extraPage = '';
    if (separateSpecial) {
      const sp = clone.querySelector('.contract-special');
      if (sp) { extraPage = `<div class="contract-a4 pv-page" style="page-break-before:always;margin-top:20px;">${sp.outerHTML}</div>`; sp.remove(); }
    }
    const html = ('<!doctype html><html><head><meta charset="utf-8"><title>계약서 미리보기</title>'
        + '<style>'
        + "@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');"
        + '@page{size:A4;margin:20mm 20mm 10mm 20mm;}'
        // 미리보기/인쇄 폰트: 굴림 고정(편집 화면은 Pretendard 유지)
        + "body{margin:0;background:#e2e8f0;font-family:'굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif;}"
        + ".contract-a4, .contract-a4 *{font-family:'굴림','Gulim','돋움','Dotum','Malgun Gothic',sans-serif !important;}"
        + '.contract-a4{width:210mm;min-height:297mm;background:#fff;padding:8mm 7mm;box-sizing:border-box;color:#111827;box-shadow:0 2px 12px rgba(0,0,0,.15);}'
        + 'table{border-collapse:collapse;width:100%;margin-top:2px;}'
        // 표 테두리 전부 1px solid 통일(굵고 얇고 섞이지 않게) — 미리보기/인쇄 공통
        + '.contract-a4 table,.contract-a4 th,.contract-a4 td{border:1px solid #000 !important;}'
        + 'input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none;margin:0;}'
        // 미리보기/인쇄: 조항 등 본문 10px · 줄간격 160% 통일(제목 제외). 표 헤더도 10px
        + ".contract-a4, .contract-a4 td, .contract-a4 input, .contract-a4 label, .contract-a4 p, .contract-a4 span, .contract-a4 div:not(.contract-heading){font-size:10px !important;line-height:1.6 !important;}"
        + '.contract-a4 th{font-size:10px !important;line-height:1.6 !important;}'
        // 상단 고정 바(영역) — 인쇄 / PDF로 저장. 인쇄 시 숨김
        + '.pv-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);}'
        + '.pv-topbar .ttl{font-size:14px;font-weight:800;}'
        + '.pv-topbar .btns{display:flex;gap:8px;}'
        + '.pv-topbar button{padding:7px 16px;font-size:14px;font-weight:700;border:none;border-radius:6px;cursor:pointer;}'
        + '.pv-topbar .pv-print{background:#4f46e5;color:#fff;}'
        + '.pv-topbar .pv-pdf{background:#fff;color:#1f2937;border:1px solid #cbd5e1;}'
        + '.pv-topbar .pv-close{background:#e5e7eb;color:#1f2937;border:1px solid #cbd5e1;}'
        + '.pv-topbar .pv-zoom{display:inline-flex;align-items:center;gap:4px;margin-right:8px;}'
        + '.pv-topbar .pv-zoom button{padding:4px 12px;font-size:16px;font-weight:800;background:#fff;color:#1f2937;border:1px solid #cbd5e1;border-radius:6px;line-height:1;}'
        + '.pv-topbar #pvz{min-width:46px;text-align:center;font-size:13px;font-weight:800;color:#fff;}'
        + '.pv-body{display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px;}'
        + '@media print{*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}body{background:#fff;}.pv-topbar{display:none;}.pv-body{padding:0;gap:0;zoom:1 !important;}.contract-a4{box-shadow:none !important;width:auto !important;min-height:0 !important;padding:0 4mm !important;}.contract-a4,.contract-a4 *{color:#000 !important;}.contract-a4 table,.contract-a4 th,.contract-a4 td{border:1px solid #000 !important;}}'
        + '</style></head><body>'
        + '<div class="pv-topbar"><span class="ttl">계약서 미리보기</span>'
        + '<span class="btns">'
        + '<span class="pv-zoom"><button type="button" onclick="pvZoom(-0.1)" title="축소">−</button><span id="pvz">100%</span><button type="button" onclick="pvZoom(0.1)" title="확대">+</button></span>'
        + '<button class="pv-print" onclick="window.print()">인쇄</button>'
        + '<button class="pv-pdf" onclick="window.print()">PDF로 저장</button>'
        + '<button class="pv-close" onclick="parent.postMessage(\'pv-close\',\'*\')">닫기</button>'
        + '</span></div>'
        + '<div class="pv-body">'
        + clone.outerHTML
        + extraPage
        + '</div>'
        + '<script>var pvz=1;function pvZoom(d){pvz=Math.min(2,Math.max(0.5,Math.round((pvz+d)*10)/10));var b=document.querySelector(".pv-body");if(b)b.style.zoom=pvz;var e=document.getElementById("pvz");if(e)e.textContent=Math.round(pvz*100)+"%";}'
        + 'window.addEventListener("beforeprint",function(){var b=document.querySelector(".pv-body");if(b)b.style.zoom=1;});'
        + 'window.addEventListener("afterprint",function(){var b=document.querySelector(".pv-body");if(b)b.style.zoom=pvz;});</' + 'script>'
        + '</body></html>');
    setPreviewHtml(html);
    setPvMount(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pvMount]);

  // 확인설명서 미리보기 — ce-page DOM 복제(입력창→텍스트, 테두리 제거) + 공통 상단바(pv-topbar) 모달
  const openCePreview = () => {
    const root = document.querySelector('.ce-root');
    const pages = root ? root.querySelectorAll('.ce-page') : [];
    const styleEl = root ? root.querySelector('style') : null;
    if (!pages.length) { toast('미리보기를 준비하지 못했습니다.'); return; }
    const css = styleEl ? styleEl.textContent : '';
    let pagesHtml = '';
    pages.forEach((pg) => {
      const clone = pg.cloneNode(true);
      const srcF = pg.querySelectorAll('input, textarea, select');
      const cloF = clone.querySelectorAll('input, textarea, select');
      srcF.forEach((el, i) => {
        const c = cloF[i]; if (!c) return;
        const span = document.createElement('span');
        const raw = el.tagName === 'SELECT' ? (el.selectedOptions[0]?.text || '') : (el.value || '');
        span.textContent = raw;
        span.style.cssText = 'display:inline-block;padding:0 2px;white-space:pre-wrap;min-width:10px;';
        if (el.tagName === 'TEXTAREA') span.style.display = 'block';
        c.replaceWith(span);
      });
      pagesHtml += clone.outerHTML;
    });
    const html = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>중개대상물 확인ㆍ설명서 미리보기</title><style>'
      + css
      + '.ce-root,.ce-root.ce-inline{position:static !important;inset:auto !important;height:auto !important;background:#e2e8f0 !important;overflow:visible !important;}'
      + '.ce-page{zoom:1 !important;margin:0 auto !important;box-shadow:0 2px 12px rgba(0,0,0,.18) !important;}'
      + '@media print{*{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}.pv-body{display:block !important;padding:0 !important;gap:0 !important;background:#fff !important;}.ce-page{box-shadow:none !important;margin:0 auto !important;width:auto !important;min-height:0 !important;padding:0 !important;zoom:1 !important;break-after:page;page-break-after:always;}.ce-page:last-child{break-after:auto;page-break-after:auto;}.ce-page,.ce-page *{color:#000 !important;}}'
      + '.pv-topbar{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;background:#1f2937;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);}'
      + '.pv-topbar .ttl{font-size:14px;font-weight:800;}.pv-topbar .btns{display:flex;gap:8px;}'
      + '.pv-topbar button{padding:7px 16px;font-size:14px;font-weight:700;border:none;border-radius:6px;cursor:pointer;}'
      + '.pv-topbar .pv-print{background:#4f46e5;color:#fff;}.pv-topbar .pv-pdf{background:#fff;color:#1f2937;border:1px solid #cbd5e1;}.pv-topbar .pv-close{background:#e5e7eb;color:#1f2937;border:1px solid #cbd5e1;}'
      + '.pv-topbar .pv-zoom{display:inline-flex;align-items:center;gap:4px;margin-right:8px;}.pv-topbar .pv-zoom button{padding:4px 12px;font-size:16px;font-weight:800;background:#fff;color:#1f2937;border:1px solid #cbd5e1;border-radius:6px;line-height:1;}.pv-topbar #pvz{min-width:46px;text-align:center;font-size:13px;font-weight:800;color:#fff;}'
      + '.pv-body{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;}'
      + '@media print{body{background:#fff;}.pv-topbar{display:none;}.pv-body{padding:0;gap:0;}}'
      + '</style></head><body>'
      + '<div class="pv-topbar"><span class="ttl">중개대상물 확인ㆍ설명서[Ⅰ] 미리보기</span><span class="btns">'
      + '<span class="pv-zoom"><button type="button" onclick="pvZoom(-0.1)">−</button><span id="pvz">100%</span><button type="button" onclick="pvZoom(0.1)">+</button></span>'
      + '<button class="pv-print" onclick="window.print()">인쇄</button>'
      + '<button class="pv-pdf" onclick="window.print()">PDF로 저장</button>'
      + '<button class="pv-close" onclick="parent.postMessage(\'pv-close\',\'*\')">닫기</button>'
      + '</span></div>'
      + '<div class="pv-body">' + pagesHtml + '</div>'
      + '<script>var pvz=1;function pvZoom(d){pvz=Math.min(2,Math.max(0.5,Math.round((pvz+d)*10)/10));var b=document.querySelector(".pv-body");if(b)b.style.zoom=pvz;var e=document.getElementById("pvz");if(e)e.textContent=Math.round(pvz*100)+"%";}window.addEventListener("beforeprint",function(){var b=document.querySelector(".pv-body");if(b)b.style.zoom=1;});window.addEventListener("afterprint",function(){var b=document.querySelector(".pv-body");if(b)b.style.zoom=pvz;});</' + 'script>'
      + '</body></html>';
    setPreviewHtml(html);
  };

  // 노란 필터바 라벨/필드
  const yLabel = { fontSize: '14px', fontWeight: 700, color: '#92400e', whiteSpace: 'nowrap' };
  const yField = { padding: '4px 8px', fontSize: '13px', border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', boxSizing: 'border-box' };
  const yBtn = { padding: '5px 12px', fontSize: '14px', fontWeight: 600, border: '1px solid #cbd5e1', borderRadius: '3px', background: 'white', color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' };
  const yBtnIco = { ...yBtn, display: 'inline-flex', alignItems: 'center', gap: '5px' };
  const molitImg = <img src={molitIcon} alt="국토교통부" style={{ width: '15px', height: '15px', flexShrink: 0 }} />;

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f9fafb' }}>
      {/* 노란 필터바 (상단 여백 제거 — 상단 네비 바로 아래에 붙임) */}
      <div style={{ flexShrink: 0, margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', padding: '8px 12px', background: '#fef3c7', border: '2px solid #fbbf24', borderRadius: '4px' }}>
        <span style={yLabel}>계약서종류</span>
        <select value={contractKind} onChange={(e) => handleKindChange(e.target.value)} style={{ ...yField, width: '110px' }}>
          {CONTRACT_KINDS.map((k) => (<option key={k} value={k}>{k}</option>))}
        </select>
        <span style={yLabel}>물건유형</span>
        <select value={docType} onChange={(e) => { setOverride(null); setDocType(e.target.value); }} style={{ ...yField, width: '170px' }}>
          {(PT_TYPES_BY_KIND[contractKind] || []).map((t) => (<option key={t} value={t}>{t}</option>))}
        </select>
        <span style={yLabel}>거래유형</span>
        {(saleOnly || emptyOnly) ? (
          // 매매/빈값 고정(분양권·입주권·권리금·임대차)은 드롭다운 없이 값 고정 — 사각 박스(yField)는 동일 유지
          <span style={{ ...yField, width: '90px', color: '#374151', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center' }}>{saleOnly ? '매매' : '없음'}</span>
        ) : (
          <select value={tradeType} onChange={(e) => { setOverride(null); setTradeType(e.target.value); }} style={{ ...yField, width: '90px' }}>
            {TRADE_TYPES.map((t) => (<option key={t.value || 'all'} value={t.value}>{t.label}</option>))}
          </select>
        )}
        <button style={yBtn} onClick={handleCopyContract}>계약서복사</button>
        {/* 중개계약서 (전속/일반 선택) */}
        <div style={{ position: 'relative' }}>
          <button style={{ ...yBtn, background: override && (override.label === '전속중개계약서' || override.label === '일반중개계약서') ? '#4f46e5' : 'white', color: override && (override.label === '전속중개계약서' || override.label === '일반중개계약서') ? 'white' : '#374151' }} onClick={() => setBrokerMenu((v) => !v)}>중개계약서 ▾</button>
          {brokerMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden' }}>
              <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', background: 'white', cursor: 'pointer' }} onClick={() => loadOverrideDoc('전속중개계약서', 'exclusive')}>전속중개계약서</button>
              <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', borderTop: '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }} onClick={() => loadOverrideDoc('일반중개계약서', 'exclusive')}>일반중개계약서</button>
            </div>
          )}
        </div>
        <button style={{ ...yBtn, background: override && override.label === '토지거래허가구역 매매약정서' ? '#4f46e5' : 'white', color: override && override.label === '토지거래허가구역 매매약정서' ? 'white' : '#374151' }} onClick={() => loadOverrideDoc('토지거래허가구역 매매약정서', 'landAgree')}>토지거래허가구역 매매약정서</button>
      </div>

      {/* 서브 툴바 (계약서종류 줄 아래) — 카드 감싸지 않고 플랫하게 버튼만 가로 배치 */}
      <div style={{ flexShrink: 0, margin: '0 8px 8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {/* 가계약 문자 — 새 창 + masterId/kind 전달(팝업에서 백엔드 저장/조회) */}
        <button
          onClick={() => openDocWindow('pre-contract', '가계약문자', { defaults: { kindLabel: contractKind, ptTypeLabel: docType, tradeLabel: tradeName, officeName: office?.offNm || '', repName: office?.rpsNm || '' } }, { width: 1240, height: 920, minWidth: 900, minHeight: 600 })}
          style={yBtn}
        >가계약 문자</button>
        <select value="" onChange={(e) => { openReceiptDoc(e.target.value); e.target.selectedIndex = 0; }} style={{ ...yBtn, cursor: 'pointer' }}>
          <option value="">영수증 등</option>
          <option value="영수증">영수증</option>
          <option value="반환금영수증">반환금영수증</option>
          <option value="중개보수영수증">중개보수영수증</option>
          <option value="위임장">위임장</option>
          <option value="잔금정산서">잔금정산서</option>
          <option value="공과금등 정산서">공과금등 정산서</option>
        </select>
        {/* 거래관련서식 — 클릭 시 드롭다운, 항목 선택 시 파일 다운로드 */}
        <div style={{ position: 'relative' }}>
          <button style={{ ...yBtn, background: formMenu ? '#4f46e5' : 'white', color: formMenu ? 'white' : '#374151' }} onClick={() => setFormMenu((v) => !v)}>거래관련서식 ▾</button>
          {formMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '260px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {TRADE_FORMS.map((name, i) => (
                <button key={name} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }} onClick={() => handleFormDownload(name)}>{name}</button>
              ))}
            </div>
          )}
        </div>
        {/* 세금계산서 — 홈택스(외부 브라우저) */}
        <button style={yBtnIco} onClick={() => { const url = 'https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=index3'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }}>{molitImg}세금계산서</button>
        <button style={yBtn} onClick={soon}>공동중개사전송</button>
        {/* 준비서면 — 클릭 시 하단 드롭다운 (계약시/잔금시 준비사항) */}
        <div style={{ position: 'relative' }}>
          <button style={{ ...yBtn, background: prepMenu ? '#4f46e5' : 'white', color: prepMenu ? 'white' : '#374151' }} onClick={() => setPrepMenu((v) => !v)}>준비서면 ▾</button>
          {prepMenu && (
            <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', zIndex: 50, background: 'white', border: '1px solid #e5e7eb', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: '160px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {['계약시 준비사항', '잔금시 준비사항'].map((name, i) => (
                <button key={name} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px', border: 'none', borderTop: i === 0 ? 'none' : '1px solid #f1f5f9', background: 'white', cursor: 'pointer' }} onClick={() => { if (name === '잔금시 준비사항') openSettlementPrep(); else if (name === '계약시 준비사항') openContractPrep(); else { setPrepMenu(false); soon(); } }}>{name}</button>
              ))}
            </div>
          )}
        </div>
        {/* 공적장부 드롭다운은 상단(공제증서 우측)으로 이동 — 중복 제거 */}
        <button style={yBtn} onClick={soon}>문자안내</button>
        <button style={yBtnIco} onClick={() => { const url = 'https://rtms.molit.go.kr/'; if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, '_blank', 'noopener'); }}>{molitImg}부동산거래관리시스템</button>
        {/* 주택임대차계약신고서 — 글자 자체를 버튼으로. 거래관련서식과 동일하게 새 창(서식) 띄움 + 계약 테이블 key 저장 */}
        <button style={yBtn} onClick={() => openDocWindow('housing-lease-report', '거래관련서식:주택임대차계약신고서', {}, { width: 900, height: 1100, minWidth: 720, minHeight: 640 })}>주택임대차계약신고서</button>
      </div>

      {/* 문서 탭 (가계약 문자 줄 아래) — 계약서 | 확인설명서 | 개인정보활용동의서 */}
      <div style={{ flexShrink: 0, margin: '0 8px', display: 'flex', alignItems: 'flex-end', gap: '2px', borderBottom: '2px solid #334155' }}>
        {['계약서', '확인설명서', '개인정보활용동의서'].map((t) => {
          const active = docTab === t;
          return (
            <button key={t} type="button"
              onClick={() => { setDocTab(t); if (t === '계약서' && override) reloadContractDoc(); }}
              style={{ padding: '8px 22px', fontSize: '14px', fontWeight: active ? 800 : 600, border: '1px solid #334155', borderBottom: active ? '2px solid white' : '1px solid #334155', borderRadius: '6px 6px 0 0', marginBottom: '-2px', background: active ? 'white' : '#e2e8f0', color: active ? '#4f46e5' : '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* 본문(계약서 탭): 좌(계약서 템플릿 · 조항 생략 로드) + 우(사이드바) */}
      <div style={{ flex: 1, minHeight: 0, display: docTab === '계약서' ? 'flex' : 'none', gap: '8px', padding: '8px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, position: 'relative', border: '2px solid #334155', background: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, color: '#4f46e5' }}>
                  <span style={{ width: '18px', height: '18px', border: '3px solid #c7d2fe', borderTopColor: '#4f46e5', borderRadius: '50%', display: 'inline-block', animation: 'cspin 0.7s linear infinite' }} />
                  계약서 불러오는 중…
                </div>
                <style>{'@keyframes cspin{to{transform:rotate(360deg)}}'}</style>
              </div>
            )}
            <ContractDocumentEditor
              inline
              hideClauses
              stage="본계약"
              key={`${templateDocLabel}__${templateCategory}__${ipjuStage}__${reloadNonce}`}
              onChange={setDocData}
              initialData={{ ...(loadedDoc || {}), docType: templateDocLabel, category: templateCategory, 입주권단계: ipjuStage }}
              onSave={onSaveMaster}
              onPrint={openPreview}
              onClose={() => {}}
            />
          </div>
        </div>

        {/* 미리보기용 전체 템플릿(조항 포함·읽기전용) — 화면 밖에서 렌더 후 새 창으로 복제 */}
        {pvMount && (
          <div className="contract-print-source" aria-hidden style={{ position: 'fixed', left: '-99999px', top: 0, width: '900px', height: '1200px', pointerEvents: 'none', overflow: 'hidden' }}>
            <ContractDocumentEditor
              inline
              readOnly
              hideActions
              stage="본계약"
              value={docData}
              onChange={() => {}}
              initialData={{ docType: templateDocLabel, category: templateCategory, 입주권단계: ipjuStage }}
            />
          </div>
        )}
      </div>

      {/* 확인설명서 탭 (인라인 · 계약서 PK로 로드/저장) */}
      {docTab === '확인설명서' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', margin: '8px', border: '2px solid #334155', overflow: 'hidden' }}>
          {/* 확인설명서 종류 선택 (주거용 / 비주거용 / 토지용 / 입목용) — 탭 바로 아래 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', background: '#f8fafc', flexShrink: 0 }}>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827', marginRight: '4px' }}>확인설명서 종류</span>
            {['주거용', '비주거용', '토지용', '입목용'].map((t) => (
              <button key={t} type="button" onClick={() => setCeType(t)}
                style={{ padding: '7px 18px', fontSize: '14px', fontWeight: ceType === t ? 800 : 600, border: `1px solid ${ceType === t ? '#4f46e5' : '#cbd5e1'}`, borderRadius: '6px', background: ceType === t ? '#eef2ff' : '#fff', color: ceType === t ? '#4f46e5' : '#374151', cursor: 'pointer' }}>{t}</button>
            ))}
          </div>
          {ceType === '주거용' ? (
            ceLoaded ? (
              <ConfirmExplainForm inline initial={ceDraftRef.current || ceInitial} onSave={saveConfirmExplain} onChange={onCeChange} onPrint={openCePreview} onClose={() => setDocTab('계약서')} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>확인설명서 불러오는 중…</div>
            )
          ) : ceType === '비주거용' ? (
            ceLoaded ? (
              <ConfirmExplainFormII inline initial={ceDraftRef.current || ceInitial} onSave={saveConfirmExplain} onChange={onCeChange} onPrint={openCePreview} onClose={() => setDocTab('계약서')} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>확인설명서 불러오는 중…</div>
            )
          ) : ceType === '토지용' ? (
            ceLoaded ? (
              <ConfirmExplainFormIII inline initial={ceDraftRef.current || ceInitial} onSave={saveConfirmExplain} onChange={onCeChange} onPrint={openCePreview} onClose={() => setDocTab('계약서')} />
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>확인설명서 불러오는 중…</div>
            )
          ) : ceLoaded ? (
            <ConfirmExplainFormIV inline initial={ceDraftRef.current || ceInitial} onSave={saveConfirmExplain} onChange={onCeChange} onPrint={openCePreview} onClose={() => setDocTab('계약서')} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 600, color: '#64748b' }}>확인설명서 불러오는 중…</div>
          )}
        </div>
      )}

      {/* 개인정보활용동의서 탭 (인라인 · 최초 로드 후 마운트 유지) */}
      <div style={{ flex: 1, minHeight: 0, display: docTab === '개인정보활용동의서' ? 'flex' : 'none', flexDirection: 'column', margin: '8px', border: '2px solid #334155', overflow: 'hidden' }}>
        {privacyLoaded ? (
          <PrivacyConsentForm inline initial={privacyInitial} onSave={savePrivacy} onChange={onPrivacyChange} onClose={() => setDocTab('계약서')} />
        ) : (
          docTab === '개인정보활용동의서' && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#64748b' }}>불러오는 중…</div>
          )
        )}
      </div>

      {/* 부속문서 인앱 모달 (가계약 제외) — 새 창 대신 모달 + 상단 우측 닫기 */}
      {docModal && (
        <ContractDocModal
          type={docModal.type}
          data={docModal.data}
          masterId={masterId}
          userId={user?.userId}
          onClose={() => setDocModal(null)}
        />
      )}

      {/* 메인 계약서 미리보기·인쇄 — 새 창 대신 모달(iframe). iframe 내부 '인쇄'가 그 문서만 인쇄 */}
      {previewHtml && (
        <div onClick={() => setPreviewHtml(null)} style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '900px', maxWidth: '96vw', height: '92vh', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column' }}>
            <iframe title="계약서 미리보기" srcDoc={previewHtml} style={{ flex: 1, minHeight: 0, width: '100%', border: 'none' }} />
          </div>
        </div>
      )}
    </div>
  );
}
