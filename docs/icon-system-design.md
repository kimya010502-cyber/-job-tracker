# 아이콘 시스템 설계안

- 작성일: 2026-09-14
- 전제: 마스터 9종 동결 중. 이 문서는 설계안이며 **아직 아무것도 만들지 않았다.**
- 근거: `11a-icon-inventory` 실행 결과 + 사용자 보정 5건

---

## 0. 인벤토리 보정 반영

| # | 보정 | 반영 |
|---|---|---|
| 1 | loose 그룹 `99f05314` 가 prev/next 를 하나로 묶음 | **Chevron Left / Chevron Right 2개로 분리.** loose 그룹 수를 그대로 쓰지 않고 역할·형태로 확정 |
| 2 | Select chevron 4개는 새 Select 마스터에 이미 존재 | **아이콘 라이브러리에서 제외** |
| 3 | View Toggle 2개 | **현 단계 생성하지 않음.** 별도 View Toggle 컴포넌트 설계 시 사용 |
| 4 | Phase E dots=24 는 상태 dot 12 + 흰색 Overlay 12 | **Chip leading dot 대상 아님.** Application Card 는 Status Indicator 의 `state` 매핑만 사용 |
| 5 | 최종 수량 | **현재 생성 16개 / 향후 View Toggle 포함 18개** (loose 기준 18 이 아님) |

---

## 1. 생성할 Icon Component 16개

| # | 이름 | source node | 원본 크기 | 쓰이는 곳 | Phase |
|---|---|---|---|---|---|
| 1 | `Icon / Search` | `1003:1701` | 13.5 × 13.5 | 검색 Input | B |
| 2 | `Icon / Reset` | `1003:1731` | 10.667 × 12.3 | 초기화 Button | B |
| 3 | `Icon / Plus` | `1009:711` | 9.333 × 9.333 | 기록 추가 Button | C |
| 4 | `Icon / Arrow Up` | `1002:38` | 8 × 8 | KPI1 델타 배지 | D |
| 5 | `Icon / Stage Count` | `1002:171` | 9.75 × 9.75 | 카드 단계 수 배지 ×12 | E |
| 6 | `Icon / External Link` | `1002:176` | 12 × 12 | 카드 공고 바로가기 ×12 | E |
| 7 | `Icon / More` | `1002:179` | 12 × 3 | 카드 더보기 ×12 | E |
| 8 | `Icon / Nav / Applications` | `1002:514` | 13.5 × 14.288 | 사이드바 지원 내역 | F |
| 9 | `Icon / Nav / Statistics` | `1002:519` | 15 × 15.75 | 사이드바 통계 | F |
| 10 | `Icon / Nav / Calendar` | `1002:524` | 13.5 × 15 | 사이드바 캘린더 | F |
| 11 | `Icon / Nav / Memo` | `1002:529` | 16.5 × 11.268 | 사이드바 메모 | F |
| 12 | `Icon / Nav / Settings` | `1002:539` | 15.075 × 15 | 사이드바 설정 | F |
| 13 | `Icon / Nav / Help` | `1002:544` | 15 × 15 | 사이드바 도움말 | F |
| 14 | `Icon / Chevron Left` | `1002:461` | 4.933 × 8 | 페이지네이션 prev | F |
| 15 | `Icon / Chevron Right` | `1002:468` | 4.933 × 8 | 페이지네이션 next | F |
| 16 | `Icon / Bell` | `1002:489` | 13.333 × 16.667 | 상단바 알림 | 별도 |

**보류 2개** — `Icon / View Table` (`1003:1738`) · `Icon / View Card` (`1003:1741`), 둘 다 13.5 × 13.5
**제외 4개** — Select chevron `1003:1709` / `1715` / `1721` / `1727`

카드 아이콘은 12장에 각각 복제되어 있다(예: 단계 수 아이콘 `1002:171`, `1003:1784`, `1003:1829` …).
컴포넌트는 **첫 카드의 것 하나만** 쓰고 나머지 11개는 중복이므로 버린다.

### 17번째 — `Icon / Dot` (결정 필요, §6-1 참고)

---

## 2. 표준 canvas 와 글리프 배치

### canvas 16 × 16 고정

모든 아이콘 컴포넌트의 프레임 크기를 **16 × 16** 으로 통일한다.

현재 아이콘 박스가 13.5×14.288 / 15×15.75 / 16.5×11.268 … 처럼 **여섯 개가 전부 다르고**,
그래서 사이드바 메뉴의 텍스트 시작점이 항목마다 미세하게 어긋나 있다.
**canvas 를 통일하는 것만으로 이 정렬 문제가 해소된다.**

### 글리프는 원본 크기를 유지하고 중앙 정렬만 한다

| 방식 | 내용 | 판단 |
|---|---|---|
| A. 원본 크기 + 중앙 정렬 | 글리프를 건드리지 않고 16×16 캔버스 가운데 놓는다 | **채택** |
| B. 최장변 14 로 정규화 | 아이콘 굵기·크기가 균일해진다 | 보류 — 16개 글리프가 모두 커지거나 작아진다 |

B 는 아이콘 시스템의 정석이지만 **"화면을 새로 디자인하지 않는다"** 는 이번 작업 원칙을 벗어난다.
A 로도 정렬 문제는 해결되고, 글리프 스케일 정규화는 이후 별도 디자인 패스에서 다루면 된다.

### 크기 대응

| 슬롯 | 크기 | 방법 |
|---|---|---|
| Input `leading`, NavItem `icon` | 16 | 아이콘 인스턴스 원본 크기 그대로 |
| Chip / Button `leading`, Pagination / Icon Button `icon` | 12 | 인스턴스를 12×12 로 resize |

아이콘 컴포넌트의 글리프에 **constraint = SCALE** 을 걸어 인스턴스를 줄여도 비율이 유지되게 한다.
⚠ 인스턴스 크기 오버라이드가 swap 후에도 유지되는지는 **첫 적용 후 실측으로 확인**해야 한다.

---

## 3. INSTANCE_SWAP property 규칙

### 컴포넌트 이름

```
Icon / <Name>                 예: Icon / Search, Icon / Bell
Icon / Nav / <Name>           예: Icon / Nav / Calendar
```

슬래시로 Figma 에셋 패널에서 `Icon` 폴더 아래 묶인다. Nav 아이콘은 한 단계 더 들어간다.
**variant set 이 아니라 개별 컴포넌트 16개**로 만든다 — INSTANCE_SWAP 은 컴포넌트 목록에서 고르는 방식이라 이쪽이 맞다.

### property 이름

| 호스트 | property | 근거 |
|---|---|---|
| Chip | `leading` | 앞쪽 슬롯 하나 |
| Button | `leading` | 앞쪽 슬롯 하나 |
| Input | `leading` | 앞쪽 슬롯 하나 |
| NavItem | `icon` | 슬롯이 하나뿐이고 위치 수식이 불필요 |
| Pagination Item | `icon` | 동일 |
| Icon Button | `icon` | 동일 |

규칙: **슬롯이 하나면 `icon`, 앞뒤 구분이 필요하면 `leading` / `trailing`.** 전부 소문자 한 단어.

`preferredValues` 에 Icon 컴포넌트 16개를 등록해 스왑 목록을 아이콘으로만 제한한다.

---

## 4. 호스트별 수정 구조

| 호스트 | 현재 | 수정 후 | 기본 표시 |
|---|---|---|---|
| `Chip` | `leading` = 빈 프레임 12×12, hidden | `Icon / Dot` 인스턴스 12×12 + `leading` 속성 | hidden (변화 없음) |
| `Button` | `leading` = 빈 프레임 12×12, hidden | `Icon / Plus` 인스턴스 12×12 + `leading` 속성 | hidden (변화 없음) |
| `Input` | `leading` = 빈 프레임 16×16, hidden | `Icon / Search` 인스턴스 16×16 + `leading` 속성 | hidden (변화 없음) |
| `Select` | chevron 벡터 직접 포함 | **수정하지 않음** | — |
| `NavItem` | `icon` = 빈 프레임 16×16, **visible** | `Icon / Nav / Applications` 인스턴스 + `icon` 속성 | **visible → 글리프 표시** |
| `Pagination Item` | `icon` = 빈 프레임 12×12, hidden | `Icon / Chevron Left` 인스턴스 12×12 + `icon` 속성 | hidden (변화 없음) |
| `Icon Button` | `icon` = 빈 프레임 12×12, **visible** | `Icon / More` 인스턴스 12×12 + `icon` 속성 | **visible → 글리프 표시** |

---

## 5. KPI Card / Application Card 간접 영향

두 카드는 Chip · Icon Button 을 **중첩 인스턴스로 품고 있어** 마스터 수정이 그대로 전파된다.

| 카드 | 중첩 인스턴스 | 영향 |
|---|---|---|
| `KPI Card` | Chip ×1 (델타 배지) | leading 이 숨김이라 **시각 변화 없음**. 교체 때 KPI1 만 `Icon / Arrow Up` 으로 스왑 |
| `Application Card` | Chip ×4, Icon Button ×2, Status Indicator ×1 | Chip 4개는 숨김이라 변화 없음. **Icon Button 2개는 글리프가 나타난다** |

Application Card 의 아이콘 버튼은 지금 **빈 사각형**이다. 기본 글리프가 들어가면 비어 보이던 것이 채워진다 —
의도한 개선이지만 **엄연한 시각 변화**이므로 별도 항목으로 기록한다.
크기(24×24)와 카드 높이(219)는 12×12 글리프가 들어가도 변하지 않아야 한다. **실측으로 확인할 것.**

Status Indicator 는 아이콘을 쓰지 않으므로 **영향 없음**.

---

## 6. 결정이 필요한 항목

### 6-1. dot 을 어떻게 담을 것인가

| 안 | 구조 | 장단 |
|---|---|---|
| **(가) `Icon / Dot` 컴포넌트** | Chip `leading` = `Icon / Dot` 인스턴스. 배지는 그대로 두고 fill 만 오버라이드, 단계 수 배지는 `Icon / Stage Count` 로 스왑 | 슬롯 하나로 dot·글리프 **둘 다 처리**. 아이콘 수 16 → **17** |
| (나) 원시 원 + 별도 아이콘 | `leading` 안에 원과 아이콘 인스턴스를 **둘 다** 넣고 각각 토글 | 아이콘 수 16 유지. 대신 슬롯 구조가 복잡해지고 자식이 2개가 된다 |

**(가) 권장.** Chip 의 leading 은 배지에서는 dot, 카드 단계 수에서는 글리프다.
하나의 스왑 메커니즘으로 둘 다 덮으면 규칙이 하나로 줄어든다.

사용자 선호 사항은 (가) 에서도 그대로 성립한다 — **슬롯 12×12 / dot 8×8 / 중앙 정렬 / visible 토글 / fill 오버라이드.**
`Icon / Dot` 은 16×16 캔버스 안에 8×8 원을 중앙에 둔 컴포넌트이고, Chip 안에서 12×12 로 축소된다.

### 6-2. 시즌 dot 6px → 8px 정규화

현재 시즌 배지 dot 6px, 동기화 배지 dot 8px 로 **같은 역할인데 크기가 다르다.**
`Icon / Dot` 하나로 통일하면 **둘 다 8px** 이 된다(시즌 dot 이 2px 커짐).

정규화를 권장한다. 같은 역할에 같은 값을 주는 것이 이번 작업의 목적이고, 2px 차이는 의도로 보기 어렵다.

### 6-3. NavItem / Icon Button 기본 글리프를 보이게 둘지

| 안 | 결과 |
|---|---|
| **기본 visible (권장)** | 빈 사각형이던 자리에 글리프가 보인다. Application Card 마스터에 시각 변화 발생 |
| 기본 hidden | 시각 변화 0. 대신 두 컴포넌트가 계속 "빈 상자" 로 남고 교체 때마다 켜야 한다 |

아이콘 버튼과 내비게이션 항목은 **아이콘이 없으면 성립하지 않는 컴포넌트**다. 기본 표시가 맞다.

---

## 7. 수정 순서와 롤백

### ⚠ 화면 백업 `1044:47` 은 마스터 수정을 막지 못한다

백업 프레임 안의 인스턴스는 **같은 마스터를 참조**한다. 마스터를 고치면 백업도 같이 바뀐다.
따라서 **마스터를 수정하기 전에 각 마스터를 복제해 별도 백업을 떠야 한다.**

```
[백업] Chip — 아이콘 슬롯 수정 전
[백업] Button — 아이콘 슬롯 수정 전
[백업] Input — …
[백업] NavItem — …
[백업] Pagination Item — …
[백업] Icon Button — …
```

복제본은 원본과 분리된 컴포넌트가 되므로 이후 마스터 수정의 영향을 받지 않는다.

### 순서

| 단계 | 작업 | 영향 받는 마스터 | 직후 재검증 |
|---|---|---|---|
| 1 | 마스터 6종 백업 복제 | — | 복제 개수 확인 |
| 2 | Icon 컴포넌트 16(+Dot) 생성 | 없음 (순수 추가) | 개수·크기·이름 |
| 3 | `Chip` 수정 | Chip → **KPI Card, Application Card** | `05b`, `06b` 재실행 |
| 4 | `Icon Button` 수정 | Icon Button → **Application Card** | `06b` 재실행 |
| 5 | `Button` / `Input` / `NavItem` / `Pagination Item` 수정 | 없음 (다른 마스터가 참조하지 않음) | 자체 크기·슬롯 검증 |

3·4 단계가 위험 구간이다. 두 카드가 중첩 인스턴스로 물려 있어 **수정 직후 반드시 재검증**한다.

### 재검증 필요 마스터 목록

| 마스터 | 사유 | 확인할 것 |
|---|---|---|
| `Chip` | 직접 수정 | 5개 variant 높이 24 유지, leading 기본 hidden |
| `Icon Button` | 직접 수정 | 24×24 유지, 글리프 12×12 중앙 |
| `Button` · `Input` · `NavItem` · `Pagination Item` | 직접 수정 | 각 확정 높이(36/36/32/32) 유지 |
| `KPI Card` | Chip 중첩 | **높이 86 유지**, 배지 24 유지 |
| `Application Card` | Chip ×4 + Icon Button ×2 중첩 | **높이 219 유지**, 인스턴스 7개 유지 |
| `Select` | — | 수정 대상 아님 |

---

## 8. 최종 수량 기록

| 구분 | 개수 |
|---|---|
| 현재 생성 (A~F 교체에 필요) | **16** |
| `Icon / Dot` 을 컴포넌트로 만들 경우 | **17** |
| 향후 View Toggle 2개 포함 전체 라이브러리 | **18** (Dot 포함 시 19) |

`11a` 의 `recommendedIconComponents = 18` 은 loose 그룹 수를 그대로 쓴 값이라 **채택하지 않는다.**
Chevron 좌/우 분리(+1), Select chevron 제외(−1), View Toggle 보류(−2) 를 반영한 결과가 위 표다.
