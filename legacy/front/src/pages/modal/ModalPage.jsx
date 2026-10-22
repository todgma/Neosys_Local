import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import CustomerFormPageV2 from '../customers/CustomerFormPageV2';
import LayoutViewPopup from '../../components/properties/LayoutViewPopup';
import ReportBuilderModal from '../../components/reports/ReportBuilderModal';
import PropertyFormPage from '../properties/PropertyFormPage';
import PropertyFormPageV2 from '../properties/PropertyFormPageV2';
import PropertyDetailPage from '../properties/PropertyDetailPage';
import PropertyBriefingPage from '../properties/PropertyBriefingPage';
import HubFormPage from '../hub/HubFormPage';
import DataUploadPage from '../upload/DataUploadPage';
import ContractDocumentEditor from '../../components/contracts/ContractDocumentEditor';
import PreContractSmsModal from '../../components/contracts/PreContractSmsModal';
import TaxArrearsViewForm from '../../components/contracts/TaxArrearsViewForm';
import TaxNationalArrearsViewForm from '../../components/contracts/TaxNationalArrearsViewForm';
import RentDepositPartialConsentForm from '../../components/contracts/RentDepositPartialConsentForm';
import RentDepositNonSubscriptionConsentForm from '../../components/contracts/RentDepositNonSubscriptionConsentForm';
import RentInfoRequestForm from '../../components/contracts/RentInfoRequestForm';
import CommercialRentInfoRequestForm from '../../components/contracts/CommercialRentInfoRequestForm';
import ResidentTransferConfirmForm from '../../components/contracts/ResidentTransferConfirmForm';
import SpecialClauseManager from '../../components/contracts/SpecialClauseManager';
import SettlementPrepModal, { EMPTY_PREP_DATA } from '../../components/contracts/SettlementPrepModal';
import PrivacyConsentForm from '../../components/contracts/PrivacyConsentForm';
import ReceiptForm from '../../components/contracts/ReceiptForm';
import ReturnReceiptForm from '../../components/contracts/ReturnReceiptForm';
import UtilitySettlementForm from '../../components/contracts/UtilitySettlementForm';
import BalanceSettlementForm from '../../components/contracts/BalanceSettlementForm';
import BrokerFeeReceiptForm from '../../components/contracts/BrokerFeeReceiptForm';
import LandFundPlanForm from '../../components/contracts/LandFundPlanForm';
import HousingFundPlanForm from '../../components/contracts/HousingFundPlanForm';
import SmsManagerModal from '../../components/sms/SmsManagerModal';
import SmsNewGroupForm from '../../components/sms/SmsNewGroupForm';
import CommunityBoard from '../../components/community/CommunityBoard';
import VendorModal from '../../components/partners/VendorModal';
import { vendorService } from '../../services/vendorService';
import { contractApiService } from '../../services/contractApiService';
import WindowModal from '../../components/ui/WindowModal';
import SignupPage from '../auth/SignupPage';
import MembershipSubscribeModal from '../../components/dashboard/MembershipSubscribeModal';
import FreeMonthsModal from '../../components/dashboard/FreeMonthsModal';
import ReferralListModal from '../../components/dashboard/ReferralListModal';
import EventParticipationModal from '../../components/dashboard/EventParticipationModal';
import RemoteSupportModal from '../../components/dashboard/RemoteSupportModal';

/**
 * 모달 전용 페이지
 * 새 윈도우에서 모달 컴포넌트를 렌더링
 */
const ModalPage = () => {
  const { type } = useParams();
  const [searchParams] = useSearchParams();
  const modalId = searchParams.get('modalId');
  const initDataParam = searchParams.get('initData');

  const [modalData, setModalData] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // URL 파라미터에서 직접 데이터 읽기
    if (initDataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(initDataParam));
        console.log('Modal init data from URL:', decoded);
        setModalData(decoded);
        setIsReady(true);
      } catch (error) {
        console.error('Failed to parse init data from URL:', error);
      }
    }

    // Fallback: IPC 통신으로 데이터 받기
    if (window.electronAPI?.modal) {
      const cleanup = window.electronAPI.modal.onInit((data) => {
        console.log('Modal init data from IPC:', data);
        setModalData(data);
        setIsReady(true);
      });

      return cleanup;
    }
  }, [initDataParam]);

  // 창이 닫힐 때 부모 창에 알림 (백업 방법)
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('Modal window closing, notifying parent');
      if (window.electronAPI?.modal && modalId) {
        // 메인 창에 닫힘 이벤트 직접 전송
        window.electronAPI.modal.sendToMain({
          modalId,
          type: modalData?.type,
          eventName: 'windowClosing',
          data: { modalId },
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [modalId, modalData?.type]);

  // 타이틀 업데이트
  useEffect(() => {
    const title = modalData?.data?.title;
    if (title) {
      document.title = title;
    }
  }, [modalData?.data?.title]);

  // 데이터 업데이트 이벤트 수신
  useEffect(() => {
    if (!window.electronAPI?.modal?.onDataUpdated) {
      console.log('onDataUpdated not available');
      return;
    }

    const cleanup = window.electronAPI.modal.onDataUpdated(({ data }) => {
      console.log('=== Modal data update received ===');
      console.log('New data:', data);
      console.log('Previous modalData:', modalData);

      // 기존 modalData의 data 부분만 업데이트
      setModalData((prev) => {
        const updated = {
          ...prev,
          data: {
            ...prev?.data,
            ...data,
          },
        };
        console.log('Updated modalData:', updated);
        return updated;
      });
    });

    return cleanup;
  }, []);

  const handleClose = () => {
    if (window.electronAPI?.modal) {
      // preload: close(modalId) → invoke('modal:close', { modalId }). 문자열 id를 그대로 전달해야 함
      window.electronAPI.modal.close(modalId);
    }
  };

  const handleSuccess = (result) => {
    // 메인 창으로 성공 이벤트 전송
    if (window.electronAPI?.modal) {
      window.electronAPI.modal.sendToMain({
        modalId,
        type,
        eventName: 'success',
        data: result,
      });
    }
    // 성공 후 자동으로 닫지 않음 - 각 컴포넌트에서 필요시 onClose 호출
  };

  // ── 계약 부속문서(masterId+docKind) 백엔드 조회/저장 ──
  const docMasterId = modalData?.data?.masterId || null;
  const docKind = modalData?.data?.docKind || null;
  const [docInitial, setDocInitial] = useState(null);
  useEffect(() => {
    if (!docMasterId || !docKind) return;
    (async () => {
      try {
        const data = await contractApiService.getDocument(docMasterId, docKind);
        if (data) setDocInitial(data);
      } catch (error) {
        console.error('부속문서 조회 실패:', error);
      }
    })();
  }, [docMasterId, docKind]);
  // 저장: 같은 masterId+kind로 upsert(마스터 없으면 서버에서 lazy 생성) → 성공 후 창 닫기
  const saveDoc = async (formData) => {
    if (!docMasterId || !docKind) return false;
    try {
      await contractApiService.saveDocument(docMasterId, docKind, formData, modalData?.data?.userId || null, modalData?.data?.meta || null);
      handleSuccess({ docKind });
      handleClose();
      return true;
    } catch (error) {
      console.error('부속문서 저장 실패:', error);
      return false;
    }
  };

  // editData를 useMemo로 메모이제이션하여 ptNo 변경시에만 새 객체 생성
  const propertyEditData = useMemo(() => {
    const ptNo = modalData?.data?.ptNo;
    console.log('PropertyEditData memo updated, ptNo:', ptNo);
    // ptNo가 있으면 { ptNo } 객체 반환 (수정 모드)
    // ptNo가 없거나 null이면 null 반환 (신규 등록 모드)
    if (ptNo) {
      return { ptNo };
    }
    return null;
  }, [modalData?.data?.ptNo]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 모달 타입에 따라 렌더링
  const renderModal = () => {
    switch (type) {
      case 'customer':
        return (
          <CustomerFormPageV2
            key={modalData?.data?.editData?.custNo || (modalData?.data?.copyData ? 'copy' : 'new')}
            isOpen={true}
            onClose={handleClose}
            onSuccess={handleSuccess}
            editData={modalData?.data?.editData}
            copyData={modalData?.data?.copyData}
          />
        );

      case 'property':
        return (
          <PropertyFormPage
            onClose={handleClose}
            onSuccess={handleSuccess}
            editData={modalData?.data?.editData}
          />
        );

      case 'property-view':
        return (
          <PropertyDetailPage
            onClose={handleClose}
            property={modalData?.data?.property}
            onEdit={(property) => {
              // 메인 창으로 이벤트를 보내서 수정 모달을 열도록 요청
              if (window.electronAPI?.modal) {
                console.log('Requesting edit modal for property:', property);

                // 메인 창으로 edit 이벤트 전송
                window.electronAPI.modal.sendToMain({
                  modalId,
                  type: 'property-view',
                  eventName: 'edit',
                  data: property,
                });

                // 현재 창 닫기
                handleClose();
              }
            }}
          />
        );

      case 'property-briefing':
        return (
          <PropertyBriefingPage
            onClose={handleClose}
            property={modalData?.data?.property}
          />
        );

      case 'property-form':
        return (
          <PropertyFormPage
            key={modalData?.data?.ptNo || 'new'} // ptNo 변경시 컴포넌트 리마운트
            onClose={handleClose}
            onSuccess={handleSuccess}
            editData={propertyEditData}
          />
        );

      case 'layout-view':
        return (
          <LayoutViewPopup
            isOpen={true}
            onClose={handleClose}
          />
        );

      case 'report-builder':
        return (
          <ReportBuilderModal
            isOpen={true}
            onClose={handleClose}
            property={modalData?.data?.property || null}
            properties={modalData?.data?.properties || null}
            customer={modalData?.data?.customer || null}
            reportNo={modalData?.data?.reportNo || null}
            onSaved={handleSuccess}
          />
        );

      case 'property-form-v2':
        return (
          <PropertyFormPageV2
            key={modalData?.data?.ptNo || (modalData?.data?.copyData ? 'copy' : 'new')} // ptNo 변경시 컴포넌트 리마운트
            onClose={handleClose}
            onSuccess={handleSuccess}
            editData={propertyEditData}
            copyData={modalData?.data?.copyData}
            lockAddress={modalData?.data?.lockAddress}
            lockType={modalData?.data?.lockType}
            lockFloor={modalData?.data?.lockFloor}
            defaultPtType={modalData?.data?.defaultPtType}
          />
        );

      case 'hub-form':
        return (
          <HubFormPage
            modalData={modalData?.data}
            onClose={handleClose}
            onSuccess={handleSuccess}
          />
        );

      case 'data-upload':
        return (
          <DataUploadPage
            onClose={handleClose}
            onSuccess={handleSuccess}
            target={modalData?.data?.target || null}
          />
        );

      case 'contract-editor':
        return (
          <ContractDocumentEditor
            initialData={modalData?.data?.editData || (modalData?.data?.docType ? { docType: modalData.data.docType } : null)}
            onClose={handleClose}
          />
        );

      case 'pre-contract':
        return (
          <PreContractSmsModal
            // 저장분(docInitial)은 마운트 후 비동기 로드 → 도착 시 리마운트하여 initial 반영
            key={docInitial ? 'loaded' : 'empty'}
            page
            onClose={handleClose}
            defaults={modalData?.data?.defaults || {}}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'tax-arrears-view':
        return (
          <TaxArrearsViewForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'tax-national-view':
        return (
          <TaxNationalArrearsViewForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'rent-deposit-consent':
        return (
          <RentDepositPartialConsentForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'rent-deposit-noninsure':
        return (
          <RentDepositNonSubscriptionConsentForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'rent-info-request':
        return (
          <RentInfoRequestForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'rent-info-request-commercial':
        return (
          <CommercialRentInfoRequestForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'resident-transfer-confirm':
        return (
          <ResidentTransferConfirmForm
            onClose={handleClose}
            initial={docInitial ?? (modalData?.data?.initial || null)}
            onSave={saveDoc}
          />
        );

      case 'special-clause-manager':
        return (
          <SpecialClauseManager page onClose={handleClose} />
        );

      case 'settlement-prep':
        return (
          <SettlementPrepModal page onClose={handleClose} initial={docInitial} onSave={saveDoc} />
        );

      case 'contract-prep':
        return (
          <SettlementPrepModal page onClose={handleClose} title="계약시 준비사항" storeKey="contractPrepData_v1" defaultData={EMPTY_PREP_DATA} initial={docInitial} onSave={saveDoc} />
        );

      case 'privacy-consent':
        return (
          <PrivacyConsentForm onClose={handleClose} initial={docInitial ?? (modalData?.data?.initial || null)} onSave={saveDoc} />
        );

      case 'signup':
        return (
          <SignupPage onClose={handleClose} />
        );

      case 'membership-subscribe':
        return (
          <MembershipSubscribeModal
            page
            offNo={modalData?.data?.offNo}
            userId={modalData?.data?.userId}
            onClose={handleClose}
            onSubscribed={() => { try { localStorage.setItem('membershipSubscribed', '1'); } catch { /* noop */ } handleSuccess({ subscribed: true }); }}
          />
        );

      case 'sms-manager':
        return (
          <SmsManagerModal page onClose={handleClose} />
        );

      case 'sms-new-group':
        return (
          <SmsNewGroupForm page onClose={handleClose} onCreated={() => handleSuccess({ created: true })} />
        );

      case 'remote-support':
        return (
          <RemoteSupportModal page onClose={handleClose} />
        );

      case 'free-months':
        return (
          <FreeMonthsModal page onClose={handleClose} offNo={modalData?.data?.offNo} />
        );

      case 'referral-list':
        return (
          <ReferralListModal page onClose={handleClose} rtNo={modalData?.data?.rtNo ?? null} referredUsers={modalData?.data?.referredUsers || []} />
        );

      case 'event-participation':
        return (
          <EventParticipationModal
            page
            onClose={handleClose}
            variant={modalData?.data?.variant || 'mission'}
            userId={modalData?.data?.userId}
            offNo={modalData?.data?.offNo}
            rtNo={modalData?.data?.rtNo}
            userNm={modalData?.data?.userNm}
          />
        );

      case 'utility-settlement':
        return (
          <UtilitySettlementForm page onClose={handleClose} title="공과금 등 정산서" defaults={modalData?.data?.defaults || {}} initial={docInitial} onSave={saveDoc} />
        );

      case 'receipt-form':
        return (
          <ReceiptForm page onClose={handleClose} title={modalData?.data?.title || '영수증'} initial={docInitial} onSave={saveDoc} />
        );

      case 'return-receipt':
        return (
          <ReturnReceiptForm page onClose={handleClose} title={modalData?.data?.title || '반환금 영수증'} defaults={modalData?.data?.defaults || null} initial={docInitial} onSave={saveDoc} />
        );

      case 'balance-settlement':
        return (
          <BalanceSettlementForm page onClose={handleClose} title="잔금 정산서" defaults={modalData?.data?.defaults || {}} initial={docInitial} onSave={saveDoc} />
        );

      case 'broker-fee-receipt':
        return (
          <BrokerFeeReceiptForm page onClose={handleClose} title="중개보수 영수증" defaults={modalData?.data?.defaults || {}} initial={docInitial} onSave={saveDoc} />
        );

      case 'land-fund-plan':
        return (
          <LandFundPlanForm page onClose={handleClose} title="토지취득자금 조달계획서" defaults={modalData?.data?.defaults || {}} initial={docInitial} onSave={saveDoc} />
        );

      case 'housing-fund-plan':
        return (
          <HousingFundPlanForm page onClose={handleClose} title="주택취득자금 조달 및 입주계획서" defaults={modalData?.data?.defaults || {}} initial={docInitial} onSave={saveDoc} />
        );

      case 'community':
        return (
          <CommunityBoard page onClose={handleClose} title={modalData?.data?.title || '커뮤니티'} initialTab={modalData?.data?.initialTab} initialPostId={modalData?.data?.initialPostId} single={modalData?.data?.single} />
        );

      case 'vendor-form': {
        const vendorEdit = modalData?.data?.editData || null;
        const saveVendor = async (form) => {
          // form.vendorId: VendorModal이 신규 저장 후 추적한 id(재저장 시 update 처리 → 중복 생성 방지)
          let vendorId = form?.vendorId || vendorEdit?.vendorId || null;
          if (vendorId) await vendorService.updateVendor(vendorId, form);
          else { const res = await vendorService.createVendor(form); vendorId = res?.vendorId || null; }
          handleSuccess();
          // 저장해도 창은 닫지 않음(물건폼 로직). 신규/갱신된 vendorId 반환
          return vendorId;
        };
        return (
          <VendorModal isOpen={true} embedded onClose={handleClose} onSave={saveVendor} vendor={vendorEdit} />
        );
      }

      default:
        return (
          <div className="flex items-center justify-center h-screen">
            <div className="text-red-500">알 수 없는 모달 타입: {type}</div>
          </div>
        );
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          /* 모달의 overlay를 숨기기 위한 스타일 */
          .cus-modal-overlay,
          .modal-overlay {
            background-color: transparent !important;
            position: relative !important;
          }
          .cus-modal-container,
          .modal-container {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
          }
        `
      }} />
      <div className="h-screen w-screen overflow-hidden bg-white">
        {renderModal()}
      </div>
    </>
  );
};

export default ModalPage;
