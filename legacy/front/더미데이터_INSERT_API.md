# 더미 데이터 INSERT API

## 개요
로컬 테스트용 더미 매물 데이터 3건을 등록하는 API 요청입니다.

---

## 1. 강남 오피스텔 (SYCA102)

### Endpoint
```
POST http://localhost:5000/api/property
```

### Request Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "PtName": "강남역 센트럴오피스텔 501호",
  "PrgSts": "PRGSTS02",
  "PtSts": "PTSTS01",
  "PtType": "SYCA102",
  "PtExpl": "강남역 도보 3분, 신축 오피스텔",
  "SaleDiv": "SALEDIV02",
  "Addr1": "서울특별시",
  "Addr2": "강남구",
  "Addr3": "역삼동",
  "Addr4": "테헤란로 123",
  "Addr5": "센트럴빌딩 5층 501호",
  "AddrPost": "06234",
  "BjdCode": "1168010100",
  "DanjiCode": "",
  "Dong": "",
  "Ho": "501",
  "Floor": 5,
  "Opt": "풀옵션",
  "HouseCnt": 200,
  "AptTyp": "29A",
  "SupArea": 29.75,
  "ExcArea": 19.8,
  "LandShare": 8.5,
  "RoomCnt": 1,
  "BathCnt": 1,
  "DirStd": "남향",
  "HeatMethod": "개별난방",
  "HeatFuel": "도시가스",
  "EntrStruct": "복도식",
  "BuidStruct": "철근콘크리트",
  "BalcExt": "N",
  "Floor1": 5,
  "Floor2": 15,
  "PkCnt": 0.3,
  "MaintCost": 80000,
  "MaintDtl": "관리비, 인터넷 포함",
  "SaleAmt": 0,
  "LesAmt": 15000,
  "ProtAmt": 0,
  "MonAmt": 0,
  "EtcAmt": 0,
  "LayAmt": 0,
  "NowDepAmt": 0,
  "NowMonAmt": 0,
  "LoanAmt": 0,
  "LoanAmtAft": 0,
  "MtryDate": "",
  "ExptMovDate": "2025-04-01",
  "ExptDate": "",
  "ExptComDate": "",
  "CompYear": "2023",
  "ShaYn": "N",
  "CustNo": null,
  "OffNo": 100000009,
  "RtNo": "300000002",
  "MvnPsbYn": "Y",
  "HouseRental": "N",
  "PetYn": "N",
  "Top": "N",
  "PtMemo": "역세권 신축 오피스텔, 즉시입주 가능",
  "UserId": "admin",
  "Holders": []
}
```

---

## 2. 서초 상가 (SYCA113)

### Endpoint
```
POST http://localhost:5000/api/property
```

### Request Body
```json
{
  "PtName": "서초동 1층 근린상가",
  "PrgSts": "PRGSTS02",
  "PtSts": "PTSTS01",
  "PtType": "SYCA113",
  "PtExpl": "유동인구 많은 대로변 상가",
  "SaleDiv": "SALEDIV03",
  "Addr1": "서울특별시",
  "Addr2": "서초구",
  "Addr3": "서초동",
  "Addr4": "서초대로 456-7",
  "Addr5": "서초타워 1층 103호",
  "AddrPost": "06590",
  "BjdCode": "1165010100",
  "DanjiCode": "",
  "Dong": "",
  "Ho": "",
  "Floor": 1,
  "Opt": "냉난방기",
  "HouseCnt": null,
  "AptTyp": "",
  "SupArea": 45.5,
  "ExcArea": 42.3,
  "LandShare": 15.2,
  "RoomCnt": 0,
  "BathCnt": 1,
  "DirStd": "남동향",
  "HeatMethod": "중앙난방",
  "HeatFuel": "도시가스",
  "EntrStruct": "계단식",
  "BuidStruct": "철근콘크리트",
  "BalcExt": "N",
  "Floor1": 1,
  "Floor2": 10,
  "PkCnt": 1.0,
  "MaintCost": 150000,
  "MaintDtl": "관리비, 주차비 별도",
  "SaleAmt": 0,
  "LesAmt": 30000,
  "ProtAmt": 0,
  "MonAmt": 250,
  "EtcAmt": 0,
  "LayAmt": 0,
  "NowDepAmt": 0,
  "NowMonAmt": 0,
  "LoanAmt": 0,
  "LoanAmtAft": 0,
  "MtryDate": "",
  "ExptMovDate": "2025-04-15",
  "ExptDate": "",
  "ExptComDate": "",
  "CompYear": "2018",
  "ShaYn": "N",
  "CustNo": null,
  "OffNo": 100000009,
  "RtNo": "300000002",
  "MvnPsbYn": "N",
  "HouseRental": "N",
  "PetYn": "N",
  "Top": "N",
  "PtMemo": "대로변 코너 상가, 유동인구 우수",
  "UserId": "admin",
  "Holders": []
}
```

---

## 3. 송파 빌라 (SYCA118)

### Endpoint
```
POST http://localhost:5000/api/property
```

### Request Body
```json
{
  "PtName": "잠실 신축빌라 201호",
  "PrgSts": "PRGSTS02",
  "PtSts": "PTSTS01",
  "PtType": "SYCA118",
  "PtExpl": "신축 빌라, 풀옵션, 주차 2대 가능",
  "SaleDiv": "SALEDIV01",
  "Addr1": "서울특별시",
  "Addr2": "송파구",
  "Addr3": "잠실동",
  "Addr4": "88-15",
  "Addr5": "잠실그린빌라 2층 201호",
  "AddrPost": "05554",
  "BjdCode": "1171010100",
  "DanjiCode": "",
  "Dong": "",
  "Ho": "201",
  "Floor": 2,
  "Opt": "풀옵션",
  "HouseCnt": 8,
  "AptTyp": "",
  "SupArea": 59.5,
  "ExcArea": 49.8,
  "LandShare": 25.3,
  "RoomCnt": 3,
  "BathCnt": 2,
  "DirStd": "남향",
  "HeatMethod": "개별난방",
  "HeatFuel": "도시가스",
  "EntrStruct": "계단식",
  "BuidStruct": "철근콘크리트",
  "BalcExt": "Y",
  "Floor1": 2,
  "Floor2": 4,
  "PkCnt": 2.0,
  "MaintCost": 50000,
  "MaintDtl": "관리비 별도",
  "SaleAmt": 55000,
  "LesAmt": 0,
  "ProtAmt": 0,
  "MonAmt": 0,
  "EtcAmt": 0,
  "LayAmt": 0,
  "NowDepAmt": 0,
  "NowMonAmt": 0,
  "LoanAmt": 0,
  "LoanAmtAft": 0,
  "MtryDate": "",
  "ExptMovDate": "2025-05-01",
  "ExptDate": "",
  "ExptComDate": "",
  "CompYear": "2024",
  "ShaYn": "N",
  "CustNo": null,
  "OffNo": 100000009,
  "RtNo": "300000002",
  "MvnPsbYn": "Y",
  "HouseRental": "Y",
  "PetYn": "Y",
  "Top": "N",
  "PtMemo": "신축 빌라, 반려동물 가능, 전세자금대출 가능",
  "UserId": "admin",
  "Holders": []
}
```

---

## cURL 명령어

### 1. 강남 오피스텔
```bash
curl -X POST http://localhost:5000/api/property \
  -H "Content-Type: application/json" \
  -d '{
    "PtName": "강남역 센트럴오피스텔 501호",
    "PrgSts": "PRGSTS02",
    "PtSts": "PTSTS01",
    "PtType": "SYCA102",
    "PtExpl": "강남역 도보 3분, 신축 오피스텔",
    "SaleDiv": "SALEDIV02",
    "Addr1": "서울특별시",
    "Addr2": "강남구",
    "Addr3": "역삼동",
    "Addr4": "테헤란로 123",
    "Addr5": "센트럴빌딩 5층 501호",
    "AddrPost": "06234",
    "BjdCode": "1168010100",
    "Floor": 5,
    "Opt": "풀옵션",
    "HouseCnt": 200,
    "AptTyp": "29A",
    "SupArea": 29.75,
    "ExcArea": 19.8,
    "RoomCnt": 1,
    "BathCnt": 1,
    "DirStd": "남향",
    "HeatMethod": "개별난방",
    "HeatFuel": "도시가스",
    "EntrStruct": "복도식",
    "BuidStruct": "철근콘크리트",
    "Floor1": 5,
    "Floor2": 15,
    "PkCnt": 0.3,
    "MaintCost": 80000,
    "LesAmt": 15000,
    "ExptMovDate": "2025-04-01",
    "CompYear": "2023",
    "OffNo": 1,
    "RtNo": "RT001",
    "MvnPsbYn": "Y",
    "PetYn": "N",
    "PtMemo": "역세권 신축 오피스텔, 즉시입주 가능",
    "UserId": "admin"
  }'
```

### 2. 서초 상가
```bash
curl -X POST http://localhost:5000/api/property \
  -H "Content-Type: application/json" \
  -d '{
    "PtName": "서초동 1층 근린상가",
    "PrgSts": "PRGSTS02",
    "PtSts": "PTSTS01",
    "PtType": "SYCA113",
    "PtExpl": "유동인구 많은 대로변 상가",
    "SaleDiv": "SALEDIV03",
    "Addr1": "서울특별시",
    "Addr2": "서초구",
    "Addr3": "서초동",
    "Addr4": "서초대로 456-7",
    "Addr5": "서초타워 1층 103호",
    "AddrPost": "06590",
    "BjdCode": "1165010100",
    "Floor": 1,
    "SupArea": 45.5,
    "ExcArea": 42.3,
    "BathCnt": 1,
    "DirStd": "남동향",
    "HeatMethod": "중앙난방",
    "Floor1": 1,
    "Floor2": 10,
    "PkCnt": 1.0,
    "MaintCost": 150000,
    "LesAmt": 30000,
    "MonAmt": 250,
    "ExptMovDate": "2025-04-15",
    "CompYear": "2018",
    "OffNo": 1,
    "RtNo": "RT001",
    "PtMemo": "대로변 코너 상가, 유동인구 우수",
    "UserId": "admin"
  }'
```

### 3. 송파 빌라
```bash
curl -X POST http://localhost:5000/api/property \
  -H "Content-Type: application/json" \
  -d '{
    "PtName": "잠실 신축빌라 201호",
    "PrgSts": "PRGSTS02",
    "PtSts": "PTSTS01",
    "PtType": "SYCA118",
    "PtExpl": "신축 빌라, 풀옵션, 주차 2대 가능",
    "SaleDiv": "SALEDIV01",
    "Addr1": "서울특별시",
    "Addr2": "송파구",
    "Addr3": "잠실동",
    "Addr4": "88-15",
    "Addr5": "잠실그린빌라 2층 201호",
    "AddrPost": "05554",
    "BjdCode": "1171010100",
    "Floor": 2,
    "Opt": "풀옵션",
    "HouseCnt": 8,
    "SupArea": 59.5,
    "ExcArea": 49.8,
    "RoomCnt": 3,
    "BathCnt": 2,
    "DirStd": "남향",
    "HeatMethod": "개별난방",
    "Floor1": 2,
    "Floor2": 4,
    "PkCnt": 2.0,
    "MaintCost": 50000,
    "SaleAmt": 55000,
    "ExptMovDate": "2025-05-01",
    "CompYear": "2024",
    "OffNo": 1,
    "RtNo": "RT001",
    "MvnPsbYn": "Y",
    "HouseRental": "Y",
    "PetYn": "Y",
    "PtMemo": "신축 빌라, 반려동물 가능, 전세자금대출 가능",
    "UserId": "admin"
  }'
```

---

## Postman Collection (선택사항)

위 3개의 요청을 Postman Collection으로 저장하여 사용할 수 있습니다.

1. Postman 실행
2. Import → Raw text
3. 위 JSON 복사/붙여넣기
4. Send 버튼 클릭

---

## 데이터 특징

### 1번: 강남 오피스텔
- 매물유형: 오피스텔 (SYCA102)
- 거래구분: 전세 (15,000만원)
- 특징: 역세권 신축, 즉시입주 가능

### 2번: 서초 상가
- 매물유형: 근린상가 (SYCA113)
- 거래구분: 월세 (보증금 30,000만원 / 월 250만원)
- 특징: 대로변 1층, 유동인구 우수

### 3번: 송파 빌라
- 매물유형: 빌라 (SYCA118)
- 거래구분: 매매 (55,000만원)
- 특징: 신축, 반려동물 가능, 전세자금대출 가능

---

## 주의사항

- `OffNo`와 `RtNo`는 실제 환경의 값으로 변경 필요
- 법정동코드(`BjdCode`)는 실제 값으로 변경 권장
- `UserId`는 로그인한 사용자 ID로 변경

---

## 작성일
2026-03-09
