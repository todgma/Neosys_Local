import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { contractApiService } from '../../services/contractApiService';
import DocModalShell from './DocModalShell';
import { printElement } from '../../utils/printDoc';
import TaxArrearsViewForm from './TaxArrearsViewForm';
import TaxNationalArrearsViewForm from './TaxNationalArrearsViewForm';
import RentDepositPartialConsentForm from './RentDepositPartialConsentForm';
import RentDepositNonSubscriptionConsentForm from './RentDepositNonSubscriptionConsentForm';
import RentInfoRequestForm from './RentInfoRequestForm';
import CommercialRentInfoRequestForm from './CommercialRentInfoRequestForm';
import ResidentTransferConfirmForm from './ResidentTransferConfirmForm';
import ContractRenewalConfirmForm from './ContractRenewalConfirmForm';
import SettlementPrepModal, { EMPTY_PREP_DATA } from './SettlementPrepModal';
import ReceiptForm from './ReceiptForm';
import ReturnReceiptForm from './ReturnReceiptForm';
import UtilitySettlementForm from './UtilitySettlementForm';
import BalanceSettlementForm from './BalanceSettlementForm';
import BrokerFeeReceiptForm from './BrokerFeeReceiptForm';
import LandFundPlanForm from './LandFundPlanForm';
import HousingFundPlanForm from './HousingFundPlanForm';
import HousingLeaseReportForm from './HousingLeaseReportForm';

/**
 * 계약서 작성 화면의 각종 부속문서 — 새 창(Electron) 대신 인앱 모달로 렌더.
 *  · masterId + docKind 로 백엔드 조회/저장(ModalPage.saveDoc과 동일 경로)
 *  · 상단 우측 고정 '닫기' 버튼 제공. (가계약은 제외 — 기존 새 창 유지)
 */
export default function ContractDocModal({ type, data = {}, masterId, userId, onClose }) {
  const docKind = data?.docKind || null;
  const [docInitial, setDocInitial] = useState(null);

  useEffect(() => {
    if (!masterId || !docKind) return;
    let alive = true;
    (async () => {
      try { const d = await contractApiService.getDocument(masterId, docKind); if (alive && d) setDocInitial(d); }
      catch (e) { console.error('부속문서 조회 실패:', e); }
    })();
    return () => { alive = false; };
  }, [masterId, docKind]);

  const saveDoc = async (formData) => {
    if (!masterId || !docKind) { toast.error('저장 대상이 없습니다.'); return false; }
    try {
      await contractApiService.saveDocument(masterId, docKind, formData, userId || null, data?.meta || null);
      toast.success('저장되었습니다.');
      return true;
    } catch (e) { console.error('부속문서 저장 실패:', e); toast.error('저장에 실패했습니다.'); return false; }
  };

  const init = docInitial ?? (data?.initial || null);
  const defaults = data?.defaults || {};

  // 거래관련서식 — 계약서 미리보기와 동일한 상단 다크바(DocModalShell)로 통일.
  //  · taf 계열(세금/임대차/전입세대): 자체 .taf-bar를 CSS로 숨기고 window.print()/저장버튼 클릭으로 위임
  //  · 자금조달계획서(토지/주택): embedded 모드 + onReady로 인쇄(미리보기)/저장 위임
  const TAF_TRADE_FORMS = new Set([
    'tax-arrears-view', 'tax-national-view', 'rent-deposit-consent', 'rent-deposit-noninsure',
    'rent-info-request', 'rent-info-request-commercial', 'resident-transfer-confirm',
    'contract-renewal-confirm', 'housing-lease-report',
  ]);
  const FUND_TRADE_FORMS = new Set(['land-fund-plan', 'housing-fund-plan']);
  const docName = data?.title || (docKind ? String(docKind).split(':').pop() : '문서');
  const shellRef = useRef(null);   // taf 계열: 숨긴 저장버튼 클릭용
  const fundApi = useRef({});      // 자금조달: { print, save } 등록

  // 자체 모달(어두운 배경+중앙 카드+상단바 타이틀/닫기)을 이미 갖춘 서식 — 래퍼 없이 그대로 렌더
  const SELF_MODAL = new Set([
    'settlement-prep', 'contract-prep', 'utility-settlement', 'receipt-form',
    'balance-settlement',
  ]);

  const body = () => {
    switch (type) {
      case 'tax-arrears-view': return <TaxArrearsViewForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'tax-national-view': return <TaxNationalArrearsViewForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'rent-deposit-consent': return <RentDepositPartialConsentForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'rent-deposit-noninsure': return <RentDepositNonSubscriptionConsentForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'rent-info-request': return <RentInfoRequestForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'rent-info-request-commercial': return <CommercialRentInfoRequestForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'resident-transfer-confirm': return <ResidentTransferConfirmForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'contract-renewal-confirm': return <ContractRenewalConfirmForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'housing-lease-report': return <HousingLeaseReportForm onClose={onClose} initial={init} onSave={saveDoc} />;
      case 'settlement-prep': return <SettlementPrepModal onClose={onClose} initial={docInitial} onSave={saveDoc} />;
      case 'contract-prep': return <SettlementPrepModal onClose={onClose} title="계약시 준비사항" storeKey="contractPrepData_v1" defaultData={EMPTY_PREP_DATA} initial={docInitial} onSave={saveDoc} />;
      case 'utility-settlement': return <UtilitySettlementForm onClose={onClose} title="공과금 등 정산서" defaults={defaults} initial={docInitial} onSave={saveDoc} />;
      case 'receipt-form': return <ReceiptForm onClose={onClose} title={data?.title || '영수증'} initial={docInitial} onSave={saveDoc} />;
      case 'return-receipt': return <ReturnReceiptForm page onClose={onClose} title={data?.title || '반환금 영수증'} defaults={data?.defaults || null} initial={docInitial} onSave={saveDoc} />;
      case 'balance-settlement': return <BalanceSettlementForm onClose={onClose} title="잔금 정산서" defaults={defaults} initial={docInitial} onSave={saveDoc} />;
      case 'broker-fee-receipt': return <BrokerFeeReceiptForm page onClose={onClose} title="중개보수 영수증" defaults={defaults} initial={docInitial} onSave={saveDoc} />;
      case 'land-fund-plan': return <LandFundPlanForm embedded onReady={(a) => { fundApi.current = a || {}; }} onClose={onClose} title="토지취득자금 조달계획서" defaults={defaults} initial={docInitial} onSave={saveDoc} />;
      case 'housing-fund-plan': return <HousingFundPlanForm embedded onReady={(a) => { fundApi.current = a || {}; }} onClose={onClose} title="주택취득자금 조달 및 입주계획서" defaults={defaults} initial={docInitial} onSave={saveDoc} />;
      default: return <div style={{ padding: '40px', fontSize: '14px', color: '#64748b' }}>지원하지 않는 문서입니다.</div>;
    }
  };

  // 거래관련서식 — 계약서 미리보기와 동일한 상단 다크바로 통일(자체 상단바는 숨김/교체)
  if (TAF_TRADE_FORMS.has(type) || FUND_TRADE_FORMS.has(type)) {
    const isFund = FUND_TRADE_FORMS.has(type);
    // taf 계열: window.print()는 빈화면 → 영수증 서식처럼 미리보기 DOM+폼 CSS로 자체완결 인쇄
    const doPrint = () => {
      if (isFund) { fundApi.current.print?.(); return; }
      const root = shellRef.current?.querySelector('.taf-root, .pcf-root');
      if (!root) { window.print(); return; }
      const css = root.querySelector('style')?.textContent || '';
      printElement(root, css, docName);
    };
    const doSave = () => {
      if (isFund) { fundApi.current.save?.(); return; }
      // taf 계열: 숨겨진 자체 '저장' 버튼을 프로그램적으로 클릭
      const btns = shellRef.current?.querySelectorAll('.taf-bar button, .pcf-bar button') || [];
      const s = Array.from(btns).find((b) => (b.textContent || '').trim() === '저장');
      s?.click();
    };
    return (
      <DocModalShell title={docName} onClose={onClose} onSave={doSave} onPrint={doPrint}>
        <div ref={shellRef}>
          {/* 자체 상단바(.taf-bar/.pcf-bar) 숨김 + 오버레이 루트를 인라인으로 */}
          <style>{`
            .taf-bar, .pcf-bar { display: none !important; }
            .taf-root, .pcf-root { position: static !important; inset: auto !important; height: auto !important; min-height: 0 !important; background: #f1f5f9 !important; overflow: visible !important; }
          `}</style>
          {body()}
        </div>
      </DocModalShell>
    );
  }

  // 자체 모달을 가진 서식은 래퍼 없이 그대로 (배경/중앙카드/상단바 타이틀·닫기 내장)
  if (SELF_MODAL.has(type)) return body();

  // 그 외(항상 전체화면 오버레이형: 반환금/중개보수/세금/임대차) — 어두운 배경 + 중앙 카드로 감싸고,
  // 서식 자체 상단바(타이틀 + 저장/인쇄/닫기)가 모달 헤더 역할. 별도 플로팅 닫기 없음.
  return (
    <div onClick={onClose} className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div onClick={(e) => e.stopPropagation()} className="doc-modal-embed" style={{ position: 'relative', width: '920px', maxWidth: '96vw', height: '90vh', background: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 44px rgba(0,0,0,0.32)', display: 'flex', flexDirection: 'column' }}>
        {/* 세금/임대차 등 position:fixed 오버레이 서식을 카드 안에 가두기 */}
        <style>{`
          .doc-modal-embed .taf-root,
          .doc-modal-embed .pcf-root { position: relative !important; inset: auto !important; height: 100%; }
        `}</style>
        {body()}
      </div>
    </div>
  );
}
