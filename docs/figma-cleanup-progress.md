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

---

## 8. 3단계 Chip 컴포넌트화 완료 (2026-09-14)

`docs/figma-scripts/02-chip-component.js` APPLY 실행. `errorCount: 0`, `notes: []`.

### 생성 결과

| 항목 | 값 |
|---|---|
| 컴포넌트 세트 | `Chip` — `1029:1984` (배치 x 19645, y −491) |
| variant | 5종, **전부 height 24** (`allHeight24: true`) |
| 신규 토큰 | `warning/soft #FDF1DE`, `warning/strong #B8790F` |

| variant | id | 크기 | bg | text |
|---|---|---|---|---|
| `tone=neutral` | `1029:1969` | 52 × 24 | `surface/subtle` | `text/secondary` |
| `tone=brand` | `1029:1972` | 64 × 24 | `brand/surface` | `brand/strong` |
| `tone=success` | `1029:1975` | 67 × 24 | `success/soft` | `success/strong` |
| `tone=danger` | `1029:1978` | 52 × 24 | `danger/soft` | `danger/strong` |
| `tone=waiting` | `1029:1981` | 67 × 24 | `warning/soft` | `warning/strong` |

**`notes`가 비어 있다는 것은 `setBoundVariable` 이 전부 성공했다는 뜻**이다. padding(space/4, space/8), itemSpacing, 네 모서리 radius(radius/full)가 숫자가 아니라 변수로 연결되어 있다.

### 구조

- Auto Layout HORIZONTAL, hug, 세로 중앙 정렬
- padding 4 / 8 (변수 바인딩), itemSpacing 4
- radius pill (`radius/full`)
- 자식: `leading` 프레임 12×12 (**visible = false**) + `label` 텍스트(Chip 스타일)

`leading` 은 아이콘·dot 이 붙는 배지 15개(단계 수 12, KPI 델타 1, 시즌 1, 동기화 1)를 11단계에서 인스턴스로 교체할 때 오버라이드로 켜서 쓴다. 숨김 상태라 기본 모양과 24px 높이에는 영향이 없다.

### Color 토큰 현황 — 19종

기존 17종 + `warning/soft` + `warning/strong`.
앱 코드(`styles.css`)의 `--waiting: #b8790f` / `--waiting-bg: #fdf1de` 와 값이 일치하므로, 앱과 Figma의 '결과 대기' 상태 색이 같아졌다.

### 컨트롤 높이와 spacing scale 충돌 — 해법

Chip 24 는 padding 4(스케일 값) + line-height 16 으로 떨어져 문제가 없었다.
그러나 **Button / Select / Input 36** 은 `Label` 13/18 기준 padding 9 가 필요해 스케일(2·4·6·8·12…)에 없다.

→ **세로 padding 대신 고정 높이 + 세로 중앙 정렬로 해결한다.**
컨트롤은 `height = 36` 고정, 가로 padding 12(스케일 값), `counterAxisAlignItems = 'CENTER'`.
이러면 확정값 36을 정확히 지키면서 스케일 밖 padding 값을 만들지 않는다. Pagination 32 도 32×32 고정으로 동일하게 처리한다.
(칩은 콘텐츠 hug, 컨트롤은 고정 높이 — 역할이 달라 일관성에 어긋나지 않는다.)

---

## 9. 4~7단계 완료 (2026-09-14)

| 단계 | 컴포넌트 세트 | id | variant | 검증 |
|---|---|---|---|---|
| 4 | `Button` | — | primary / secondary / ghost / danger | `allHeight36: true`, notes 0 |
| 5 | `Select` | — | default / focus / disabled | `allHeight36: true` |
| 6 | `Input` | — | default / focus / disabled | `allHeight36: true` |
| 7 | `KPI Card` | `1033:2085` | delta = positive / negative / neutral | 05b 재검증 전 항목 통과 |

Button·Select·Input 공통: height 36 **고정 + 세로 중앙 정렬**, 가로 padding 12, radius 8, Label 13/18/500.
세로 padding 을 쓰면 (36−18)/2 = 9 가 되어 spacing scale 을 벗어나므로 고정 높이로 처리했다.

Input leading 슬롯만 16×16 (36px 컨트롤에 12 는 작고, 현재 검색 아이콘 13.5 보다 줄일 이유가 없음).
Select chevron 과 Chip·Button leading 은 12×12 유지 — 역할이 다르므로 같은 규격을 강제하지 않는다.

### KPI Card 에서 잡은 버그와 오판 2건

1. **v1 버그 (실제 결함)** — `figma.createFrame()` 은 100×100 FIXED 로 생성되고 `layoutMode` 만 설정해도
   sizing mode 가 FIXED 로 남는다. `value` / `meta` 에 AUTO 를 지정하지 않아 둘 다 100 고정이었고,
   `value row` 가 `max(100,100)=100` 이 되어 카드가 86 이 아니라 **152** 가 됐다. v2 에서 세 프레임 모두 명시.
2. **v2 검증 오판 (내 기대값 오류)** — `value row` 의 `padding-top 4` 는 그 프레임 자신의 박스 높이에
   포함되므로 **38 이 정답**인데 콘텐츠 높이 34 를 기대값에 넣었다. 컴포넌트는 처음부터 옳았다.
   `EXPECTED_VALUE_ROW_H` 를 38 로 정정하고, 재검증은 읽기 전용 스크립트 `05b` 로 따로 수행했다.

### 지원 카드 목록의 UX 의도 (정정)

카드가 12장인 것은 오류가 아니다. **첫 viewport 에 4열 × 2행 = 8장이 온전히 보이고, 3행 상단이 살짝 보여
"아래에 더 있다"는 스크롤 affordance 를 주는 구조**다. 3행 4장을 삭제하지 않는다.
다만 푸터의 "총 20개 중 1-8 표시" 문구는 이 구조와 맞지 않으므로 레이아웃 단계에서 따로 고친다.

---

## 10. 8단계 완료 — Status Indicator / Icon Button / Application Card (2026-09-14)

| 컴포넌트 | id | 구성 |
|---|---|---|
| `Status Indicator` | — | state = inProgress / ended. outer 18×18(soft) + inner dot 10×10(strong). **effect 미사용** |
| `Icon Button` | — | 24×24 고정, ghost, radius/sm(4), icon 슬롯 12×12 |
| `Application Card` | `1037:2163` | state = inProgress / ended. **실측 높이 219px 확정** |

Application Card 는 직속 자식 3개(header / info / footer)로 래퍼 2겹을 제거했고,
인스턴스 7개(Chip ×4, Status Indicator ×1, Icon Button ×2)를 재사용한다. absolute 0건.

### 219px 의 근거

```
1(top stroke) + 16 + 24(header) + 128(info) + 33(footer) + 16 + 1(bottom stroke) = 219
```

루트의 `border/subtle` 1px 이 **`strokesIncludedInLayout = true`** 상태라 상하 2px 이
레이아웃 높이에 포함된다. 216 추정치와의 차이는 이 2px 과 footer 실측(33) 때문이며,
**content hug 실측값 219 가 정상값**이다. 특정 숫자에 맞추지 않는다.

### 이 단계에서 겪은 검증 오판 2건 (컴포넌트는 모두 정상이었다)

1. `nestedHug = false` — `counterAxisSizingMode` 는 프레임 방향에 따라 뜻이 다르다.
   `info` 는 VERTICAL 이라 그 속성이 **폭**을 뜻하고, 가로 FILL 이므로 FIXED 가 정답이다.
   판정을 방향 무관한 `layoutSizingVertical === 'HUG'` 로 바꿔 해결했다.
2. `breakdownMatchesHeight = false` — 손으로 쓴 공식과 비교하던 것을 **자식 y 좌표에서
   유도**하도록 바꿨다. 남는 값(residual)이 곧 미설명분이 되어 stroke 2px 이 드러났다.

교훈: 실측이 기대와 다를 때 **컴포넌트를 고치기 전에 검증식을 먼저 의심**한다.
두 번 모두 원인은 검증 코드였다.

---

## 11. 9·10단계 완료 + 교체 전 사전 점검 결과 (2026-09-14)

`NavItem` (state = active / inactive, 32 고정) 과 `Pagination Item` (state = default / current / disabled, 32×32) 생성 완료.
NavItem 은 활성/비활성이 **색만 다르다**. 현재 화면은 활성 40 / 비활성 32 라 메뉴를 옮길 때마다 목록이 8px 밀렸다.

### 사전 점검(08a) 결론

| 영역 | 결과 |
|---|---|
| 지원 카드 그리드 `1002:140` | **`layoutMode = GRID`**, 자식 12개 모두 `layoutPositioning = AUTO` → **Auto Layout** |
| → Phase E | **독립 실행**한다. 12단계 그리드 재구성과 합치지 않고 기존 Grid 구조를 유지한 채 인스턴스만 교체 |
| 푸터 ↔ 그리드 | **51.5px 겹침** |
| KPI Strip | `counterAxisAlignItems = MIN` → STRETCH 필요 |

### viewportProjection 판정 정정

스크립트는 3행이 219 중 **214.5px(약 98%)** 노출되는 것을 `uxIntentHeld = true` 로 판정했는데, **이 판정 기준이 잘못됐다.**

UX 의도는 "3행이 거의 다 보이는 것"이 아니라 **"2행은 온전히 보이고 3행은 상단 일부만 보여 아래에 더 있음을 암시하는 것"** 이다.
98% 노출은 의도보다 과하다.

- 교체 단계에서는 **현재 배치를 그대로 유지**한다
- 12단계 레이아웃 정리에서 viewport / scroll 영역을 다시 잡는다
- **정확한 3행 노출 px 는 지금 고정하지 않는다.** 최종 레이아웃 육안 검토 후 결정

### 12단계에서 반드시 수정할 항목

1. 푸터 ↔ 그리드 51.5px 겹침 해소
2. 푸터의 absolute positioning 제거
3. KPI Strip `counterAxisAlignItems` MIN → STRETCH (4장 동일 높이)
4. Main content 의 실제 세로 스크롤 구조 정리
5. 4×2 완전 노출 + 3행 상단 일부 노출로 재조정
6. 푸터 문구 "총 20개 중 1-8 표시" 를 연속 스크롤 구조에 맞게 재검토

### 인스턴스 교체 진행 방식

Phase A(단독 Chip) → B(Toolbar) → C(기록 추가) → D(KPI Card) → E(지원 카드 12) → F(NavItem·Pagination).
각 Phase 는 **DRY_RUN → APPLY → 읽기 전용 VERIFY** 순으로 진행하고,
기존 노드는 **삭제하지 않고 `visible = false`** 로 남겨 롤백 경로를 유지한다.

---

## 12. ⚠ 인스턴스 아이콘 슬롯 — 교체 계획의 설계 결함 (2026-09-14)

백업 스크립트를 쓰다가 **앞서 제시한 교체 계획의 전제가 틀렸다는 것을 발견했다.**

### 문제

계획에는 "기존 아이콘/dot 벡터를 **복제해서 인스턴스의 슬롯에 넣는다**" 고 적었다.
**Figma 에서는 불가능하다.** 인스턴스의 구조는 잠겨 있어서 인스턴스나 그 하위 노드에
`appendChild` 로 자식을 추가할 수 없다. 인스턴스에서 가능한 것은 **이미 존재하는 노드의
속성 오버라이드**(fills, strokes, characters, visible, componentProperties 등)뿐이다.

즉 Chip / Button / NavItem / Pagination / Icon Button 의 `leading` · `icon` 슬롯을
**빈 프레임으로 만들어 둔 설계 자체가 작동하지 않는다.** 빈 채로 영원히 남는다.

### 영향 범위

| Phase | 아이콘이 필요한 곳 | 개수 |
|---|---|---|
| A | 시즌 배지 dot, 동기화 배지 dot | 2 |
| B | 검색 Input 아이콘, 초기화 Button 아이콘 | 2 |
| C | 기록 추가 Button 아이콘 | 1 |
| D | KPI1 델타 배지 아이콘 | 1 |
| E | 카드 아이콘 버튼 ×24, 단계 수 배지 아이콘 ×12 | 36 |
| F | NavItem 아이콘 ×6, 페이지네이션 화살표 ×2 | 8 |

Select 의 chevron 은 컴포넌트 안에 직접 그려 넣었고 모든 인스턴스가 같은 모양이라 **영향 없다.**

### 해법 두 가지

**(가) dot 류 — 컴포넌트 안에 실제 shape 를 넣는다**
`leading` 슬롯 안에 8×8 원을 만들어 두고, 인스턴스에서 **fill 색과 visible 만 오버라이드**한다.
dot 은 글리프가 아니라 단색 원이므로 이것으로 충분하다. Phase A 의 배지 2개가 여기 해당한다.
기존 인스턴스에는 슬롯이 숨김 상태라 **시각 변화가 0** 인 추가 변경이다.

**(나) 실제 글리프 — 아이콘을 컴포넌트로 만들고 INSTANCE_SWAP 속성을 쓴다**
Figma 의 표준 패턴이다. 아이콘마다 컴포넌트를 만들고, 슬롯을 그 아이콘의 인스턴스로 둔 뒤
컴포넌트 속성(INSTANCE_SWAP)으로 인스턴스별 교체한다. Phase B~F 가 여기 해당한다.
현재 화면의 벡터 약 15종을 먼저 컴포넌트화해야 한다.

### 결정 대기

이 문제를 풀기 전에는 Phase A 를 포함해 **어떤 교체도 아이콘을 보존할 수 없다.**
컴포넌트 구조 변경이 필요하므로 임의로 진행하지 않는다.

### 아이콘 해법 — 방향 잠정 확정 (2026-09-14)

| 종류 | 방식 |
|---|---|
| dot 류 | Chip `leading` 슬롯 **안에 실제 primitive circle** 을 두고, 인스턴스에서 `visible` / `fill` 만 오버라이드 |
| 실제 glyph 류 | **Icon 컴포넌트**들을 만들고 **INSTANCE_SWAP** 속성으로 인스턴스별 교체 |

### 진행 순서 (확정)

1. `09-backup.js` DRY_RUN → 결과 확인 → APPLY → 백업 검증
2. 그 **이후에** 아이콘 시스템 설계 (별도 단계)
3. 설계 합의 후 컴포넌트 수정 스크립트 작성

### 🔒 마스터 동결

백업이 완료되기 전까지 아래 마스터를 **수정하지 않는다**.

`Chip` · `Button` · `Input` · `Select` · `NavItem` · `Pagination Item` ·
`Icon Button` · `Application Card` · `KPI Card`

`08b`(Chip dot 추가)를 포함해 아이콘 관련 스크립트도 이 시점에는 작성하지 않는다.

---

## 13. 아이콘 시스템 1단계 완료 — Icon Library 17종 (2026-09-14)

`12-v3-icon-library-counts` APPLY. `errorCount: 0`.

| 검증 | 결과 |
|---|---|
| `createdCount` | 17 |
| `counts` | vector 16 / primitive 1 / 축소 2 / 미축소 14 |
| `allCanvas16` · `allCentered` · `allFitCanvas` | true |
| `onlyOversizedWereResized` | true — `Icon / Nav / Memo`, `Icon / Bell` 만 |
| `pathsPreservedForUnresized` | true (14개, 경로 문자열 완전 일치) |
| `aspectPreservedForResized` · `topologyPreservedForResized` | true (2개) |
| `dotCheck` | 8×8 ELLIPSE, fill → `brand/strong` |
| `mainFrameIntact` | true — 원본 `1002:2` 자식 수 불변 |

축소 2건: `Nav / Memo` 16.5×11.27 → 16×10.93 · `Bell` 13.33×16.67 → 12.8×16.
`rescale()` 을 써서 획 두께까지 함께 줄였고 종횡비는 소수 셋째 자리까지 동일하다.

### 이 단계에서 고친 검증 결함 2건

1. **`allPathsPreserved` 가 축소본까지 문자열 일치로 판정** — 축소하면 좌표가 바뀌므로 당연히 실패한다.
   대상을 `unresized`(source 있고 축소 안 된 것)로 좁히고, 축소본은 **종횡비 + 경로 위상**으로 따로 본다.
2. **`Icon / Dot` 전용 검증이 없었다** — source 가 없어 경로 검증에서 빠지는데,
   그 탓에 8×8 이 아니거나 fill 바인딩이 실패해도 통과했다. `dotCheck` 를 추가했다.

검증 대상 개수는 전부 **동적 분류**다(`c.source` 유무와 `c.resized`). 숫자를 하드코딩한 곳은 없다.

---

## 14. 아이콘 시스템 3단계 완료 — Chip leading 전환 (2026-09-15)

`13-v5` APPLY 후 `13b-v2` · `05b-v2` · `06b-v4` 전부 통과.

| 검증 | 결과 |
|---|---|
| Chip variant 5 · 높이 24 · padding 4/8 · gap 4 · radius/full | 유지 |
| leading | Icon 인스턴스 16×16 · visible=false · `Icon / Dot` |
| INSTANCE_SWAP 속성 `leading` | 생성됨 |
| KPI Card 높이 86 | 유지 |
| Application Card 높이 219 · direct 인스턴스 7 | 유지 |

### 이 단계에서 겪은 실패와 원인

**v3 APPLY 실패** — `"in addComponentProperty: Property value is incompatible with component property type"`

INSTANCE_SWAP 속성의 `defaultValue` 는 **컴포넌트 key 가 아니라 노드 id** 다.
같은 호출에서 `preferredValues` 는 `{ type, key }` 로 **key** 를 쓴다. 두 인자가 서로 다른 식별자를 쓴다.

```javascript
addComponentProperty("ButtonIcon", "INSTANCE_SWAP", "2:22" /* id */, { preferredValues: [{type, key}] })
```

v3 는 `defaultValue` 에 key 를 넘겨 실패했고, `preferredValues` 형식 자체는 맞았다.
실패 시점이 첫 단계라 **Chip 은 전혀 변경되지 않았다** (`propertyCreated: false`).

**같은 오류가 검증기에도 있었다** — 13b v1 이 `defaultValue` 를 key 와 비교하고 있어서,
APPLY 가 성공해도 실패로 보고했을 상태였다. 수정과 검증기가 같은 오해를 공유하면
"어느 쪽이 틀렸는지" 를 알 수 없게 된다. 이후 검증기는 **id·key 둘 다 대조하고
어느 쪽으로 매칭됐는지(`defaultValueForm`) 를 보고**하도록 바꿨다.

### stage count Chip

노드 교체로 `leading.visible=true` 오버라이드가 초기화됐다(현재 `false`).
슬롯이 비어 있어 화면 변화는 없으며, 실제 `Icon / Stage Count` 지정은
Application Card 적용 단계에서 명시적으로 처리한다.

---

## 15) 남은 마스터 4종 아이콘 슬롯 — 스크립트 준비 완료 (APPLY 전)

아이콘 시스템의 마지막 단계. Chip(13) · Icon Button(14) 과 같은 방식으로,
남은 네 마스터의 빈 FRAME 슬롯을 Icon 인스턴스 + INSTANCE_SWAP 속성으로 바꾼다.

| 마스터 | id | variant | 속성 | 기본 아이콘 | 슬롯 노출 |
|---|---|---|---|---|---|
| Button | `1029:1997` | 4 | `leading` | `Icon / Plus` | 숨김 |
| Input | `1030:2017` | 3 | `leading` | `Icon / Search` | 숨김 |
| NavItem | `1042:36` | 2 | `icon` | `Icon / Nav / Applications` | **노출** |
| Pagination Item | `1042:46` | 3 | `icon` | `Icon / Chevron Left` | 숨김 |

전부 **기존 마스터를 수정**한다. 삭제·재생성하지 않는다.

### 기하가 안 변하는 이유

Button 과 Pagination 은 슬롯이 12 → 16 으로 커지지만 둘 다 숨김 상태이고,
Button 은 높이 36 고정 · 가로 hug, Pagination 은 32×32 고정이라 외곽이 움직이지 않는다.
Input · NavItem 은 슬롯이 이미 16 이라 변화 자체가 없다.
Icon Button(14) 때는 슬롯이 보이는 상태라 padding 을 6→4 로 함께 줄여야 했지만 여기는 해당 없음.

### 실패 정책

마스터 단위로 순차 처리하고 **한 마스터가 실패하면 그 뒤 마스터는 진행하지 않는다.**
어디까지 끝났는지 결과에 남긴다.

| 필드 | 뜻 |
|---|---|
| `buttonComplete` / `inputComplete` / `navItemComplete` / `paginationComplete` | 마스터별 완료 |
| `stoppedAt` / `failedAt` | 어느 마스터의 어느 단계에서 멈췄는지 |
| `mastersNotStarted` | 앞 마스터 실패로 **시작조차 못 한** 마스터 |
| `<key>Only` | 속성만 만들어지고 variant 슬롯을 하나도 못 바꾼 상태 |
| `<key>Partial` | 일부 variant 만 교체된 상태 |
| `strayInstanceIds` | variant 에 넣지 못하고 페이지에 남은 미아 인스턴스 |

### 사전 조건을 차단용/참고용으로 나눈 이유

부분 적용 후 재실행을 막지 않기 위해서다.
"속성이 아직 없다" "슬롯이 아직 FRAME 이다" 는 **정상 시작 상태이지 통과 조건이 아니다** —
한 번 부분 적용된 뒤에는 둘 다 false 가 되는데, 이걸 차단 조건으로 두면 이어서 돌릴 수가 없다.
그래서 `preflightInfo` 로 빼고 `resumeState`(`untouched` / `propertyOnly` / `partial` / `alreadyDone`)로 보고한다.

### 손대지 않은 마스터를 "기하 파손"으로 오인하던 문제

속성 생성 단계에서 중단하면 기하 측정 코드까지 도달하지 못한다.
초기값이 `false` 였을 때 이 상태가 "외곽이 깨졌다"로 보고됐다 — 실제로는 **아무것도 안 건드린** 상태다.
측정 못 함을 `null` 로 두고, 성공 조건은 `!== false`(명시적 파손만 실패)로 바꿨다.
mock 하네스로 5개 시나리오(정상 / 속성 실패 / 첫 variant 실패 / 중간 variant 실패 / preferredValues 폴백)를
돌려 확인했다.

### 검증 (읽기 전용, 마스터마다 분리)

`15b` Button · `15c` Input · `15d` NavItem · `15e` Pagination Item.
네 개 모두 쓰기 API 를 한 줄도 포함하지 않는다.
`instanceCountRecursive` 는 `findAll` 이 인스턴스 내부까지 재귀하므로 **참고용이며 성공 조건이 아니다.**
`defaultValue` 는 노드 id·컴포넌트 key 양쪽과 대조하고 어느 쪽으로 맞았는지(`defaultValueForm`)를 보고한다.
적용 전/후 mock 양방향으로 돌려, 적용 후 4개 전부 통과·적용 전 4개 전부 실패를 확인했다.

---

## 16) Phase A — 단독 배지를 Chip 인스턴스로 교체 (APPLY 전)

### 통과 조건을 개수에서 분류로 바꿈 (16a v3)

v2 감사 결과: 알려진 후보 3개는 모두 잡혔고(`missingFromScan = []`),
여분 6개는 전부 다른 UI 컨트롤이었다 —
`1009:709` 기록 추가 Button, `1003:1697` 검색 Input,
`1003:1705·1711·1717·1723` Filter Options.

즉 새로 발견된 미확인 Chip 이 아니라 스캐너가 넓게 잡은 것뿐이다.
그래서 **`scanCount = 3` 을 통과 조건에서 뺐다.**
개수를 3으로 맞추려고 임계값을 계속 더하면 언젠가 진짜 Chip 을 놓친다.
같은 이유로 v2 에서 넣었던 가로세로비 조건도 모양 판정에서 뺐다. 기록만 한다.

| 새 통과 조건 | 뜻 |
|---|---|
| `candidateFoundCountIs3` | 알려진 후보 3개가 존재 |
| `allKnownCandidatesScanned` | 3개가 모두 스캐너 조건을 통과 |
| `missingFromScanEmpty` | 스캔에서 빠진 후보 없음 |
| `unexplainedExtraCountZero` | **설명되지 않는** 여분 0개 |

여분은 컨테이너(툴바)·이름·높이 순으로 분류하고 `classifiedBy` 에 근거를 남긴다.
분류 자체가 틀릴 수 있으므로 근거도 검토 대상이다.

### 교체 대상은 2개, 보류 1개

| | 노드 | variant | 라벨 | leading |
|---|---|---|---|---|
| A-1 | `1002:506` v2.4 | `tone=neutral` | `v2.4` | 숨김 |
| A-2 | `1009:703` 시즌 | `tone=brand` | `2026 하반기 시즌` | 노출 · `Icon / Dot` |
| 보류 | `1002:478` 동기화 | — | — | — |

**동기화 배지 보류는 누락이 아니라 결정이다.**
현재 구조가 `bg = surface/subtle` + `text·dot = success/strong` 혼합이라
Chip tone 5종에 정확히 맞는 variant 가 없다.
`tone=success` 로 바꾸면 배경이 `#EFF4FF → #A7FAD4` 로 눈에 띄게 달라져
"구조를 인스턴스로 교체" 라는 목적에 시각 디자인 변경이 섞인다.
`tone=neutral` + fill 오버라이드는 유지보수가 나쁘다 —
Chip 교체 때 `leading.visible` 오버라이드가 초기화된 전례가 있다.
결과에 `Phase A skipped target — deferred sync badge` 로 명시해 누락처럼 보이지 않게 한다.

### 인덱스가 어떻게 되는가

원본이 index `i` 일 때

1. `insertChild(i, 새 인스턴스)` → 새 인스턴스 `i`, 원본은 `i+1` 로 밀림
2. `원본.visible = false` → **순서는 바뀌지 않는다.** 원본은 `i+1` 그대로

최종: 새 인스턴스 `i`, 원본 `i+1`, 형제 수 +1.
`i` 앞 형제는 그대로, `i` 뒤 형제는 한 칸씩 밀린다.
원본이 숨김이므로 **화면상 순서는 교체 전과 같다.**

### 부모 높이는 안 커진다

세 위치 모두 가로 Auto Layout 이고 칩보다 높은 형제가 이미 높이를 정하고 있다.
`parentGrowthPx = 0`, `formulaMatchesMeasured = true`.

### 보고만 하고 고치지 않은 것

시즌 배지의 점 색이 다르다 — `Icon / Dot` 은 `#3525cd`, 원본은 `#4f46e5`.
교체하면 점 색이 바뀐다. 스크립트는 색을 임의로 바꾸지 않고 `dotColorCheck` 로 보고만 한다.
(design-system-diff 에서 `1009:704` 를 `#3525cd` 로 모으기로 한 것과 방향은 같다.)

### mock 으로 확인한 것

DRY_RUN · APPLY 정상 · 아이콘 swap 필요/불필요 양쪽 ·
`setProperties` 가 노드 id 를 조용히 무시할 때 컴포넌트 key 로 폴백 ·
insertChild 실패 시 중단 + 미아 추적 · 교체 전 상태에서 검증기가 전부 실패.

검증기에서 고친 것: `noDuplicateChipUnderParent` 가 칩 0개(=교체 안 됨)까지
중복으로 묶고 있었다. 0개와 2개 이상은 다른 문제라 `exactlyOneChipUnderParent` 로 분리했다.
보류 대상 "손대지 않음" 도 선언이 아니라 크기·색 실측으로 확인하게 바꿨다.

### 16-v2 — dot 색 판정을 "못 읽음" 과 "다름" 으로 나눔

v1 DRY_RUN 이 `originalSeasonDotFill = null`, `matches = false` 를 내고
notes 에 "시즌 dot 색 불일치" 라고 적었다. **디자인 차이가 아니라 읽기 실패였다.**
같은 파일을 16a v3 는 `#3525cd` / `brand/strong` 로 정상적으로 읽었다.

원인: v1 의 dot 탐색이 **직계 자식만** 훑었다. `1009:704` 가 한 단계 아래에 있으면 못 찾고,
못 찾은 것을 그대로 "불일치" 로 확정했다.

고친 것

| | v1 | v2 |
|---|---|---|
| dot 찾기 | 직계 자식에서 ELLIPSE/이름 매칭 | **16a 에서 확인된 노드 id `1009:704` 우선**, 실패 시 depth-3 탐색 |
| 색 읽기 | 노드 자신의 fill 만 | `deepSolidHex` — 자신에 없으면 자식까지 |
| 판정 | `matches` 한 개 (null 이면 곧바로 불일치) | `status` = `same` / `different` / **`undetermined`** |
| 경고 | matches 가 false 면 무조건 | **`different` 일 때만.** `undetermined` 는 "읽지 못했을 뿐" 이라고 명시 |

읽지 못한 것과 다른 것은 다른 상태다. 둘을 같은 값으로 뭉치면
멀쩡한 디자인을 고치려 들게 된다.

mock 으로 세 경우를 확인했다 — dot 을 한 단계 아래로 내린 구조에서
같은 색(`same`) · 진짜 다른 색(`different`) · 한쪽을 못 읽는 경우(`undetermined`).

16b 에도 `seasonLeadingIsIconDot` · `seasonLeadingVisible` 을 별도 성공 조건으로 드러냈다.

### Phase A 완료 (2026-09-15)

| | 원본 | 새 인스턴스 | variant | 라벨 | leading |
|---|---|---|---|---|---|
| A-1 | `1002:506` (숨김, 보존) | `1062:63` | `tone=neutral` | `v2.4` | 숨김 |
| A-2 | `1009:703` (숨김, 보존) | `1062:67` | `tone=brand` | `2026 하반기 시즌` | `Icon / Dot` 노출 `#3525cd` |

부모 높이 34 / 36 / 34.67 모두 유지. duplicate 없음. pageStrays 없음.
`successCriteriaMet = true`, `errorCount = 0` (16-v2 APPLY, 16b-v2 VERIFY).

보류: `1002:478` 실시간 동기화 완료 배지 — 원본 그대로, `visible = true`,
131×24, `#eff4ff`, 옆에 Chip 추가 없음. **누락이 아니라 tone 결정 대기 상태다.**

롤백: 새 인스턴스를 숨기고 원본을 다시 켜면 끝난다. 원본은 삭제하지 않았다.

---

## 17) Phase B — 툴바 컨트롤 (감사 단계)

대상 6개: Input 1 · Select 4 · Reset Button 1.
**Reset 버튼의 node id 는 추측으로 확정하지 않는다.** 이전 감사에서 `1003:1729` 계열로 보였을 뿐이라,
감사 스크립트가 툴바를 훑어 찾고 **무엇으로 맞았는지(`matchedOn`: text / name / text+name)** 를 같이 보고한다.
이름만 맞았으면 경고를 띄운다 — 근거를 잘못 적으면 검토가 불가능해진다.

### gate

| 조건 | |
|---|---|
| `allKnownTargetsFound` | 6개 (Input 1 · Select 4 · Reset 1) |
| `allKnownTargetsScanned` | 6개가 모두 구조 스캔에도 잡힘 |
| `mappingResolved` | 모든 대상이 variant + 라벨을 확정함 |
| `unexplainedExtraCountZero` | 설명 안 되는 여분 0 |
| `layoutImpactMeasurable` | 폭 예측이 전부 가능하고, 높이 공식이 현재 값을 재현함 |

### 폭 예측의 한계를 값에 표시한다

- **Input 만 `exact`** — 새 마스터가 240 고정이다.
- **Select · Button 은 `estimate`** — hug 라 라벨 폭이 폭을 정하는데,
  텍스트 실제 렌더 폭은 노드를 만들어보기 전에는 알 수 없다. 이 스크립트는 쓰기를 하지 않는다.

추정 방법: `마스터 실측 폭 − 마스터 라벨 폭 + 추정 라벨 폭` (+ leading 노출 시 `gap + 16`).
padding · gap · chevron 은 전부 마스터 실측값이 그대로 반영되고, **추정은 라벨 폭 하나뿐**이다.
라벨 폭은 현재 텍스트 노드 폭 × (새 글자크기 / 현재 글자크기) — 두 글자크기 모두 실측이고 비례 가정만 추정이다.
`predictedLow ~ predictedHigh` 는 라벨 폭 ±15% 범위다. 확정은 교체 후 검증기에서 실측한다.

### 숨긴 원본이 자리를 차지하는가

Phase A 가 **실제로 숨긴 원본 노드**를 기준점으로 삼는다 — `1002:506`(v2.4) 와 `1009:703`(시즌).
부모 id 는 추측하지 않고 그 노드에서 거슬러 올라가 잡고, 예상 부모(`1002:495` / `1009:700`)는 대조용으로만 쓴다.
(v1 은 `1002:500` 을 근거로 적었는데 그건 mock 장면에서 나온 id 였다. 실제 파일의 노드가 아니다.)
측정 폭이 "숨김 제외 합계" 와 맞고 "숨김 포함 합계" 와 안 맞으면 숨긴 자식은 자리를 차지하지 않는 것이다.
두 부모를 각각 재고, 판별이 안 되면 `indeterminate` 로 두고 단정하지 않는다.
두 부모가 엇갈리면 `conclusion = null` 이다. 한쪽에서만 판별되면 `decisiveCount` 로 근거가 몇 곳인지 남긴다.
**이 검사는 gate 조건이 아니다.**
(Phase A 에서 부모 높이가 그대로였던 것은 **세로축 증거일 뿐**이라 가로축 근거로 쓰지 않는다.)

### 여러 대상이 한 부모에 있을 때 index 전략

툴바 왼쪽 그룹에 대상이 5개 몰려 있어, 앞에서 삽입하면 뒤 대상의 index 가 밀린다.

**채택: APPLY 직전에 `src.parent.children.indexOf(src)` 를 매번 다시 계산한다.**
descending 순서로 도는 방법도 되지만 "같은 부모·같은 배열" 가정에 기대는 반면,
재계산은 그 가정 자체가 필요 없다. 그 사이에 무엇이 움직였든 맞는 값이 나온다.

추가로 삽입 직후 `indexOf(새 인스턴스) === 재계산 index` 와 `indexOf(원본) === index + 1` 을 확인하고
어긋나면 거기서 멈춘다. 감사 결과의 `indexAtAuditTime` 은 **보고용이며 APPLY 에 쓰지 않는다.**

### 17a-v3 — Reset 구조 탐색 + accessory sibling 분석

v2 결과: `targetCount = 5`, `resetCount = 0`, 후보 0개. 여기서 멈췄다.

#### Reset 을 이름으로 확정하지 않는다

이전에 보였던 `1003:1728 Button:margin` / `1003:1729 Button` / `1003:1732 Container` 를
**Reset 이라고 전제하지 않고**, 존재 여부부터 확인한 뒤 안을 전부 읽는다
(`descendantTexts` 를 depth 12 로 수집, icon-like 자손, ancestry, fills/strokes, index, layoutPositioning).

확정 규칙: 툴바 자손 중 **자손 텍스트**가 Reset 의미와 맞고 배경(fill/stroke)을 가진
**가장 바깥쪽** 노드. 그런 노드가 정확히 하나일 때만 `resolvedId` 를 채운다.
이름만 맞는 것은 `matchedOn: 'name'` 후보로만 올리고 **자동 확정하지 않는다.**

v2 가 못 찾은 이유는 결과의 `descendantTextJoined` 에 그대로 나온다 —
라벨이 다른 문구이거나, 아이콘 전용 버튼이라 텍스트가 없거나 둘 중 하나다.

정규식을 `초기화|리셋|reset|필터 해제|전체 해제|모두 해제` 로 넓혔다.
(heredoc 이 `\s` 의 백슬래시를 삼켜 `s*` 로 들어간 것을 발견해 고쳤다 — 정규식이 조용히 무력화돼 있었다.)

#### accessory sibling — 아이콘 중복 위험

각 wrapper 안에 본체 말고 `Container` 가 하나씩 더 있다.
`parent.visibleChildCount` 가 1로 나온 것은 이들이 **ABSOLUTE** 라 레이아웃에서 빠지기 때문이다.

| host | 본체 | accessory | 예상 역할 |
|---|---|---|---|
| Input | `1003:1697` | `1003:1700` | 검색 아이콘 |
| Select1 | `1003:1705` | `1003:1708` | chevron |
| Select2 | `1003:1711` | `1003:1714` | chevron |
| Select3 | `1003:1717` | `1003:1720` | chevron |
| Select4 | `1003:1723` | `1003:1726` | chevron |

새 마스터가 이미 `Icon / Search` 와 chevron 을 품고 있으므로 그대로 두면 **아이콘이 겹친다.**
따라서 Phase B 는 "본체 6개 교체" 가 아니라
**본체 숨김 + accessory 숨김 + 새 인스턴스 노출** 구조가 될 수 있다.

역할은 증거로만 확정한다 — 자손 텍스트 없음 + 도형 있음 + 28px 이하 + 본체 기준 방향(Input 왼쪽 / Select 오른쪽).
하나라도 어긋나면 `roleConfident = false` 이고 **숨기지 않는다.**
이전 감사의 예상 역할과 일치하는지(`matchesPriorExpectation`)도 같이 보고한다.

#### 폭 판정을 중앙값으로 하지 않는다

`freeSpaceNow` 가 3.18px 다. 툴바가 이미 거의 꽉 찼다.
Select·Button 은 hug 추정치이므로 중앙값만 보고 안전하다고 말하면 안 된다.

| 필드 | 뜻 |
|---|---|
| `predictedOccupiedWidthLow / High` | 라벨 폭 ±15% 범위 |
| `freeSpaceAfterLow` | **남는 공간이 가장 적은 경우** (폭 상한 기준) — 보수적 판정용 |
| `freeSpaceAfterHigh` | 남는 공간이 가장 많은 경우 |
| `collisionRisk` | **`freeSpaceAfterLow` 기준.** 중앙값 기준이 아니다 |
| `includesAllSixTargets` · `usableAsSafetyVerdict` | Reset 이 미확정이면 false — 이 값을 안전 판정에 쓰지 말라는 표시 |

#### 높이 boolean 과 값이 충돌하던 문제

v2 는 `heightGrowthPx = 0.5` 인데 `toolbarActuallyGrows = false` 로 나왔다.
0.5px 허용오차를 boolean 안에 숨겨놔서 값과 판정이 어긋나 보였다. 분리했다.

`tolerancePx` (0.5) · `rawGrowthPx` (실제 계산값) · `effectiveGrowthPx` (허용오차 적용) ·
`toolbarActuallyGrows` (effective 기준). 툴바 높이는 **임의로 고치지 않는다.**

#### gate

`inputFound` · `selectCountIs4` · `resetResolved` · `targetCountIs6` · `allKnownTargetsScanned` ·
`accessoryRolesResolved` · `mappingResolved` · `unexplainedExtraCountZero` ·
`widthImpactIncludesAllSix` · `layoutImpactMeasurable`

Reset 이나 accessory 역할이 미확정이면 `gatePassed = false` 를 유지한다.

### 17a-v4 — Reset resolver 의 자기모순 수정

v3 는 probes 에서 `1003:1728/1729/1732` 모두 `textMatchesReset = true` 를 찍어놓고
최종 `candidateCount = 0` 을 냈다. **탐색 실패가 아니라 선정 조건이 스스로를 부정하고 있었다.**

원인: 후보를 "배경(fill/stroke)을 가진 노드" 로 걸렀다.
기존 Reset 은 ghost 스타일이라 fill 도 stroke 도 없다. 그래서 텍스트가 분명히 잡힌 노드를
같은 스크립트가 전부 버렸다.

**같은 편향이 `looksLikeControl` 에도 있었다** — 배경을 필수로 두어 ghost 컨트롤은
구조 스캔에서도 통째로 빠졌다(`allKnownTargetsScanned = false` 의 원인). padding 을 가진
Auto Layout 도 컨트롤로 보도록 고쳤다.

#### 새 선정 규칙: 배경이 아니라 구조

버튼 몸통 = **아이콘과 라벨을 둘 다 품은 가장 안쪽 노드.** 배경은 조건이 아니라 기록이다.

| 노드 | 아이콘 | 라벨 | 판정 |
|---|---|---|---|
| `1003:1728` | 포함 | 포함 | **A. wrapper / margin** — 자식이 하나뿐이고 그 안에 몸통이 있다 |
| `1003:1729` | 포함 | 포함 | **B. 실제 버튼 몸통** — 둘 다 품은 가장 안쪽 |
| `1003:1732` | 없음 | 포함 | **C. label container** |

아이콘이 아예 없는 텍스트 전용 버튼을 위해, 아이콘 조건이 실패하면
"padding 을 가진 Auto Layout 중 가장 안쪽" 으로 넘어가는 대비책을 뒀다.
그래도 하나로 좁혀지지 않으면 확정하지 않는다.

#### Reset wrapper 전략

`1003:1728` 이 **자식 1개 + 배경 없음** 이면 순수 margin 이다. 그때만 A 를 추천한다.

| | A. wrapper 유지 | B. wrapper 째 숨김 |
|---|---|---|
| 간격 | wrapper padding 이 그대로 유지 | wrapper padding 이 사라져 간격이 바뀜 |
| 폭 | 몸통 폭 변화만 전달 | wrapper padding 만큼 추가로 줄어듦 |
| index | 툴바 직계 자식 순서가 **전혀** 안 바뀜 | 상위 그룹 자식이 바뀌어 다른 대상 index 에도 영향 |

#### variant 판정

배경색 하나가 아니라 **배경 유무 · 테두리 유무 · 각 색** 을 4종과 대조한다.
전부 일치하는 variant 가 하나일 때만 제안하고, 0개거나 2개 이상이면 사람이 정한다고 보고한다.

#### 폭 계산

사용자가 제안한 직접식(`padding + icon + gap + label`)을 교차 검증용으로 넣되
**Button 에만 적용한다.** Select 는 마스터 안에 chevron 과 그 gap 이 더 있어서 이 식으로는 모자란다.
같은 것을 모델링하지 않는 두 식을 비교하면 없는 불일치를 만들어낸다.

현재 라벨 글자크기가 새 마스터와 같으면 비례 가정이 필요 없다 —
`predictionKind = 'measuredLabel'` 이고 상하한 밴드가 0 으로 붙는다.

`collisionRisk` 가 true 면 `widthDeltaBreakdown` 이 기여도 순으로 원인을 보여준다.
폭을 억지로 줄이지 않는다.

#### 교체 계획에 accessory 포함

`replacementPlan` 에 대상별로 `oldBodyToHide` · `oldAccessoriesToHide` · `accessoriesLeftAlone` 을 남긴다.
역할이 확정되지 않은 accessory 는 `accessoriesLeftAlone` 으로 빠지고 **숨기지 않는다.**
모두 삭제하지 않고 `visible = false` 로 보존한다.

### 17a-v5 — coverage 분류 수정 + Input wrapper 축소 타당성

#### 한 스크립트가 같은 노드에 두 결론을 내던 문제

v4 는 Reset 을 구조 resolver 로 확정해놓고 `allKnownTargetsScanned = false` 를 냈다.
모양 스캐너에 안 잡혔다는 이유였는데, **ghost 버튼이 모양 스캔에 안 걸리는 건 결함이 아니라 그 버튼의 성질이다.**
`scannedAsControl` 또는 `independentlyResolvedByStructure` 중 하나면 coverage 로 인정하도록 고쳤다.

같은 종류의 모순이 하나 더 있었다. `1003:1728` 을 `resetRoles` 에서 "A. wrapper / margin" 이라 판정해놓고
`extras` 에서는 "정체 불명" 으로 다시 올렸다. 한 스크립트 안에서 같은 노드에 두 결론을 내는 것이 진짜 오류다.
`resetRoles` · `resetWrapperStrategy` 에서 이미 설명된 노드와, 알려진 대상을 감싸는 wrapper 는
설명된 extra 로 분류한다.

#### Input wrapper 폭 문제

`1003:1697` 은 249 → 240 으로 9px 줄지만, 부모 `1003:1696 Left: Search Box` 가 **FIXED 249** 라
그 절약분이 툴바로 전달되지 않는다. 툴바는 `freeSpaceAfter` 가 음수다.

목적은 "9px 확보" 가 아니라 **wrapper sizing 을 새 Input 구조와 일치시키는 것** 이다.
교체 후 이 wrapper 의 in-flow 내용은 240짜리 새 Input **하나뿐** 이다
(기존 본체는 숨김, 기존 검색 아이콘은 ABSOLUTE 이면서 숨김).

| | A. width 를 240 FIXED | B. sizing 을 HUG |
|---|---|---|
| 변경량 | 속성 1개 (width) | 속성 1개 (sizing mode) |
| 장점 | 현재 sizing 모드를 그대로 둠 | 내용과 일치. 내용이 바뀌면 알아서 맞춰짐 |
| 단점 | 죽은 여백이 생기는 구조는 그대로 | FILL(layoutGrow=1) 자식이 있으면 충돌 |
| **되돌리기** | wrapper 가 240 에 고정돼 249 원본이 넘친다 | **원본을 되살리면 자동으로 249 복귀** |

FILL 자식이 없으면 **B 를 추천**한다. 되돌리기에서 갈린다.

안전성은 계산으로 확인한다 — overflow, ABSOLUTE 자식의 오른쪽 끝이 새 폭을 넘는지,
`clipsContent` 와 겹치는지, `STRETCH`/`SCALE` 제약 때문에 폭이 따라 변하는 자식이 있는지,
툴바가 SPACE_BETWEEN 이라 형제 폭은 안 변하고 간격만 넓어진다는 점.

#### 채택 조건

`recoveredCoversShortfall` · `freeSpaceAfterCandidateNonNegative` ·
`noCollisionConservative` · `inputFitsWithoutOverflow` · `noAbsoluteClipping`

**다섯 개가 전부 참일 때만 `acceptable = true`** 다.
`noCollisionConservative` 는 **보수적 상한** 기준이다 — 중앙값만 0을 넘겨도 채택하지 않는다.
mock 에서 중앙값은 통과하는데 상한에서 걸리는 경우를 만들어, 그때 `acceptable = false` 가 되는지 확인했다.

조건을 못 맞추면 폭을 더 깎지 않고 그 사실만 보고한다.
툴바 폭 976 과 디자인 시스템 마스터는 건드리지 않는다.

## 17 / 17b) Phase B 교체 스크립트 — APPLY 전

### 대상 6개 + accessory 5개

| | 본체 | accessory | 새 변형 | 라벨 | leading |
|---|---|---|---|---|---|
| Input | `1003:1697` | `1003:1700` | `state=default` | 기업명, 직무 검색 | `Icon / Search` 노출 |
| Select1 | `1003:1705` | `1003:1708` | `state=default` | 지원 상태: 전체 | — |
| Select2 | `1003:1711` | `1003:1714` | `state=default` | 전형 상태: 전체 | — |
| Select3 | `1003:1717` | `1003:1720` | `state=default` | 현재 단계: 전체 | — |
| Select4 | `1003:1723` | `1003:1726` | `state=default` | 포지션: 전체 | — |
| Reset | `1003:1729` | — | `variant=ghost` | 초기화 | `Icon / Reset` 노출 |

accessory 는 새 마스터가 같은 아이콘을 품고 있어 겹치므로 같이 숨긴다.
**삭제하지 않는다.** Reset wrapper `1003:1728` 은 visible 유지.

### 텍스트 노드 이름이 마스터마다 다르다

`04-select-input-components.js` 를 읽어보니 Input 은 `placeholder`, Select·Button 은 `label` 이다.
이름을 하나로 가정했으면 Input 라벨을 못 찾았을 것이다.
후보 이름 목록으로 찾고, 실패하면 첫 TEXT 자손으로 넘어가며,
**어느 쪽으로 찾았는지(`라벨노드찾은법`)를 보고한다.**

### index

감사 시점 index 를 쓰지 않는다. 삽입 직전에 `indexOf` 를 다시 계산하고,
삽입 직후 새 인스턴스 = 그 index, 원본 = index + 1 인지 확인하고 아니면 즉시 중단한다.
`indexShiftedSincePlan` 으로 실제로 밀렸는지도 기록한다.

### wrapper sizing 은 마지막에, 별도 mutation 으로

`1003:1696` 을 HUG 로 바꾸는 것은 **6개가 전부 성공했을 때만** 한다.
`wrapperSizingBefore` / `wrapperSizingAfter` / `wrapperWidthBefore` / `wrapperWidthAfter` 를 남기고,
폭이 예상대로 수렴했는지(`widthConverged`)도 확인한다.
중간에 멈추면 `skippedReason` 에 이유가 남는다.

### 폭 예측 — 조건을 셋으로 분해 (v2 에서 수정)

v1 은 "라벨을 새로 쓴다" 를 "문구가 바뀐다" 로 잘못 읽고 글자수비를 걸었다.
**Phase B 의 표시 문구는 기존과 완전히 같다** (`지원 상태: 전체` → `지원 상태: 전체`).
문구가 같은데 글자수비 1 을 곱하는 계산을 끼워넣으면 없는 불확실성을 만들어낸다.

다만 "문구가 같다" 만으로 폭이 같다고 할 수도 없다.
**새 인스턴스의 라벨은 마스터의 typography 로 그려지기 때문이다.**
그래서 조건을 셋으로 나눠 따로 판정한다.

| predictionKind | 조건 |
|---|---|
| `exact` | 마스터가 고정 폭 (Input 240) — 라벨 폭과 무관 |
| `measuredLabel` | 문구 동일 **AND** 글자크기 동일 **AND** 폰트 동일 → 현재 실측 라벨 폭을 그대로 사용, 밴드 0 |
| `estimate` | 셋 중 하나라도 어긋남 → 어긋난 항목을 `estimateReasons` 에 남기고 ±15% |

문구가 같으면 글자수비를 아예 곱하지 않는다 (`labelCharRatio: null`).
`labelComparison` 표에 대상별로 현재/마스터 문구·글자크기·폰트와 판정 근거가 모두 찍힌다.

새 인스턴스의 **최종 폭은 교체 후 17b 에서 반드시 다시 실측**한다는 원칙은 그대로다.

실측 폭이 예측 범위를 벗어나면 notes 에 남기고
**툴바 여유는 예측이 아니라 `toolbarAfter` 실측으로 판단**하라고 명시한다.

### mock 으로 확인한 것

DRY_RUN · APPLY 6개 전부 · 아이콘 swap · id 무시 시 key 폴백 ·
중간 실패 시 중단(`completedTargets` 3개, `stoppedAt`, wrapper `attempted: false`) ·
VERIFY 통과. 툴바 폭 기대값이 다를 때 검증기가 실패하는 것도 확인했다.

### 17-v3 / 17b-v2 — 부모 예상 높이 수정 + Reset 폭 기준 확정

#### 부모 예상 크기에 높이가 빠져 있었다

v2 는 부모의 **폭만** 계산하고 높이는 기존 값을 그대로 붙였다.
새 컨트롤이 36인데 부모가 30/32 로 보고돼서 값끼리 모순이었다. 보고값 오류다.

`predictParentBox()` 로 가로·세로를 같이 계산한다.
가로 Auto Layout 이면 폭은 합계·높이는 가장 높은 자식, 세로면 폭은 가장 넓은 자식·높이는 합계.
`layoutSizingHorizontal` / `layoutSizingVertical` 을 각각 보고 HUG 인 축만 예측값을 쓴다.
`parentPredictedHeight` · `parentLayoutMode` · `parentPredictionBasis` 를 결과에 드러냈다.

Input wrapper 는 **두 단계**로 나눠 보고한다 —
`stageAfterReplacement`(아직 FIXED 249×36) 와 `stageAfterHug`(240×36).
한 값으로 뭉뚱그리면 언제 무엇이 바뀌는지 안 보인다.

툴바 높이도 `tallestChildAfter + 세로 padding` 으로 계산하고
`tolerancePx` / `rawGrowthPx` / `effectiveGrowthPx` / `toolbarActuallyGrows` 를 분리해 낸다.
**툴바 높이는 이번 단계에서 고치지 않는다.**

#### Reset 폭 66 은 스크립트가 이미 ghost 기준으로 계산하고 있었다

`62 − 54 + 38 + 20 = 66`, wrapper `70`.
17a-v5 의 82 는 primary variant 폭 78 을 쓴 값이었고, 대상은 ghost 이므로 66 이 맞다.
스크립트는 `variants[t.variant]` 로 ghost 를 직접 읽으므로 고칠 것이 없었다.
**17b 에도 82/86 같은 옛 값은 들어 있지 않았다.**

#### 검증기는 폭을 숫자로 고정하지 않는다

`REFERENCE_WIDTHS` 는 **참고값이며 통과 조건이 아니다** (Input 240 만 예외 — 마스터 고정 폭이라 확정이다).
Reset 은 ghost variant · 라벨 · leading 구조가 맞는지 확인하고 **실측 폭을 기록**한다.
참고값과 다르면 notes 에 남기되 실패로 보지 않는다.
폭을 특정 숫자로 고정하면 마스터가 조금만 바뀌어도 멀쩡한 결과가 실패로 나온다.

추가된 통과 조건: `allControlsAre36High`, `hugParentsFollowControlHeight`
(세로 HUG 인 부모는 새 컨트롤 높이를 따라와야 한다).

### Phase B 완료 (2026-09-15)

| | 새 인스턴스 실측 | 원본 | accessory |
|---|---|---|---|
| Input | 240×36 | `1003:1697` 숨김 | `1003:1700` 숨김 |
| Select1~3 | 133×36 | `1003:1705/1711/1717` 숨김 | `1003:1708/1714/1720` 숨김 |
| Select4 | 117×36 | `1003:1723` 숨김 | `1003:1726` 숨김 |
| Reset | 82×36 (wrapper 86×36) | `1003:1729` 숨김 | — |

툴바 976×60 · occupied 973 · freeSpace 3 · overflow 없음 · 중복/미아 없음 ·
Input wrapper HUG 정상. `successCriteriaMet = true`, `errorCount = 0`.

#### ⚠ 폭 예측식이 Reset 에서 16px 빗나갔다 — 원인 미확인

예측 66 (wrapper 70), 실측 82 (wrapper 86). 차이 16 은 **leading 슬롯 폭과 정확히 같다.**

쓴 식은 `마스터 폭 − 마스터 라벨 폭 + 우리 라벨 폭 + (아이콘 16 + gap 4)` 였다.
이 식은 "마스터 폭에 이미 들어 있는 라벨 폭을 빼고 우리 것을 넣는다" 는 전제인데,
**그 전제가 성립하는지 한 번도 확인하지 않았다.**

의심 가는 곳: `loadSet()` 이 `labelWidth` · `refGap` · `refPaddingH` 를
`set.children[0]`(= primary variant)에서 읽는데, 폭은 대상 variant(ghost)에서 읽는다.
**두 값이 다른 variant 에서 온다.** variant 마다 라벨 샘플이나 gap 이 다르면 그만큼 어긋난다.
다만 16 이라는 차이가 정확히 leading 슬롯 폭과 같은 것도 우연으로 보기 어려워
어느 쪽이 원인인지 지금 단정하지 않는다.

**Phase C 대응**: 감사 단계에서 마스터 내부를 직접 재서
`보이는 자식 폭 합 + gap + padding == 마스터 폭` 이 성립하는지 먼저 확인한다(`masterArithmeticCheck`).
성립하지 않으면 그 마스터에 대해서는 폭 예측을 신뢰하지 않는다고 표시한다.
이 값 차이는 Phase B 실패가 아니다 — 실측이 기준이고 툴바는 여유 3px 로 들어갔다.

## 18a) Phase C 사전 감사 — '지원 기록 추가' Primary Button

대상은 1개뿐이지만 **id 를 추측으로 확정하지 않는다.**
이전 감사에서 `1009:709` 로 보였으나 그때는 "여분" 으로 분류만 하고 지나갔다.
Reset 때와 같은 규칙으로 다시 찾는다 — 아이콘과 라벨을 둘 다 품은 **가장 안쪽** 노드,
배경 유무는 조건이 아니다(ghost 를 놓치지 않기 위해).

### 상위 컨테이너를 몸통으로 오인하던 문제

mock 으로 "아이콘이 몸통 밖 형제로 붙어 있는" 구조(= Phase B 의 accessory 와 같은 모양)를
만들어보니, "아이콘 + 라벨을 둘 다 품은 노드" 가 **상위 행** 이 되어
라벨이 엉뚱하게 `지원 현황` 으로 잡혔다. 조용히 틀리는 종류의 오류다.

그래서 후보를 거를 때 **자손 텍스트가 전부 대상 문구인 노드만** 남긴다.
대상 밖 텍스트를 품고 있으면 위로 너무 올라간 것이다. 높이도 컨트롤 범위(24~48)로 제한한다.
걸러진 이유는 `excludedReason` 에 남고, 확정된 라벨은 `resolvedLabel` 로 보고하며
`resolvedLabelIsTarget` 이 gate 조건이다.

고친 뒤 두 구조 모두에서 `1009:709` 를 정확히 잡고,
아이콘이 밖에 있는 경우에는 `oldAccessoriesToHide: ["1009:713"]` 까지 계획에 들어간다.

### Phase B 의 폭 예측 실패를 값으로 달고 다닌다

Reset 에서 같은 식이 16px 빗나갔고 원인을 모른다. 그래서 두 가지를 바꿨다.

1. 라벨 폭·gap·padding 을 **대상 variant 에서** 읽는다 (Phase B 는 `variants[0]` 에서 읽었다).
2. `masterArithmeticCheck` — `보이는 자식 폭 합 + gap + padding == 마스터 폭` 이 성립하는지 먼저 확인한다.
   성립하지 않으면 `formulaTrustworthy = false` 로 표시하고 예측을 쓰지 말라고 한다.
   `gate.masterArithmeticValid` 로도 막는다.

예측값에는 `phaseBMiss` 문구가 함께 붙어 나간다 — 이 값은 참고용이고 확정은 교체 후 실측이다.

### gate

`targetResolved` · `resolvedLabelIsTarget` · `targetIsSingleCandidate` · `buttonSetFound` ·
`primaryVariantExists` · `leadingPropertyExists` · `plusIconFound` · `leadingDefaultIsPlus` ·
`iconStructureResolved` · `variantChoiceResolved` · `masterArithmeticValid` · `layoutImpactMeasurable`

`variantChoiceResolved` 는 배경·테두리가 모두 일치하는 variant 가 **하나뿐일 때만** 참이다.
색 대조 결과가 요청(`variant=primary`)과 다르면 notes 로 알린다 — 색을 임의로 정하지 않는다.

### 18a-v3 — SPACE_BETWEEN 부모에서 gap 을 고정 간격처럼 더하던 오류

v2 는 부모 내용 폭을 `자식 폭 합 + gap × (개수−1) + padding` 으로 계산했다.
부모 `1009:715` 는 **SPACE_BETWEEN + 고정 폭 976** 이라 `itemSpacing` 이 쓰이지 않는다.
남는 공간이 자식 사이로 재분배되는데 gap 421 을 고정 간격처럼 더해서
`493 + 421 + 98 = 1012` 가 되어 **없는 overflow 를 만들어냈다.**

(이 성질은 5단계 KPI Card 때 이미 기록해둔 것이었다 — 같은 함정에 두 번 걸렸다.)

#### 기하로 계산한다

`primaryAxisAlignItems === 'SPACE_BETWEEN'` 이고 주축이 고정이면
내용 합으로 폭을 정하지 않고 **실제 x 좌표**로 배치를 다시 계산한다.

자식을 x 순으로 세우고, `남는 공간 ÷ (개수−1)` 을 간격으로 놓아 위치를 재배치한다.
그리고 **그 모델이 현재 x 좌표를 재현하는지 먼저 확인**한다 (`geometryModelMatchesMeasured`).
재현하지 못하면 예측 위치를 확정값으로 쓰지 말라고 표시한다.

출력: `currentActualSpaceBetween` · `predictedSpaceBetween` · `targetXCurrent` · `targetXPredicted` ·
`targetRightEdgePredicted` · `parentRightEdge` · `availableSpaceBetween` · `shiftPx` ·
`overlapRisk` · `overflowRisk` · `spaceBetweenReflowsSafely`

#### gate

`layoutImpactMeasurable` 은 이제 기하 계산이 실제로 성립할 때만 참이다 —
모델이 현재 배치를 재현하고, 예측 간격과 남는 공간이 0 이상이며,
오른쪽 끝이 부모 안쪽 끝을 넘지 않고, overlap·overflow 가 모두 false 일 때.

자리가 부족하면 `note` 가 원인을 나눠서 말하고 notes 에도 남는다.
mock 으로 정상·자리부족 두 경우를 확인했다.
(경고 문구가 판정과 어긋나 "겹치는데 안 넘친다" 고 말하던 것도 같이 고쳤다.)

## 18 / 18b) Phase C 교체 스크립트 — APPLY 전

대상 1개. `1009:709` "기록 추가" → Button `1029:1997` / `variant=primary` /
라벨 `기록 추가` / leading `Icon / Plus` 노출. accessory 없음(아이콘이 몸통 안).
원본은 삭제하지 않고 `visible = false`.

### preflight 14개

대상 존재·노출 · 부모 존재 및 예상 id 일치 · Button set · primary variant ·
leading 속성 · Icon / Plus · 라벨 일치 · **아이콘이 몸통 안인지** ·
**형제 accessory 가 없는지** · 폭 예측 가능 · **기하 모델이 현재 배치를 재현** ·
**SPACE_BETWEEN 재배치가 안전**.

감사에서 "accessory 없음" 이라 했어도 APPLY 시점에 형제 accessory 가 보이면
preflight 에서 걸리고, 확인 전에는 숨기지 않는다.

### SPACE_BETWEEN 을 DRY_RUN 에서도 기하로 계산

`itemSpacing` 을 고정 간격으로 더하지 않는다. 자식을 x 순으로 세우고
`남는 공간 ÷ (개수−1)` 로 재배치한 뒤, **그 모델이 현재 x 좌표를 재현하는지 먼저 확인**한다.
출력: 부모 폭·오른쪽 끝, 왼쪽 형제 오른쪽 끝, 현재/예상 x, 예상 오른쪽 끝,
현재/예상 간격, 남는 공간, 이동량, `overlapRisk` · `overflowRisk` · `spaceBetweenReflowsSafely`.

APPLY 뒤에는 `geometryAfter` 로 **실제** x·오른쪽 끝·간격을 다시 재고 겹침/넘침을 확인한다.

### 폭은 기록하고 고정하지 않는다

`REFERENCE = { width 98, x 878, spaceBetween 385 }` 는 **참고값이고 통과 조건이 아니다.**
실측과의 차이는 notes 로 남긴다. Phase B 에서 예측이 16px 빗나갔지만
실측이 기준이었고 레이아웃은 멀쩡했다 — 같은 원칙을 유지한다.

### mock 으로 확인한 것

DRY_RUN · APPLY 정상 · 아이콘 swap · insertChild 실패 시 중단 +
`instanceCreatedNotInserted` + 미아 추적 · 교체 전 상태에서 검증기 전부 실패.

### Phase C 완료 (2026-09-15)

`1009:709` 원본 숨김 보존 → 새 Button 인스턴스 **98×36**, x 878, 오른쪽 끝 976,
왼쪽 형제와 간격 385. 부모 `1009:715` 976×60 유지. overflow·overlap·중복·미아 없음.
`successCriteriaMet = true`, `errorCount = 0`.

SPACE_BETWEEN 기하 예측(x 878 / 간격 385)이 실측과 일치했다.
18a-v2 가 gap 421 을 더해 계산했던 1012 는 실제로 존재하지 않는 값이었다.
