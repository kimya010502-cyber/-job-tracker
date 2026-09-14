# Figma 디자인 시스템 정리 — 진행 현황

- 대상 파일: `줍줍 레퍼런스` (fileKey `hILvufkI04JInvPtCCf1L1`), Page 1
- 작업일: 2026-09-14
- 상태: **10단계 중 2단계까지 완료, 3단계 진행 중 중단** (Figma MCP 호출 한도)
- 코드 반영: **하지 않음** (요청대로)

---

## 1. 완료된 작업

### 1-1. 백업

`saveVersionHistoryAsync`는 이 MCP에서 지원되지 않아, 메인 화면 프레임을 복제해 백업으로 남겼다.

| 항목 | 값 |
|---|---|
| 백업 노드 | `1019:2` — `[백업] 메인 화면 — 정리 전 2026-09-14` |
| 위치 | x = 17965, y = −491 (기존 프레임들 우측) |

정리가 끝나 필요 없어지면 이 프레임을 삭제하면 된다. Figma 자체 버전 기록도 함께 남아 있다.

### 1-2. Color 변수 (컬렉션 `Color`, 15개) ✅

| 변수 | 값 | scope |
|---|---|---|
| `brand/primary` | `#6155f5` | FRAME_FILL, SHAPE_FILL |
| `brand/strong` | `#3525cd` | TEXT_FILL, SHAPE_FILL, STROKE_COLOR |
| `brand/surface` | `#e2dfff` | FRAME_FILL, SHAPE_FILL |
| `success/soft` | **`#a7fad4`** (신규) | FRAME_FILL, SHAPE_FILL |
| `success/strong` | `#00714d` | TEXT_FILL, SHAPE_FILL |
| `danger/soft` | `#ffdad6` | FRAME_FILL, SHAPE_FILL |
| `danger/strong` | `#ba1a1a` | TEXT_FILL, SHAPE_FILL |
| `text/primary` | `#0b1c30` | TEXT_FILL |
| `text/secondary` | `#464555` | TEXT_FILL |
| `text/muted` | `#777587` | TEXT_FILL |
| `surface/default` | `#ffffff` | FRAME_FILL, SHAPE_FILL |
| `surface/subtle` | `#eff4ff` | FRAME_FILL, SHAPE_FILL |
| `surface/header` | `#f8f9ff` @ 80% | FRAME_FILL, SHAPE_FILL |
| `border/subtle` | `#c7c4d8` @ 30% | STROKE_COLOR |
| `neutral/300` | `#c7c4d8` | SHAPE_FILL, STROKE_COLOR |

**폐기 확정**: `#4f46e5`, `#dce9ff`, `#e5eeff`, `#6cf8bb`(배경 용도), `rgba(108,248,187,.6)`, `#ffdad7`, `#930013`, `#006c49`

성공 색은 요청대로 **연한 배경(`success/soft #a7fad4`) + 진한 텍스트/아이콘(`success/strong #00714d`)** 구조로 정의했다. `#6cf8bb`는 배경 토큰에서 제외했다.

텍스트 그레이는 3개(`primary`/`secondary`/`muted`)를 유지했다. 각각 제목·본문값·라벨로 역할이 달라 2개로 합치면 라벨과 값의 위계가 사라진다.

### 1-3. Spacing 변수 (컬렉션 `Spacing`, 9개) ✅

`space/2` `space/4` `space/6` `space/8` `space/12` `space/16` `space/24` `space/32` `space/40`
scope: GAP, WIDTH_HEIGHT

### 1-4. Radius 변수 (컬렉션 `Radius`, 4개) ✅

`radius/sm` 4 · `radius/md` 8 · `radius/lg` 12 · `radius/full` 999
scope: CORNER_RADIUS

### 1-5. Shadow 이펙트 스타일 (3개) ✅

변수는 이펙트를 담을 수 없어 이펙트 스타일로 등록했다.

| 스타일 | 값 | 용도 |
|---|---|---|
| `elevation/card` | 0 1 2 rgba(0,0,0,0.05) | 카드·툴바·푸터·입력 |
| `elevation/floating` | 0 1 4 rgba(0,0,0,0.04) | 사이드바·상단바·기본 버튼·토글 썸·프로필 |
| `elevation/focus-ring` | spread 4 rgba(53,37,205,0.15) | 상태 dot, 이후 focus 상태 |

4단계 → 3단계로 축약(`0 1 1 .05`와 `0 1 8 .04` 폐기). 적용은 아직 하지 않았다.

### 1-6. Typography 텍스트 스타일 (8개) ✅ — 단, 폰트는 임시

| 스타일 | size / line-height / weight | 등록 폰트 |
|---|---|---|
| `Page title` | 28 / 36 / 700 | Gothic A1 Bold |
| `Section title` | 20 / 28 / 700 | Gothic A1 Bold |
| `Card title` | 16 / 24 / 600 | Gothic A1 SemiBold |
| `Body` | 14 / 20 / 400 | Gothic A1 Regular |
| `Label` | 13 / 18 / 500 | Gothic A1 Medium |
| `Caption` | 12 / 16 / 400 | Gothic A1 Regular |
| `Chip` | 12 / 16 / 600 | Gothic A1 SemiBold |
| `KPI number` | 28 / 34 / 700 | Gothic A1 Bold |

letter-spacing은 전부 0으로 등록했다(요청 스케일에 tracking 항목이 없었고, 기존의 −0.7 ~ +0.55 혼재를 제거하는 것이 목적).

> ⚠️ **폰트는 Pretendard가 아니다.** 사유와 대응은 §3 참고. 텍스트 스타일 8개의 패밀리만 바꾸면 이를 사용하는 모든 노드가 따라오므로, 나중에 1회 작업으로 교체 가능하다.

---

## 2. 중단된 지점

**3단계 "기존 텍스트 노드를 스타일에 매핑"을 실행하려는 시점에 Figma MCP 호출 한도에 걸렸다.**

```
You've reached the Figma MCP tool call limit on the Starter plan.
```

호출 자체가 거부되어 **스크립트는 실행되지 않았다** (텍스트 노드 177개는 아직 Abel/Inter 그대로). 다만 확인차 Figma에서 한 번 봐주면 좋겠다.

### 남은 작업 큐

| # | 작업 | 상태 |
|---|---|---|
| 1 | Typography style 등록 | ✅ 완료 |
| 1b | **기존 텍스트 노드 매핑 / Abel·Inter 제거** | ⏸ 중단 |
| 2 | Color / Spacing / Radius / Shadow 변수 등록 | ✅ 완료 |
| 2b | **기존 노드에 변수·이펙트 스타일 바인딩** | ⏸ 미착수 |
| 3 | Chip 컴포넌트화 (default / success / danger / waiting) | ⏸ 미착수 |
| 4 | Button 컴포넌트화 (primary / secondary / ghost / danger) | ⏸ 미착수 |
| 5 | Select 컴포넌트화 | ⏸ 미착수 |
| 6 | Input 컴포넌트화 (default / focus / disabled) | ⏸ 미착수 |
| 7 | KPI Card / Application Card 컴포넌트화 | ⏸ 미착수 |
| 8 | NavItem 컴포넌트화 (active / inactive) | ⏸ 미착수 |
| 8b | Pagination Item 컴포넌트화 | ⏸ 미착수 |
| 9 | 복제 프레임 → 인스턴스 교체 | ⏸ 미착수 |
| 10 | 레이아웃 버그 수정 (푸터 겹침, KPI 배지 Auto Layout, 카드 8개 노출) | ⏸ 미착수 |

### 매핑 규칙 (다음 실행 시 그대로 사용)

| 현재 | → 스타일 |
|---|---|
| 28 / 36, Inter (KPI 수치) | `KPI number` |
| 28 / 36, Abel (H1) | `Page title` |
| 21.333 / 29.333 (로고) | `Section title` |
| 16 / 22 (기업명) | `Card title` |
| 16 / 24 (사이드바 활성) | `Label` |
| 14.667 / 18.667, 14 / 20 | `Body` |
| 13 / 16, 13 / normal | `Label` |
| 11 / 14, 칩 배경 안 | `Chip` |
| 11 / 14, 그 외 | `Caption` |

칩 판별: 텍스트의 조상 3단계 이내에 **fill이 있고 높이 28 이하인 프레임**이 있으면 칩으로 본다(카드는 높이 86 이상이라 걸리지 않음).

---

## 3. Pretendard 를 쓸 수 없는 이유

이 Figma 파일에서 사용 가능한 폰트는 **1,938종**인데 Pretendard 계열은 하나도 없다.

목록에 `WenQuanYi Zen Hei`, `IPAGothic`, `Liberation Mono`, `42dot Sans` 같은 **서버측 리눅스 폰트**가 들어 있고, 반대로 Windows 기본 한글 폰트(맑은 고딕 등)는 없다. 즉 이 폰트 목록은 **사용자 PC가 아니라 Figma 서버(Google Fonts + Figma 기본 폰트)의 것**이다.

**따라서 PC에 Pretendard를 설치해도 이 MCP 연결에서는 보이지 않는다.** 브라우저로 내려받는 것도 같은 이유로 해결책이 되지 않는다. (시스템에 폰트를 설치하는 작업 자체도 내가 대신 할 수 있는 범위가 아니다.)

### 실제로 Pretendard를 넣으려면

| 방법 | 조건 | 이 MCP에 반영되는가 |
|---|---|---|
| Figma 조직 폰트 업로드 | Organization / Enterprise 플랜 | ○ |
| Figma 데스크톱 앱 + PC에 폰트 설치 | 데스크톱 앱 사용 | 데스크톱 화면에는 보이나, 원격 MCP 작업에는 반영 안 될 수 있음 |
| 현행 유지 (대체 폰트) | 없음 | ○ |

### 임시로 Gothic A1 을 고른 이유

요청 스케일이 weight 400/500/600/700을 모두 쓰는데, 이 파일에서 쓸 수 있는 한글 폰트 중 네 단계를 다 가진 것은 **Gothic A1**(Regular/Medium/SemiBold/Bold)과 IBM Plex Sans KR뿐이다. Noto Sans KR에는 SemiBold가 없다. Gothic A1이 Pretendard와 같은 기하학적 산세리프 계열이라 대체값으로 가장 가깝다.

**교체 비용은 낮다.** 텍스트 스타일 8개의 `fontName`만 바꾸면 그 스타일을 쓰는 모든 노드가 따라온다.

---

## 4. 아직 판단이 필요한 항목

| # | 항목 | 내용 |
|---|---|---|
| 1 | **MCP 호출 한도** | Starter 플랜 한도에 걸려 남은 8단계를 진행할 수 없다. 한도 리셋 대기 / 플랜 업그레이드 / 수기 작업 중 선택 필요 |
| 2 | **폰트 확정** | Gothic A1 유지 · 다른 대체 폰트 · Pretendard 조달 후 교체 중 선택 |
| 3 | **컨트롤 높이 상향** | 요청대로 Button/Select/Input을 36~40으로 올리면 필터 툴바 높이가 59.5 → 약 68~72로, 칩은 18 → 22~24로 커진다. 카드 내부(201px 고정)에 칩 3개가 들어 있어 **카드 높이도 함께 커져야 한다**. "구조 유지" 범위를 넘는 변화라 적용 전 확인 필요 |
| 4 | **타이포 상향 영향** | Caption 11 → 12, Chip 11 → 12로 올라가면 카드 정보행 높이가 커진다. 3번과 함께 카드 높이 재산정 필요 |
| 5 | **`Accents/Indigo`** | 기존 변수는 로컬이 아니라 **외부 라이브러리 변수**다. 기록 추가 버튼이 이를 참조 중이므로, 신규 `brand/primary`로 다시 바인딩해야 라이브러리 의존이 끊긴다 |

---

## 5. 다음 재개 지점

MCP 한도가 풀리면 아래 순서로 이어간다.

1. 텍스트 노드 → 스타일 매핑 (§2 매핑 규칙 사용, 대상 `1002:2` 하위 TEXT 177개)
2. fill / stroke / cornerRadius / effect 를 변수·스타일에 바인딩
3. Chip → Button → Select → Input → Card → NavItem → Pagination 순 컴포넌트 생성
4. 인스턴스 교체
5. 레이아웃 버그 (§figma-main-screen-spec §9 / design-system-diff §9)

카드 높이 재산정(위 4-3, 4-4)은 컴포넌트화 **이전**에 결정되어야 Card 컴포넌트를 두 번 만들지 않는다.
