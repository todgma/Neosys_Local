# 상담 관리 시스템 사용 가이드

## 개요
상담 관리 시스템은 고객, 물건, 협력업체 등과 관련된 상담 이력을 기록하고 관리하는 재사용 가능한 모듈입니다.

## 데이터베이스 스키마

### 테이블: Interview
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| itv_no | INT | 상담번호 (PK) |
| itv_type | VARCHAR | 상담유형 (ITVTYP01: 전화상담, ITVTYP02: 방문상담, ITVTYP03: 현장상담, ITVTYP04: 온라인상담) |
| itv_date | DATE | 상담일자 |
| cust_no | INT | 고객번호 (FK, nullable) |
| cust_name | VARCHAR | 고객명 |
| cust_phone | VARCHAR | 고객 연락처 |
| pt_no | INT | 물건번호 (FK, nullable) |
| itv_content | TEXT | 상담내용 |
| itv_memo | TEXT | 메모 |
| rt_no | INT | 직원번호 (FK, nullable) |
| off_no | INT | 지점번호 (FK, nullable) |
| vendor_id | INT | 협력업체ID (FK, nullable) |
| reg_dt | DATETIME | 등록일시 |
| reg_id | VARCHAR | 등록자ID |
| upd_dt | DATETIME | 수정일시 |
| upd_id | VARCHAR | 수정자ID |

## 컴포넌트 구조

### 1. ConsultationModal
상담 등록/수정을 위한 모달 컴포넌트

**위치**: `src/components/modals/ConsultationModal.jsx`

**Props**:
- `isOpen` (boolean): 모달 열림 상태
- `onClose` (function): 모달 닫기 콜백
- `onSuccess` (function): 저장 성공 시 콜백
- `editData` (object, optional): 수정할 상담 데이터
- `defaultData` (object, optional): 기본값 설정

**사용 예시**:
```jsx
import ConsultationModal from '../components/modals/ConsultationModal';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  // 신규 등록 (고객 정보 미리 설정)
  const defaultData = {
    custNo: 12345,
    custName: '홍길동',
    custPhone: '010-1234-5678'
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>상담 등록</button>

      <ConsultationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          console.log('상담이 저장되었습니다');
          setShowModal(false);
        }}
        defaultData={defaultData}
      />
    </>
  );
}
```

### 2. ConsultationHistoryPanel
상담 이력을 접이식 패널로 표시하는 컴포넌트

**위치**: `src/components/consultation/ConsultationHistoryPanel.jsx`

**Props**:
- `custNo` (number, optional): 고객번호로 필터링
- `ptNo` (number, optional): 물건번호로 필터링
- `vendorId` (number, optional): 협력업체ID로 필터링
- `defaultData` (object, optional): 신규 상담 등록 시 기본값
- `autoOpen` (boolean, optional): 자동으로 열림 여부 (기본값: false)

**사용 예시**:
```jsx
import ConsultationHistoryPanel from '../components/consultation/ConsultationHistoryPanel';

// 1. 고객 페이지에서 사용
function CustomerDetailPage({ customerId, customerName, customerPhone }) {
  const defaultData = {
    custNo: customerId,
    custName: customerName,
    custPhone: customerPhone
  };

  return (
    <div>
      <h1>고객 상세</h1>
      {/* 고객 정보 표시 */}

      {/* 상담 이력 패널 */}
      <ConsultationHistoryPanel
        custNo={customerId}
        defaultData={defaultData}
        autoOpen={true}
      />
    </div>
  );
}

// 2. 물건 페이지에서 사용
function PropertyDetailPage({ propertyId, propertyAddress }) {
  const defaultData = {
    ptNo: propertyId,
    ptAddress: propertyAddress
  };

  return (
    <div>
      <h1>물건 상세</h1>
      {/* 물건 정보 표시 */}

      {/* 상담 이력 패널 */}
      <ConsultationHistoryPanel
        ptNo={propertyId}
        defaultData={defaultData}
      />
    </div>
  );
}

// 3. 협력업체 페이지에서 사용
function VendorDetailPage({ vendorId, vendorName }) {
  const defaultData = {
    vendorId: vendorId,
    vendorName: vendorName
  };

  return (
    <div>
      <h1>협력업체 상세</h1>
      {/* 협력업체 정보 표시 */}

      {/* 상담 이력 패널 */}
      <ConsultationHistoryPanel
        vendorId={vendorId}
        defaultData={defaultData}
      />
    </div>
  );
}
```

### 3. 그리드와 함께 사용하기

그리드 우측에 접이식으로 상담 이력을 표시하는 예시:

```jsx
import { useState } from 'react';
import ConsultationHistoryPanel from '../components/consultation/ConsultationHistoryPanel';

function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  return (
    <div className="flex gap-4 h-screen">
      {/* 좌측: 물건 그리드 */}
      <div className="flex-1 overflow-auto">
        <h2>물건 목록</h2>
        <table>
          <thead>
            <tr>
              <th>물건번호</th>
              <th>주소</th>
              <th>가격</th>
            </tr>
          </thead>
          <tbody>
            {properties.map(property => (
              <tr
                key={property.ptNo}
                onClick={() => setSelectedProperty(property)}
                className={selectedProperty?.ptNo === property.ptNo ? 'bg-blue-50' : ''}
              >
                <td>{property.ptNo}</td>
                <td>{property.ptAddress}</td>
                <td>{property.ptPrice}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 우측: 상담 이력 패널 (물건 선택 시 표시) */}
      {selectedProperty && (
        <div className="w-96 overflow-auto border-l bg-gray-50 p-4">
          <h3 className="text-lg font-semibold mb-4">
            {selectedProperty.ptAddress}
          </h3>

          <ConsultationHistoryPanel
            ptNo={selectedProperty.ptNo}
            defaultData={{
              ptNo: selectedProperty.ptNo,
              ptAddress: selectedProperty.ptAddress
            }}
            autoOpen={true}
          />
        </div>
      )}
    </div>
  );
}
```

## API 서비스

### interviewService

**위치**: `src/services/interviewService.js`

#### 메서드

##### 1. getInterviewList(params)
상담 목록 조회

**Parameters**:
```javascript
{
  itvFrDate: '2024-01-01',      // 상담일자 시작 (필수)
  itvToDate: '2024-12-31',      // 상담일자 종료 (필수)
  itvNo: 123,                   // 상담번호 (선택)
  custName: '홍길동',            // 고객명 (선택)
  itvContent: '계약',            // 상담내용 (선택)
  itvMemo: '메모',              // 메모 (선택)
  vendorId: 456,                // 협력업체ID (선택)
  page: 1,                      // 페이지 번호 (기본값: 1)
  pageSize: 20                  // 페이지 크기 (기본값: 20)
}
```

**Returns**:
```javascript
{
  success: true,
  data: {
    interviews: [...],
    totalPages: 10
  }
}
```

##### 2. createInterview(data)
상담 등록

**Parameters**:
```javascript
{
  itvType: 'ITVTYP01',          // 상담유형 (필수)
  itvDate: '2024-01-01',        // 상담일자 (필수)
  custName: '홍길동',            // 고객명 (필수)
  custNo: 12345,                // 고객번호 (선택)
  custPhone: '010-1234-5678',   // 연락처 (선택)
  ptNo: 67890,                  // 물건번호 (선택)
  itvContent: '계약 상담',       // 상담내용 (선택)
  itvMemo: '추후 연락 예정',     // 메모 (선택)
  vendorId: 111,                // 협력업체ID (선택)
  rtNo: 222,                    // 직원번호 (선택)
  offNo: 333,                   // 지점번호 (선택)
  userId: 'user01'              // 사용자ID (선택)
}
```

##### 3. updateInterview(itvNo, data)
상담 수정

**Parameters**:
- `itvNo` (number): 상담번호
- `data` (object): 수정할 데이터 (createInterview와 동일한 구조, 모든 필드 선택)

##### 4. deleteInterview(itvNo, userId)
상담 삭제

**Parameters**:
- `itvNo` (number): 상담번호
- `userId` (string): 사용자ID

## 상담 유형 코드

| 코드 | 명칭 |
|------|------|
| ITVTYP01 | 전화상담 |
| ITVTYP02 | 방문상담 |
| ITVTYP03 | 현장상담 |
| ITVTYP04 | 온라인상담 |

## 통합 예시: 고객 관리 페이지

```jsx
import React, { useState, useEffect } from 'react';
import ConsultationModal from '../components/modals/ConsultationModal';
import ConsultationHistoryPanel from '../components/consultation/ConsultationHistoryPanel';

function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);

  const handleAddConsultation = () => {
    setShowConsultationModal(true);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex gap-4">
        {/* 좌측: 고객 목록 */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">고객 관리</h1>
            <button
              onClick={handleAddConsultation}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              상담 등록
            </button>
          </div>

          <table className="w-full">
            <thead>
              <tr>
                <th>고객번호</th>
                <th>고객명</th>
                <th>연락처</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr
                  key={customer.custNo}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedCustomer?.custNo === customer.custNo ? 'bg-blue-50' : ''
                  }`}
                >
                  <td>{customer.custNo}</td>
                  <td>{customer.custName}</td>
                  <td>{customer.custPhone}</td>
                  <td>{customer.regDt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 우측: 상담 이력 */}
        {selectedCustomer && (
          <div className="w-96">
            <ConsultationHistoryPanel
              custNo={selectedCustomer.custNo}
              defaultData={{
                custNo: selectedCustomer.custNo,
                custName: selectedCustomer.custName,
                custPhone: selectedCustomer.custPhone
              }}
              autoOpen={true}
            />
          </div>
        )}
      </div>

      {/* 상담 등록 모달 */}
      <ConsultationModal
        isOpen={showConsultationModal}
        onClose={() => setShowConsultationModal(false)}
        onSuccess={() => {
          setShowConsultationModal(false);
          // 목록 새로고침
        }}
        defaultData={
          selectedCustomer
            ? {
                custNo: selectedCustomer.custNo,
                custName: selectedCustomer.custName,
                custPhone: selectedCustomer.custPhone
              }
            : {}
        }
      />
    </div>
  );
}

export default CustomerManagementPage;
```

## TODO: 추가 구현 필요 사항

### 검색 모달 컴포넌트
현재 ConsultationModal에서 고객/물건/협력업체 검색 모달은 플레이스홀더로만 구현되어 있습니다.
다음 컴포넌트들을 추가로 구현해야 합니다:

1. **CustomerSearchModal** (`src/components/modals/CustomerSearchModal.jsx`)
   - 고객 검색 및 선택 기능
   - 고객명, 연락처로 검색
   - 선택 시 콜백으로 고객 정보 반환

2. **PropertySearchModal** (`src/components/modals/PropertySearchModal.jsx`)
   - 물건 검색 및 선택 기능
   - 주소, 물건번호로 검색
   - 선택 시 콜백으로 물건 정보 반환

3. **VendorSearchModal** (`src/components/modals/VendorSearchModal.jsx`)
   - 협력업체 검색 및 선택 기능
   - 업체명, 사업자번호로 검색
   - 선택 시 콜백으로 협력업체 정보 반환

### API 개선 사항
- 현재 API에서 `custNo`, `ptNo`로 직접 필터링이 불가능합니다.
- 백엔드 API에 해당 파라미터 추가가 필요할 수 있습니다.
- 또는 클라이언트에서 전체 조회 후 필터링하는 현재 방식 유지

## 문의
추가 기능이나 개선사항이 필요한 경우 개발팀에 문의하세요.
