# System API 명세

## 1. 행정동/법정동 목록 조회

### Endpoint
```
GET /api/system/bjd-list
```

### 설명
주소 유형(addressType)에 따라 시도, 시군구, 읍면동(행정), 법정동, 상세 정보, 리 목록을 조회합니다.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| addressType | int | Y | 1=시도, 2=시군구, 3=읍면동(행정), 4=법정동, 5=행정동상세, 6=법정동상세, 7=리 |
| addressCode | string | N | 상위 주소 코드 (addressType에 따라 필수 여부 결정) |

### addressType별 사용법

#### addressType = 1 (시도 목록 조회)
- **파라미터**: addressCode 불필요
- **예시**: `GET /api/system/bjd-list?addressType=1`
- **설명**: 전국 시/도 목록 조회

#### addressType = 2 (시군구 목록 조회)
- **파라미터**: addressCode = 시도 코드 (예: 1100000000)
- **예시**: `GET /api/system/bjd-list?addressType=2&addressCode=1100000000`
- **설명**: 특정 시도의 시군구 목록 조회
- **특수 처리**: addressCode=3600000000 (세종시)인 경우 특별 처리

#### addressType = 3 (읍면동 목록 조회 - 행정동)
- **파라미터**: addressCode = 시군구 코드 (예: 1174000000)
- **예시**: `GET /api/system/bjd-list?addressType=3&addressCode=1174000000`
- **설명**: 특정 시군구의 행정동 목록 조회

#### addressType = 4 (법정동 목록 조회)
- **파라미터**: addressCode = 시군구 코드 (예: 1174000000)
- **예시**: `GET /api/system/bjd-list?addressType=4&addressCode=1174000000`
- **설명**: 특정 시군구의 법정동 목록 조회
- **특수 처리**: addressCode=3611000000 (세종시)인 경우 특별 처리

#### addressType = 5 (행정동 상세 조회)
- **파라미터**: addressCode = 행정동 코드 (예: 1174010600)
- **예시**: `GET /api/system/bjd-list?addressType=5&addressCode=1174010600`
- **설명**: 특정 행정동의 상세 정보 조회

#### addressType = 6 (법정동 상세 조회)
- **파라미터**: addressCode = 법정동 코드 (예: 1174010600)
- **예시**: `GET /api/system/bjd-list?addressType=6&addressCode=1174010600`
- **설명**: 특정 법정동의 상세 정보 조회

#### addressType = 7 (리 목록 조회)
- **파라미터**: addressCode = 읍면동 코드 (예: 11740106)
- **예시**: `GET /api/system/bjd-list?addressType=7&addressCode=11740106`
- **설명**: 특정 읍면동의 리 목록 조회

### Response
```json
[
  {
    "idx": 1,
    "dongCode": "3611000000",
    "dongName": "세종시",
    "hjdCode": "1100000000",
    "hjdName": "서울특별시",
    "bjdCode": "1174010600",
    "bjdName": "둔촌동",
    "startDate": "2020-01-01",
    "endDate": null,
    "isSigungu": true,
    "sidoName": "서울특별시",
    "sidoNameShort": "서울",
    "sigunguName": "강동구",
    "sigunguName2": "강동",
    "mapX": "127.1234",
    "mapY": "37.5678",
    "sort": 1
  }
]
```

### Response Fields
| Field | Type | Description |
|-------|------|-------------|
| idx | long? | 인덱스 |
| dongCode | string? | 동 코드 (세종시 특수 처리용) |
| dongName | string? | 동 이름 (세종시 특수 처리용) |
| hjdCode | string? | 행정동 코드 |
| hjdName | string? | 행정동 이름 |
| bjdCode | string? | 법정동 코드 |
| bjdName | string? | 법정동 이름 |
| startDate | string? | 시작일 |
| endDate | string? | 종료일 |
| isSigungu | bool? | 시군구 여부 |
| sidoName | string? | 시도명 |
| sidoNameShort | string? | 시도명 축약 |
| sigunguName | string? | 시군구명 |
| sigunguName2 | string? | 시군구명2 |
| mapX | string? | 지도 X 좌표 (경도) |
| mapY | string? | 지도 Y 좌표 (위도) |
| sort | int? | 정렬 순서 |

### Error Response
```json
{
  "message": "오류 메시지"
}
```

---

## 2. 법정동코드로 단지 목록 조회

### Endpoint
```
GET /api/system/danji-list
```

### 설명
법정동 코드를 기준으로 해당 지역의 아파트 단지 목록과 각 단지의 평형 정보를 조회합니다.

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| bjdCode | string | Y | 법정동 코드 (예: 1174010600) |

### Request Example
```
GET /api/system/danji-list?bjdCode=1174010600
```

### Response
```json
[
  {
    "id": 1,
    "buildingCode": "11740-1234",
    "buildingName": "강동힐스테이트",
    "bjdCode": "1174010600",
    "addressBunji": "170-1",
    "naverDanjiCode": "1A2B3C",
    "familyCnt": 1000,
    "maxFloor": 35,
    "minFloor": 15,
    "totBldCnt": 10,
    "approveDate": "2020-01-15",
    "heatType": "중앙난방",
    "heatFul": "도시가스",
    "isPrk": true,
    "totprkCnt": 1200,
    "buildingClosingRate": "15.5",
    "floorAreaRate": "250.3",
    "mapX": "127.1234",
    "mapY": "37.5678",
    "hscpTypeCode": "APT",
    "isService": true,
    "cscoName": "삼성물산",
    "pictureUrl": "https://example.com/picture.jpg",
    "totprkCntPer": 1.2,
    "areas": [
      {
        "id": 1,
        "planTypeName": "59A",
        "ptpNo": "A",
        "splySpc": "59.98",
        "exclsSpc": "49.50",
        "ctrtSpc": "10.48",
        "roomCount": 3,
        "bathroomCount": 2,
        "inUse": true
      },
      {
        "id": 2,
        "planTypeName": "84B",
        "ptpNo": "B",
        "splySpc": "84.95",
        "exclsSpc": "69.80",
        "ctrtSpc": "15.15",
        "roomCount": 4,
        "bathroomCount": 2,
        "inUse": true
      }
    ]
  }
]
```

### Response Fields

#### DanjiDto (단지 정보)
| Field | Type | Description |
|-------|------|-------------|
| id | long | 단지 ID |
| buildingCode | string? | 건물 코드 |
| buildingName | string? | 건물명 (단지명) |
| bjdCode | string? | 법정동 코드 |
| addressBunji | string? | 지번 주소 |
| naverDanjiCode | string? | 네이버 단지 코드 |
| familyCnt | int? | 세대수 |
| maxFloor | int? | 최고 층수 |
| minFloor | int? | 최저 층수 |
| totBldCnt | int? | 총 동수 |
| approveDate | string? | 사용승인일 |
| heatType | string? | 난방 방식 |
| heatFul | string? | 난방 연료 |
| isPrk | bool? | 주차 가능 여부 |
| totprkCnt | int? | 총 주차 대수 |
| buildingClosingRate | string? | 건폐율 |
| floorAreaRate | string? | 용적률 |
| mapX | string? | 지도 X 좌표 (경도) |
| mapY | string? | 지도 Y 좌표 (위도) |
| hscpTypeCode | string? | 주택 유형 코드 |
| isService | bool? | 서비스 이용 여부 |
| cscoName | string? | 시공사명 |
| pictureUrl | string? | 사진 URL |
| totprkCntPer | decimal? | 세대당 주차 대수 |
| areas | List&lt;DanjiAreaDto&gt;? | 평형 목록 |

#### DanjiAreaDto (평형 정보)
| Field | Type | Description |
|-------|------|-------------|
| id | long | 평형 ID |
| planTypeName | string? | 평형명 (예: 59A) |
| ptpNo | string? | 평형 타입 번호 |
| splySpc | string? | 공급면적 (㎡) |
| exclsSpc | string? | 전용면적 (㎡) |
| ctrtSpc | string? | 계약면적 (㎡) |
| roomCount | int? | 방 개수 |
| bathroomCount | int? | 욕실 개수 |
| inUse | bool? | 사용 여부 |

### Error Response
```json
{
  "message": "bjdCode는 필수입니다."
}
```

또는

```json
{
  "message": "오류 메시지"
}
```

---

## 데이터베이스 함수

### fn_get_bjd_list
```sql
CREATE OR REPLACE FUNCTION public.fn_get_bjd_list(
    p_address_type integer,
    p_address_code text DEFAULT NULL
)
```
- 행정동/법정동 목록 조회
- hjd_bjd 테이블 참조

### fn_get_danji_list_by_bjd
```sql
CREATE OR REPLACE FUNCTION fn_get_danji_list_by_bjd(
    p_bjd_code VARCHAR
)
```
- 법정동 코드로 단지 목록 조회
- danji 및 danji_area 테이블 참조
- JSON 형태로 평형 목록 반환

---

## 주의사항

1. **법정동 코드 형식**: 10자리 문자열 (예: 1174010600)
2. **세종시 특수 처리**: addressCode가 3600000000 또는 3611000000인 경우 별도 로직 처리
3. **JSON 배열**: danji-list API의 areas 필드는 JSON 배열 형태로 평형 정보를 포함
4. **NULL 처리**: 대부분의 필드가 nullable이므로 클라이언트에서 NULL 체크 필요
5. **삭제된 데이터 제외**: is_active=true, deleted_at IS NULL 조건으로 활성 데이터만 조회
