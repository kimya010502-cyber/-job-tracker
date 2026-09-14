# Figma 디자인 시스템 정리 — 진행 현황

- 대상 파일: `줍줍 레퍼런스` (fileKey `hILvufkI04JInvPtCCf1L1`), Page 1
- 작업일: 2026-09-14
- 상태: **13단계 중 1·2단계 APPLY 완료** (§7 참고). 3단계(Chip 컴포넌트화) 대기
- 실행 경로: Figma MCP 호출 한도 소진 → **Scripter 플러그인에서 스크립트 직접 실행**으로 전환
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

## 4. 확정 사양 (2026-09-14 결정)

### 4-1. Typography

Gothic A1 기반 텍스트 스타일 8개를 **그대로 사용**한다. 지금 우선순위는 폰트 패밀리가 아니라 역할 기반 스타일 통일이다. Pretendard를 쓸 수 있는 환경이 생기면 **텍스트 스타일의 font family만 교체**한다.

### 4-2. 컨트롤 높이 (확정)

| 요소 | 확정 높이 | 기존 |
|---|---|---|
| Button | **36** | 28 |
| Select | **36** | 28 |
| Input | **36** | 31 |
| Chip | **22** | 18 |
| Pagination | **32** | 28 |

40px까지는 올리지 않는다. 데스크톱 정보 밀도를 유지하면서 가독성만 개선하는 선.

### 4-3. Application Card (확정)

- **고정 높이 201 폐기.** Auto Layout 콘텐츠 높이로 전환하고, 필요하면 min-height만 건다
- 같은 행의 카드는 **stretch/fill**로 높이를 맞춘다
- width: 기존 grid 구조 유지 / padding **16** / 내부 gap **12** / 정보행 gap **8**
- radius **8** / border `border/subtle` / shadow `elevation/card`
- grid 가로 gap **12** / 세로 gap **40 → 24 수준으로 축소**
- 컴포넌트 생성 후 **실제 콘텐츠를 넣은 샘플 카드로 높이와 grid 리듬을 재확인**한다

### 4-4. KPI / Toolbar

- 컨트롤 높이 상향에 따른 **툴바 높이 증가를 허용**한다. 59.5에 맞추지 않고 Auto Layout으로 재계산
- KPI ↔ Toolbar 간격도 spacing 토큰 기준으로 정리

### 4-5. brand/primary 재바인딩

외부 라이브러리 변수 `Accents/Indigo` 의존을 제거하고, 기록 추가 버튼을 포함해 해당 색을 쓰는 요소를 로컬 `brand/primary`로 다시 바인딩한다. 이후 JOOB 화면은 외부 Accent 변수에 의존하지 않는다.

### 4-6. 작업 원칙

- 화면을 새로 디자인하지 않는다. 구조와 정보 구성을 유지한 채 일관성·가독성·재사용성만 개선
- **특정 높이나 좌표를 맞추려고 padding/gap을 임의로 줄이지 않는다**
- absolute positioning보다 Auto Layout 우선
- 같은 역할은 반드시 동일 component / token / style 사용
- 예외가 필요하면 임의로 만들지 말고 **별도 목록으로 보고**

### 4-7. 확정된 작업 순서

1. 기존 텍스트 노드 → Text Style 매핑
2. 외부 `Accents/Indigo` → 로컬 `brand/primary` 재바인딩
3. Chip 컴포넌트화
4. Button 컴포넌트화
5. Select 컴포넌트화
6. Input 컴포넌트화
7. KPI Card 컴포넌트화
8. Application Card 컴포넌트화
9. NavItem 컴포넌트화
10. Pagination Item 컴포넌트화
11. 기존 독립 프레임 → 인스턴스 교체
12. Auto Layout 기반 레이아웃 버그 수정
13. spacing / alignment / overflow 최종 점검

---

## 5. MCP 호출 한도 — 대기로는 풀리지 않는다

| 항목 | 값 |
|---|---|
| Starter 플랜 한도 | **월 20회** (View/Collab 시트 기준) |
| 리셋 | **월 단위, 결제 주기 기준** — 일 단위 아님 |
| 현재 사용량 | 20/20 소진 (읽기 12 + 쓰기 5 + 차단 2) |
| 출처 | [Figma 개발자 문서 — Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/) |

문서에는 "쓰기 도구는 한도 면제"라고 적혀 있으나 면제 목록은 `add_code_connect_map` · `create_new_file` · `whoami` 뿐이고, 실제로 `use_figma`는 차단됐다.

### 이 한도로는 남은 작업을 끝낼 수 없다

남은 13단계는 컴포넌트 8종 생성 + 인스턴스 교체 + 레이아웃 수정이라 **검증을 포함해 최소 15~25회**가 필요하다. 월 20회를 다음 달에 통째로 써도 여유가 없고, 중간 검증(스크린샷·메타데이터 확인)을 할 수 없어 오류를 잡지 못한 채 진행하게 된다.

### 대안: Figma 플러그인 콘솔에서 스크립트 실행 (MCP 한도 무관)

`use_figma`가 실행하는 것은 결국 **Figma Plugin API 자바스크립트**다. 같은 코드를 Figma의 스크립팅 플러그인(예: Scripter)에 붙여넣어 직접 실행하면 **MCP 한도를 전혀 쓰지 않는다.**

작업 흐름:

1. 내가 단계별 스크립트를 `docs/figma-scripts/`에 작성한다
2. 사용자가 Figma에서 해당 스크립트를 실행한다
3. 스크립트가 돌려주는 JSON 결과를 나에게 전달한다
4. 그 결과를 보고 다음 단계 스크립트를 작성한다

이러면 검증 루프가 그대로 유지되면서 호출 한도를 소모하지 않는다.

| 스크립트 | 내용 | 상태 |
|---|---|---|
| [`01-text-style-mapping-and-tokens.js`](figma-scripts/01-text-style-mapping-and-tokens.js) | 1단계 텍스트 매핑 + 2단계 재바인딩 + 변수/이펙트 바인딩 | 작성 완료, 실행 대기 |
| 02 이후 | Chip → Button → Select → Input → KPI Card → Application Card → NavItem → Pagination → 인스턴스 교체 → 레이아웃 | 01 결과 확인 후 작성 |

스크립트는 **재실행해도 안전하도록(멱등)** 작성한다.

---

## 6. 다음 재개 지점

아래 셋 중 하나가 정해져야 진행할 수 있다.

1. **플러그인 콘솔 경로** — `01` 스크립트를 Figma에서 실행하고 결과 JSON 전달 (권장, 추가 비용 없음)
2. **플랜 업그레이드** — Professional + Dev/Full 시트면 일 200회라 MCP로 한 번에 끝낼 수 있다
3. **다음 결제 주기까지 대기** — 단, 위 사유로 월 20회로는 완주가 어렵다

카드 높이 재산정(§4-3)은 Application Card 컴포넌트 생성 **이전**에 샘플 카드로 확인해야 컴포넌트를 두 번 만들지 않는다.

---

## 7. 1·2단계 APPLY 완료 (2026-09-14)

`docs/figma-scripts/01-text-style-mapping-and-tokens.v4.js` 를 Scripter에서 `DRY_RUN = false` 로 실행.
**계획(`*WouldApply`)과 실제(`*Applied`)가 전 항목 일치, `errorCount: 0`.**

### 적용 결과

| 항목 | 결과 |
|---|---|
| 텍스트 스타일 적용 | **177개** (Page title 1 · Section title 2 · Card title 12 · Body 2 · Label 13 · Caption 87 · Chip 56 · KPI number 4) |
| Abel / Inter 잔존 | **0** (`remainingNonGothicA1: {}`) — 적용 전 Abel 123 + Inter 54 |
| fill 변수 바인딩 | **333개** / 토큰 16종 |
| stroke 바인딩 | **24개** (카드 보더 12 + 카드 내부 구분선 12) |
| 이펙트 스타일 | **35개** (card 20 · focus-ring 12 · floating 3) |
| 외부 변수 의존 제거 | **1건** — `Accents/Indigo` → 로컬 `brand/primary` |
| 신규 변수 | `text/on-brand`, `surface/page` |
| scope 변경 | `neutral/300` 에 `TEXT_FILL` 추가 |
| 스캔 노드 | 737 |

### 토큰별 바인딩 수

`text/muted` 93 · `text/secondary` 68 · `text/primary` 46 · `surface/subtle` 45 · `brand/strong` 27 · `surface/default` 21 · `brand/surface` 13 · `success/strong` 4 · `neutral/300` 3 · `danger/strong` 3 · `brand/primary` 2 · `text/on-brand` 2 · `success/soft` 2 · `danger/soft` 2 · `surface/header` 1 · `surface/page` 1

### 최종 Color 토큰 (17종)

기존 15종 + `text/on-brand`(#ffffff) + `surface/page`(#f8f9ff 100%).
`surface/page`와 `surface/header`는 같은 hex지만 opacity·역할이 달라 별도 semantic token으로 분리했다.

**폐기 확정 색** — `#4f46e5` `#dce9ff` `#e5eeff` `#6cf8bb`(배경 용도) `rgba(108,248,187,.6)` `#ffdad7` `#930013` `#006c49`

### 의도적으로 손대지 않은 노드 (예외 목록)

| 노드 | 사유 |
|---|---|
| `1002:469` Header | effects가 2개(DROP_SHADOW + BACKGROUND_BLUR). 이펙트 스타일을 적용하면 backdrop blur 12px이 사라지므로 제외. **레이아웃 단계에서 별도 처리 필요** |

그 외 예외는 없다. `skippedStroke` 0건, `unmappedNotable` 0건.

### 드라이런이 실제로 막은 사고 2건

1. **v1의 stroke 무조건 바인딩** — 실제로는 24개 전부 정상 보더여서 피해가 없었겠지만, 검증 없이 실행했다면 확인할 방법이 없었다. 지금은 "확인된 안전"이다.
2. **v2의 `#f8f9ff` hex 단독 매핑** — 본문 배경 `1002:3 Main`(1024×1024, 불투명)이 80% 토큰에 묶여 배경이 비쳐 보일 뻔했다. v3에서 발견, v4에서 `surface/page` 신설로 해결.

### 현재 화면 상태 (예정된 중간 상태)

폰트 크기 변경(Caption·Chip 11→12, 사이드바 활성 16→13, 로고 21.33→20)으로 Auto Layout이 리플로우됐다.
**KPI 델타 배지 4개는 absolute 배치라 따라오지 않아 수치와 겹칠 수 있다.** 12단계(Auto Layout 기반 레이아웃 수정)에서 정리한다.

### 되돌리기

백업 프레임 `1019:2` / Figma 버전 기록 / Ctrl+Z — 셋 다 유효.
