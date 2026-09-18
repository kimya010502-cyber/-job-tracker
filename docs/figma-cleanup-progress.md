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

## 19a) Phase D 사전 감사 — KPI Card 4개

이전 값을 하드코딩하지 않는다. KPI Strip `1002:23` 의 현재 상태를 다시 읽는다.
이미 KPI 인스턴스인 자식은 교체 대상에서 빼고 `alreadyReplacedIds` 로 보고한다.

### 텍스트 역할을 이름에 기대지 않는다

제목 = 가장 위 텍스트 / 값 = 가장 큰 글자 / 보조 = 가장 아래 텍스트.
판정 근거(`역할판정근거`)를 같이 싣는다. 노드 이름은 파일마다 다르고 믿을 수 없다.

### variant 매핑 — 감으로 정하지 않는다

측정 가능한 신호 **두 개**를 따로 읽는다.

| 신호 | 어떻게 |
|---|---|
| 색 | 현재 배지의 배경색·변수가 어느 variant 배지와 맞는가 |
| 문구 | 보조 문구에 `+숫자` / `−숫자` 나 증가·감소·탈락 같은 말이 있는가 |

| 결과 | confidence |
|---|---|
| 둘이 일치 | `high` — 그 tone 으로 제안 |
| 색만 결정적 | `medium` — 색을 따른다 (시각적으로 그대로 유지되는 쪽) |
| 색이 어느 variant 와도 안 맞음 | **`low` — 제안하지 않는다** |

마지막 경우가 중요하다. 문구만 보고 정하면 **배지 색이 말없이 바뀐다.**
`+12 전월 대비` 라서 positive 로 잡고 싶어지지만, 현재 배지가 브랜드 보라색이면
positive(초록)로 바꾸는 순간 화면이 달라진다. 그건 구조 교체가 아니라 디자인 변경이다.
`variantMappingResolved` 는 4장 모두 `resolved`(= confidence 가 low 가 아님)일 때만 참이다.

### FILL 여부가 이번 단계의 핵심

마스터 폭만 보고 판단하면 안 된다. 현재 카드가 strip 안에서 **FILL 로 늘어나 있는지** 먼저 본다.

- 현재 FILL + 마스터 고정 폭 → `fillMustBeSetExplicitly = true`.
  삽입 후 `layoutSizingHorizontal` 을 FILL 로 바꿔주지 않으면
  카드가 마스터 폭으로 쪼그라들고 오른쪽에 빈 공간이 생긴다.
- 현재 고정 폭 → `마스터 폭 × 4 + gap × 3 + padding` 으로 overflow 를 계산한다.
- 카드마다 sizing 이 다르면 한 가지로 예측하지 않고 `mixedSizingWarning` 을 낸다.

### gate

`stripFound` · `fourCardsResolved` · `noDuplicateCandidates` · `kpiSetFound` ·
`requiredVariantsExist` · `everyCardHasTitle/Value/Support` · `variantMappingResolved` ·
`parentStripResolved` · `layoutImpactMeasurable` · `overflowRiskFalse` · `replacementOrderMeasurable`

같은 부모에 4개가 있으므로 APPLY 는 대상마다 삽입 직전에 `indexOf` 를 다시 계산한다
(`orderNote`). 감사 시점 index 는 보고용이다.

### 19a-v2 — 역할 판정 두 곳을 고침

#### 기존 카드: unit 과 caption 을 같은 노드로 잡고 있었다

v1 은 "가장 아래 텍스트 = 보조 문구" 로 잡아서 **support 가 전부 `건`** 이 됐다.
`건` 은 단위지 설명이 아니다.

v2 는 **배지 안 텍스트를 먼저 빼고** 나머지에서 나눈다.

| 역할 | 판정 |
|---|---|
| value | 가장 큰 글자 |
| unit | 값과 **같은 줄**에 있는 3자 이하 짧은 텍스트 |
| title | 남은 것 중 가장 위 |
| caption | 남은 것 중 가장 아래 (**없는 카드도 있다**) |
| badgeText | 배지 안 텍스트 |

`이번 달 지원` 과 `최종 합격` 은 별도 caption 이 없고 배지 문구만 있다.
그래서 `everyCardHasSupport` 를 무조건 요구하지 않고,
**마스터에서 caption 이 optional 인지 확인한 뒤** `captionHandlingValid` 로 판단한다.

#### 마스터: 위치 추론만 써서 title 에 number 가 들어갔다

마스터는 이름이 명확하다 (`05-kpi-card-component` 가 label / number / unit / caption 으로 만들었다).
**이름을 먼저 쓰고 이름이 없을 때만 위치 추론으로 넘어간다.** 어느 쪽으로 정했는지 `roleSource` 에 남는다.

`titleNode` · `valueNode` · `unitNode` · `captionNode` · `badgeNode` · `badgeLabelNode` 를 분리해 내고,
`roleUniqueness` (exactlyOneTitle / Value / Unit / Caption / Badge) 를 gate 에 넣었다.

#### variant 매핑 — 사람 확정

Phase D 의 목적은 기존 예외를 복제하는 게 아니라 KPI 규칙대로 **정규화**하는 것이다.

| 카드 | finalVariantDecision |
|---|---|
| 이번 달 지원 | `delta=positive` |
| 진행 중 | `delta=positive` |
| 이번 달 불합격 | `delta=negative` |
| 최종 합격 | `delta=neutral` |

`decisionSource = "human-confirmed"`. **신호 판정(색·문구)은 지우지 않고 그대로 남긴다** —
사람 결정과 다르면 `decisionDiffersFromSignals` 로, 배지 색이 바뀌면 notes 로 드러난다.
무엇이 달라지는지 보이지 않으면 "정규화" 와 "실수" 를 구분할 수 없다.

#### FILL 문구 정정

`235×4 + 12×3 = 976` 이라 현재 폭에서는 **우연히 정확히 맞는다.**
그래서 "FILL 로 안 바꾸면 오른쪽에 빈 공간이 생긴다" 는 틀린 말이었다.

정정: 지금 당장 빈 공간이 생기지는 않지만, 기존 카드가 FILL 이므로
**반응형 sizing 의미를 보존하려면** 새 인스턴스에도
`layoutSizingHorizontal = FILL` / `layoutGrow = 1` 을 명시해야 한다.
안 하면 strip 폭이 바뀌는 순간 카드가 따라오지 않는다.
`fillMustBeSetExplicitly = true` 는 유지하고 `fillWidthCoincidence` 를 따로 낸다.

#### 높이 변화

`currentHeight` · `masterHeight` · `predictedFinalHeight` · `heightDelta` ·
`intentionalFromMaster` · `intentionalBasis` 를 출력한다.

"의도된 값인가" 를 선언하지 않고 **잰다** — 마스터 높이가 세로 HUG 이고
자기 내부 구성 합과 일치하면 마스터 구조에서 나온 값이다.
일치하지 않으면 "어디서 나온 높이인지 확인이 필요하다" 고 말하고 gate 를 막는다.

주변 영향도 본다: strip 부모가 세로 HUG 면 높이 변화가 전달되고,
고정이면 strip 이 줄어도 아래 요소가 올라오지 않는다 (`surroundingImpact`).

### 19a-v3 — mapping 에서 caption 유실 + caption 처리 방법 확정

#### 같은 버그를 한 단계 아래에서 반복했다

v2 는 카드 쪽 역할 판정은 고쳤는데, `mapping` 을 만드는 곳에서 여전히 `c.support` 를 읽고 있었다.
v2 에서 **내가 없앤 필드**다. 그래서 네 카드 모두 `support: null` 이 됐다.
이름을 `caption` 으로 통일하고, `allCaptionMappingsCorrect` 를 gate 에 넣어
카드 쪽 값과 mapping 쪽 값이 같은지 **기계가 대조**하게 했다.

#### captionIsOptional 정의가 틀렸다

v2 는 "`caption` 이라는 이름의 노드가 **없으면** optional" 로 봤다.
반대다. 노드가 **있고 기본값이 숨김** 이면 optional 이다 — 그게 마스터가 선택적으로 만든 방식이다.
(05b 가 `captionHidden` 을 통과 조건으로 두고 있었다.)

#### 두 방법을 계산해서 비교한다

| | A. 빈 문자열 | B. `visible = false` |
|---|---|---|
| 카드 높이 | caption 줄이 그대로 남음 | 그 줄이 통째로 사라짐 |
| "caption 없음" 재현 | **못 한다** — 빈 줄이 남는다 | 한다 |
| 인스턴스 오버라이드 | 가능 | 가능 (단 Chip 때 visible 오버라이드가 초기화된 전례 — APPLY 후 되읽기) |

**B 를 택한다.** 근거는 마스터 구조에서 계산한 높이다.

#### 카드별 caption action

| 카드 | captionSource | captionAction | captionValue |
|---|---|---|---|
| 이번 달 지원 | null | `hide` | null |
| 진행 중 | 파이프라인 70.0% | `set` | 파이프라인 70.0% |
| 이번 달 불합격 | 탈락률 30.0% | `set` | 탈락률 30.0% |
| 최종 합격 | null | `hide` | null |

마스터 caption 이 기본 숨김이면 `set` 하는 카드는 **`visible = true` 로도 켜야 한다**
(`captionMustBecomeVisible`).

#### ⚠ 그 결과 카드 높이가 갈린다

caption 을 켜는 카드가 그만큼 높아진다. `predictedHeightAfterContentOverrides` 를 카드별로 내고,
갈리면 `stripConsequence` 로 **strip 최종 높이 · `counterAxisAlignItems` 영향 · 아래쪽 정렬 차이**
를 구체적으로 말한다. MIN 이면 카드들이 위로 정렬되고 아래쪽이 들쭉날쭉해진다.

높이를 억지로 맞추지 않는다. caption 을 네 장 모두 쓸지 / 모두 안 쓸지 / 이대로 둘지는
교체 전에 정해야 할 디자인 결정이다.

## 19 / 19b) Phase D 교체 스크립트 — APPLY 전

KPI 4장을 `1033:2085` 인스턴스로 교체. 부모 strip `1002:23`.

| 원본 | variant | 제목 / 값 / 단위 | caption | 배지 |
|---|---|---|---|---|
| `1002:24` | `delta=positive` | 이번 달 지원 / 20 / 건 | **hide** | +12 전월 대비 |
| `1002:42` | `delta=positive` | 진행 중 / 14 / 건 | set 파이프라인 70.0% | +8 |
| `1002:60` | `delta=negative` | 이번 달 불합격 / 6 / 건 | set 탈락률 30.0% | +4 |
| `1002:78` | `delta=neutral` | 최종 합격 / 0 / 건 | **hide** | 시즌 목표 1개사 |

역할 노드는 **이름 우선** (`label`/`number`/`unit`/`caption`, 배지 인스턴스 안 `label`),
없을 때만 위치 추론. 어느 쪽으로 찾았는지 `roleSource` 에 남는다.

caption 은 `hide` → `visible=false`, `set` → `characters` + `visible=true` 이고
**둘 다 되읽는다.** Chip 때 visible 오버라이드가 초기화된 전례가 있다.

FILL 은 삽입 후 `layoutSizingHorizontal = FILL` · `layoutGrow = 1` 을 명시하고 되읽는다.
`1002:24` 안의 기존 vector 는 old body 내부 요소라 원본을 숨기면 같이 사라진다 —
**누락이 아니라 DS 구조로의 의도된 정규화**이고 그 사실을 notes 에 남긴다.

### APPLY 가 높이를 안 보고 "전부 성공" 이라고 말하던 문제

mock 에서 카드 높이가 122 / 138 로 갈렸는데 **APPLY 는 `successCriteriaMet: true`** 를 냈다.
높이를 `notes` 에만 적고 성공 조건에 넣지 않았기 때문이다. 검증기만 잡았다.

`allCardHeightsMatchPrediction` 과 `allCardsSameHeight` 를 APPLY 성공 조건에 넣고,
높이가 갈리면 note 가 아니라 **error** 로 올린다.
검증기에도 `heightAnalysis.captionAffectsHeight` 를 넣어,
caption 이 높이를 바꾸면 "감사의 전제(가로 footer row 안이라 높이 무관)가 깨졌다" 고 스스로 말하게 했다.

### mock 으로 확인한 것

DRY_RUN · APPLY 4장 전부 · caption hide/set 되읽기 · FILL 적용 ·
3번째 카드에서 삽입 실패 시 `completedTargets ["c1","c2"]` / `targetsNotStarted ["c4"]` /
`stoppedAt c3` / `c3InstanceCreatedNotInserted` + 미아 1개 / VERIFY 통과.

### 19-v2 — sizing 요구를 반쪽만 검사하던 문제 + 높이 preflight

#### layoutGrow 실패를 note 로만 남겼다

v1 은 `layoutGrow = 1` 설정이 실패하면 note 만 남기고 넘어갔고,
`sizingSet` 은 `layoutSizingHorizontal === 'FILL'` 하나만 봤다.
그래서 실제 상태가 **FILL / grow 0** 인데 `successCriteriaMet = true` 가 될 수 있었다.

Phase D 의 sizing 요구는 **FILL 그리고 grow 1** 이다. 둘 다 조건으로 올렸다.

- `layoutGrow` 설정 실패 → `throw`
- `sizingFillOk` · `layoutGrowOk` 를 따로 되읽고 하나라도 다르면 중단
- `sizingSet = sizingFillOk && layoutGrowOk`
- successCriteria 에 `allSizingSetToFill` · **`allLayoutGrowOne`** · `allSizingRequirementsMet` 을 각각 둔다
- 결과에 `sizingReadBack` 표를 따로 낸다 (카드별 두 값 + 요구사항 문구)

mock 에서 `layoutGrow` 를 조용히 무시하는 상황을 만들어, 첫 카드에서 멈추고
`allLayoutGrowOne` 만 실패하고 `allSizingSetToFill` 은 통과하는 것(둘이 분리됨)을 확인했다.

#### 예상 높이가 갈려도 mutation 이 시작될 수 있었다

`allCardsSameHeightAfterOverrides` 를 계산해놓고 preflight 에 넣지 않았다.
`allPredictedCardHeightsSame` 을 preflight 에 추가했다. false 면 **APPLY 를 시작하지 않는다.**

#### strip 높이 조건은 86 을 박지 않았다

`predictedStripHeightMatchesDesign: near(..., 86)` 대신
**`predictedStripHeightDerivesFromMaster`** 를 쓴다 —
`예상 strip 높이 == 마스터 카드 높이 + strip 세로 padding` 인지 확인한다.

같은 보장을 숫자 없이 얻는다. 86 을 박으면 마스터를 한 번만 손봐도
멀쩡한 결과가 실패로 나온다. 86 은 `designReferenceHeight` 로 남기고 차이만 보고한다.

mock 에서 variant 하나를 20px 높게 만들어 DRY_RUN 이
`aborted: true` 로 멈추는 것을 확인했다.

### Phase D 완료 (2026-09-15)

KPI 4장 모두 **235×86**, strip **976×86**, gap 12, sizing FILL, `layoutGrow` 1.
`captionAffectsHeight = false` — caption 이 가로 footer row 안이라 높이에 영향이 없다는
감사의 전제가 실측으로 확인됐다. overflow 없음, 미아 없음.
`successCriteriaMet = true`, `errorCount = 0`.

배지 색 정규화(`이번 달 지원` 보라 → success, `진행 중` 민트 → success)는 의도된 변경이다.

## 28a) Phase G1 사전 감사 — View Toggle (읽기 전용, 2026-09-18)

`28a-G1-v1-viewtoggle-audit`. 아무것도 바꾸지 않는다.

시작 전에 기록에서 확인한 사실:

- 뷰 토글 아이콘 2개(`1003:1738` table, `1003:1741` card, 13.5×13.5)는 Icon Library 를 만들 때
  **일부러 보류**했다 (`icon-system-design.md` §0-3). 즉 Icon Library 17종에는 뷰 아이콘이 없다.
- `design-system-diff.md` 는 토글 높이를 28 로 제안했지만, Phase B 이후 툴바 컨트롤 실측은 **36** 이다.
  높이는 제안값이 아니라 감사의 `toolbarVisibleInstanceHeights` 실측으로 정한다.
- Phase B 완료 시 툴바 여유 폭이 3px 였다. 토글 폭이 바뀌면 넘칠 수 있으므로 `toolbarFreeSpace` 를 본다.

### 28a 결과 + MCP 실측 (`get_metadata 1003:1695`, 1회)

28a: `toggleFound` true · `1003:1735` · legacyId 와 구조 탐색 일치 · `errorCount` 0 · 선택 상태 = card.
MCP 한도는 2026-09-18 기준 **다시 남아 있음** (§5 의 "20/20 소진" 은 당시 상태).

| 항목 | 실측 |
|---|---|
| 툴바 | 976×60, padding 12, 자식 y=12 / h=36 → 세로 정중앙. 검색 12..252, 필터 그룹 267..964 → **freeSpace 15** |
| 필터 그룹 `1003:1703` | 697×36, 자식 x = 0 / 141 / 282 / 423 / 548 / 642 → **gap 8** |
| Reset wrapper `1003:1728` `Button:margin` | 86×36, 안의 인스턴스 x=**4** |
| Toggle wrapper `1003:1734` `Margin` | 55×35.5, y=0.25, 안의 `1003:1735` x=**4** |

두 wrapper 모두 왼쪽 4 — HTML `margin-left` 가 frame 으로 변환된 흔적이다.
결과적으로 보이는 간격은 Select↔Select **8**, Select→초기화 **12**, 초기화→토글 **12** 로 일관된다.
`Margin` 만 지우면 초기화→토글만 8 이 되어 리듬이 깨진다.

## 29) Phase G1-A — View icon 2종 + View Toggle Component Set (DRY_RUN 전)

확정: 교체 범위 A안 (`1003:1735` 만 교체, `1003:1734 Margin` 유지 — wrapper 는 G5 에서 `1003:1728` 과 함께).
아이콘 마스터 기본 색은 둘 다 `text/muted`, 상태 색은 View Toggle variant 안에서만 override.

| 만드는 것 | 사양 |
|---|---|
| `Icon / View / Table` · `Icon / View / Card` | 16×16, glyph = `1003:1738` / `1003:1741` clone, 13.5 그대로 · 1.25 중앙, 경로 문자열 일치 검증. 12 의 격자(6열·56) 17·18번 칸 |
| `View Toggle` (set) | `view = table \| card` 하나뿐. variant 52×36 FIXED · padding 4 · gap 0 · `radius/md` · `surface/subtle` |
| segment | 22×28 FIXED · 중앙 · `radius/sm`. 선택 = `surface/default` + `elevation/card` + 아이콘 `brand/strong`, 비선택 = 없음 + 아이콘 `text/muted`(명시 override) |

preflight 12개 (이름 충돌 · 변수 6 · effect style · radius 값 8/4 · source 조건 · Icon 17종 · 격자 · 칸 비어 있음 · 세트 위치 · 산술).
보호: `1002:2` 전체 · source 2 · Icon 17 · `1019:115` · `1044:160` 을 snapshot 해시로 전후 대조.
실패 시 만든 노드를 역순으로 전부 지우고, 남은 것 0 과 보호 대상 불변을 다시 확인한다.
성공 시에만 `joob.G1A.baseline` 을 남긴다 (verifier 29b 용).

mock 으로 확인: DRY_RUN 통과 · APPLY `successCriteriaMet` true · 3번째 frame 생성에서 강제 실패 → rollback 6개, leftovers 0, 보호 대상 불변.

### 29 APPLY 결과 (2026-09-18)

`successCriteriaMet` true · `failedCriteria` [] · `errorCount` 0 · `protectedDiff` [] · 이름당 1개 · 페이지 최상위 증가 정상.

| 노드 | ID |
|---|---|
| `Icon / View / Table` | `1105:646` |
| `Icon / View / Card` | `1105:648` |
| `View Toggle` set | `1105:664` (default = table) |
| `view=table` · `view=card` | `1105:650` · `1105:657` |

두 아이콘 모두 fills 채널 · glyph 13.5 @ 1.25,1.25 · 경로 원본 일치 · 기본 `text/muted`.

### 29b verifier

`29b-G1A-v1-viewtoggle-create-verify` — 읽기 전용, 플래그 없음. 보호 대상은 29 가 남긴 `joob.G1A.baseline` 해시와 비교
(snapshot 함수는 29 와 동일). 원래 토글 `1003:1735` 는 메인 화면 해시 + 51×35.5 · 자식 `1003:1736,1003:1739` · 부모 `1003:1734` 를 직접 확인.
stray = 이름당 1개 + 부모 자식 수가 기준값과 같음 + 세트 밖 `view=*`/`glyph`/segment frame 없음 + source 부모 자식 수 불변.
mock: 정상 상태 통과, 선택 segment fill 제거 + 기존 아이콘 이동을 일부러 넣으면 해당 두 항목만 실패.

### Phase G1-A CLOSED (2026-09-18)

`29b-G1A-v1-viewtoggle-create-verify` — `successCriteriaMet` true · `failedCriteria` [] · `protectedDiff` [] · `errorCount` 0.

## 30) Phase G1-B — 화면 토글 교체 (DRY_RUN 전)

`30-G1B-v1-viewtoggle-replace` / verifier `30b-G1B-v1-viewtoggle-replace-verify`.

- `1003:1735` 와 같은 부모(`1003:1734 Margin`) · 같은 index 에 `view=card`(`1105:657`) 인스턴스를 넣고 원본은 `visible=false` (삭제는 G5).
- 예측은 값을 박지 않고 Margin / 필터 그룹 / 툴바의 auto layout · padding · sizing · 정렬에서 계산한다.
  Margin 이 auto layout 이 아니거나 FIXED 라 넘치면 `marginIsAutoLayout` / `noOverflow` 에서 막힌다.
- 보호: 메인 화면 전체 snapshot 에서 **당연히 바뀌는 값만** 가린다 — Margin 의 w·h·y 와 자식 목록, 필터 그룹의 x·w.
  원본 토글 서브트리는 루트 visible·x·y 만 가린다 (숨긴 뒤 layout 에서 빠지면 위치가 바뀔 수 있어서).
- 실패하거나 되읽기가 하나라도 틀리면 인스턴스 삭제 + 원본 visible 복원 + 크기·보호 대상 재확인.

mock 에서 잡은 버그: 예측 함수가 세로 축에 가로 내용 폭을 넣어 Margin 을 56×52 로 예측했다 →
`axisSize(node, axis, contentW, contentH)` 로 바꿔 축 혼동을 없앴다.
mock 결과: DRY_RUN 예측 Margin 56×36 · 그룹 698×36 (x 267→266) · freeSpace 15→14 · 중심 30=30 · 간격 12→12,
APPLY 전부 통과, 원본 숨김 단계에서 강제 실패 → 인스턴스 삭제 · 보호 대상 불변, verifier 통과 / backup 변경 시 해당 항목만 실패.

### 30-v1 DRY_RUN 차단 → v2 (2026-09-18)

v1 DRY_RUN: `toggleVerticallyCentered` · `resetToToggleVisualGap12` 가 예측 **null** 로 막힘. mutation 0, APPLY 안 함.
원인: v1 은 Margin 이 HORIZONTAL 이라고 가정했다. 실제 `1003:1734` 는 **VERTICAL · HUG/HUG · padding 0/0/0/4 · MIN/MIN**,
자식은 원본 하나. x=4 는 세로 auto layout 의 paddingLeft 에서 나온 값이다.
mock 도 같은 가정(HORIZONTAL Margin)으로 만들어서 이 문제를 잡지 못했다.

v2 (`30-G1B-v2-viewtoggle-replace` / `30b-G1B-v2-viewtoggle-replace-verify`, 파일은 `.v2.js`):
- 가로/세로 공통 배치 함수 `childPos` 하나로 Margin → 필터 그룹 → 툴바를 계산한다.
- **`predictionModelMatchesCurrent`** — 같은 함수로 "지금 구조"를 계산해 원본 · Margin · 그룹의 실제 위치가 나오는지 먼저 확인한다.
  모델이 실제 layout 과 다르면 예측을 쓰지 않고 막는다 (v1 같은 가정 오류를 DRY_RUN 에서 스스로 드러낸다).
- 초기화→토글 간격은 local 계산과 absoluteTransform 실측 두 가지로 재고 둘이 같아야 통과.
- 새 gate: `marginLayoutModeVertical` · `marginPaddingMatches` · `marginOnlyChildLegacy` · `newInstanceLocalX4` · `newInstanceLocalY0` ·
  `toggleCenterAfter30` · `toolbarCenter30` · `resetToToggleGapBefore12` · `resetToToggleGapAfter12`.
- mock 을 실제 구조(Margin · 초기화 wrapper 모두 VERTICAL · padL 4, 숨김 자식은 흐름에서 제외)로 다시 만들었다.
  DRY_RUN 전부 통과 (inst 4,0 · Margin 56×36 · 그룹 698×36 x 266 · freeSpace 14 · 중심 12→48 / 30 · 간격 12=12=12, self-check true),
  APPLY 통과, 원본 숨김 단계 강제 실패 → 인스턴스 삭제 · Margin 55×35.5 · 그룹 697 · 원본 visible 복원 · 보호 대상 불변,
  verifier v2 통과 / backup 변경 시 해당 항목만 실패.

### Phase G1-B CLOSED (2026-09-18)

`30b-G1B-v2-viewtoggle-replace-verify` — `successCriteriaMet` true · `failedCriteria` [] · `protectedDiff` [] · `errorCount` 0.

| | 값 |
|---|---|
| View Toggle 인스턴스 | `1108:665` · `view=card` · 52×36 · local 4,0 · 부모 `1003:1734` |
| 원본 `1003:1735` | `visible=false`, 부모 유지 → **G5 에서 삭제** |
| Margin / 필터 그룹 / 툴바 | 56×36 / 698×36 / 976×60 · freeSpace 14 |
| 세로 중심 · 간격 | 토글 30 = 툴바 30 · 초기화→토글 12 |

G5 cleanup 목록에 추가: `1003:1735` (숨김 원본), wrapper `1003:1734` · `1003:1728` 정리 여부 결정.

## 31a) Phase H1 사전 감사 — Header Bell (읽기 전용)

`31a-H1-v1-header-bell-audit`. MCP 는 이날 두 번째 호출에서 다시 Starter 한도로 막혀 Scripter 감사로 대신한다.

- 후보: 과거 ID(버튼 `1002:487`, 벡터 `1002:489`) · 이름 · 구조(글자 없는 ≤44 컨테이너 + 벡터, 가장 바깥 것) 세 방향 대조
- 버튼 실측 · 알림 점 같은 부속물 · 부모/형제/부모 사슬 · Icon Button(`1037:2091`) 구조와 `icon` INSTANCE_SWAP ·
  화면의 Icon Button 인스턴스 표본(색 override 관례) · 24×24 로 바꿨을 때 부모 크기와 세로 중심 예측
- `Icon / Bell` 은 12 에서 13.33×16.67 → 12.8×16 으로 축소됐으므로 문자열 비교 대신
  **명령 순서 + 종횡비 + 축척 보정 후 좌표 최대 오차**로 같은 모양인지 판정한다
- Header `1002:469` 의 fill 투명도 · DROP_SHADOW · BACKGROUND_BLUR 는 읽기만 한다

### 31a 결과 → H1 범위 확정

Bell `1002:487` 29.33×34.67 · 부모 `1003:1744` "Frame 2" (HORIZONTAL · HUG/HUG · gap 4 · CENTER) · 부속물 0 · fill/effect 없음 · 아이콘 `text/secondary`.
`Icon / Bell` 과 원본은 명령 순서 동일 · 축척 0.96 · 종횡비 보존 · 보정 후 오차 0 → **같은 모양**. 색도 둘 다 `text/secondary`.
결정: `1002:487` 만 Icon Button(24×24) + `icon#1055:6` = `Icon / Bell` 로 직접 교체, 새 wrapper 없음.
부모 164.33×34.67 → 159×24, 형제 `1002:478`(131×24)는 5.33 왼쪽으로 이동만 허용. Header 는 스타일 · 크기 전부 불변.
다른 Bell 복제본 7개(`1009:232` `1009:252` `1009:274` `1011:1852` `1010:1155` `1019:675` `1044:720`)는 수정 금지 — 다른 화면 Bell 은 별도 phase.

## 31) Phase H1 — Header Bell 교체 (DRY_RUN 전)

`31-H1-v1-header-bell-replace` / verifier `31b-H1-v1-header-bell-replace-verify`.

- 30-v2 의 `childPos` 에 `hugSize` 를 더해, 부모 사슬(`1003:1744` → … → Header)을 **위로 올라가며 크기**, **내려오며 위치**를 계산한다.
  같은 함수로 지금 구조를 계산해 실제 위치(원본 · 형제 · 각 조상)가 나오는지 먼저 확인한다.
- Header 는 해시가 아니라 **값 그대로**(size · x · y · positioning · opacity · fills · effects · style) 전후 비교.
- 메인 화면 snapshot 은 사슬 노드의 w·h·x·y 와 사슬 노드 직속 자식의 x·y 만 가린다. 형제는 x·y 만, 원본은 visible·x·y 만 가린다.
- 아이콘 swap 은 `setProperties({'icon#1055:6': '1048:814'})` 후 슬롯 main component 를 되읽어 확인, glyph 색이 원본과 같은지도 본다.
- 되읽기 한 항목이라도 틀리면 rollback (인스턴스 삭제 + 원본 visible 복원 + 크기 · Header · 보호 대상 재확인).

mock (Header SPACE_BETWEEN · 중간 wrapper 하나 가정): DRY_RUN 전부 통과 · self-check true · 부모 159×24 · 형제 x 33.33→28 · 간격 4 ·
Bell 중심 32→32, APPLY 통과 · verifier 통과, Header blur 제거 + backup 변경 시 해당 4항목만 실패,
swap 이 안 먹는 상황을 만들면 삽입 전에 멈추고 인스턴스 삭제 · 부모 크기 원래대로.

### Phase H1 CLOSED (2026-09-18)

`31b-H1-v1-header-bell-replace-verify` — `successCriteriaMet` true · `failedCriteria` [] · `protectedDiff` [] · `errorCount` 0.
Bell 인스턴스 `1110:672` (Icon Button · `Icon / Bell` · 24×24). 원본 `1002:487` 숨김 → **G5 삭제 목록**.
Header 1024×64 · effect 불변 · 다른 Bell 복제본 7개 불변 · stray 없음.

## 메인 화면 마감 순서 (2026-09-18 확정)

1. **H2** Sync chip `1002:478` 정리 → 2. Pretendard load probe (비파괴) → 3. 가능하면 Pretendard 로 Figma + 웹앱 typography 통일
→ 4. G5 hidden / legacy cleanup → 5. final global verify.
보류: Select chevron polish (마스터 수정만으로 전 인스턴스 반영 가능), 다른 화면 Bell 7개, backup frame 보관 이동(최종 검증 후).
참고: 웹앱 `styles.css` 는 현재 Pretendard 가 아니라 `Malgun Gothic` / `Apple SD Gothic Neo` / system-ui 다.
글자 폭이 바뀌면 HUG 컨트롤 폭이 바뀌고 툴바 여유가 14px 뿐이므로 폰트는 G5 · 최종 검증 **전에** 확정한다.

## 32a) Phase H2 사전 감사 — Sync chip (읽기 전용)

`32a-H2-v1-sync-chip-audit`. Phase A 보류 판단(bg `surface/subtle` + 글자·점 `success/strong` 혼합)을 실제 값으로 다시 확인한다.
- 부분별 색 변수(배경 · 테두리 · 글자 · 점), 변수 없이 hex 로 칠해진 부분
- Chip 세트 `1029:1984` variant 별 bg/라벨 변수와 **tone 별 일치도**(bg 만 / 글자만 / 둘 다)
- 화면의 Chip 인스턴스와 fills override 전례 (시즌 배지 `Icon / Dot` 색)
- 교체 크기 예측 — 라벨 글꼴이 Chip 과 같을 때만 정확, 다르면 근사라고 표시
- 복제본: 모양(크기 + 자식 구성) · 글자 내용 두 기준으로 파일 전체

### 32a 결과 → H2 방향 확정

`1002:478` 131×24 · "실시간 동기화 완료" · bg `surface/subtle` + 글자 · 점 `success/strong` · 변수 없는 색 0.
`exactToneMatch` [] · bg 만 `neutral` · 글자만 `success`. 화면 Chip 인스턴스 54개 중 색 override 전례 **0** →
인스턴스 색 override 는 관례에 맞지 않는다. **Chip 세트에 `tone=sync` variant 를 추가**하기로 한다.
크기: legacy 131 (dot 8 + gap 6 + 라벨 101 + 16) → Chip 규칙 137 (leading 16 + gap 4 + 101 + 16). 137 을 정상으로 받아들인다.
부모 `1003:1744` 159×24 → 165×24 예상, Header 높이 불변.
단계: H2-A 세트에 variant 추가(화면 무수정) → H2-B `1002:478` 교체(원본 숨김, G5 삭제).

## 32) Phase H2-A — Chip `tone=sync` variant 추가 (DRY_RUN 전)

`32-H2A-v1-sync-chip-variant-create` / verifier `32b-H2A-v1-sync-chip-variant-create-verify`.

- `tone=success` 를 세트 안에서 **clone** → `tone=sync`. padding · gap · radius 변수 연결, 텍스트 스타일, leading 슬롯
  (Icon / Dot 16×16 + `leading` INSTANCE_SWAP 참조)이 그대로 따라온다.
- 바꾸는 것 4가지: 배경 → `surface/subtle`, 라벨 → `success/strong`(샘플 문구 "동기화"), leading visible → true, Dot glyph → `success/strong`.
- leading 가시성은 boolean 속성이 아니라 variant 마다의 레이어 visible 이라 sync 만 켤 수 있다 (13 에서 확인한 구조).
- 보호: 기존 variant 5개 · leading 속성 정의 · 파일 전체 Chip 인스턴스 · Icon / Dot · 메인 화면 · backup. 이번 snapshot 은
  글자 내용 · 글꼴 · 변수 연결 · property 참조까지 포함한다.
- 되읽기 실패 시 clone 삭제 후 variant 5개 · tone 옵션 · 인스턴스가 원래대로인지 재확인.

mock: DRY_RUN 통과(글꼴 load 확인 포함) · APPLY 72×24 (8+16+4+36+8, HUG 확인) · tone 옵션 6개 · verifier 통과,
기존 variant 색을 바꾸면 해당 항목만 실패, 라벨 문구 변경에서 강제 실패 → clone 삭제 · variant 5개 복귀.

### 32-v1 APPLY 실패 → rollback 정상 (2026-09-18)

실패: `되읽기 검증 실패: newVariantLeadingIconDotVisible`. rollback: `rollbackClean` true · variant 5개 · tone 옵션 원복 ·
`protectedDiff` [] · `chipInstanceDiff` [] · 세트 99×200 (DRY_RUN 과 같음). **v1 은 다시 APPLY 하지 않는다.**
원인 미확정 — 이 조건은 visible · main=Icon/Dot · 16×16 · 속성 참조 · index 다섯 가지를 한 줄로 묶어 어느 것이 틀렸는지 남기지 않았다.
mock 은 통과했으므로 mock 과 실제 Figma 의 차이다.

## 32p) PROBE — clone 된 variant 의 leading visible 동작 (self-cleaning)

`32p-H2A-v1-sync-leading-visibility-probe`. `tone=success`(`1029:1975`)를 임시 clone 해 v1 과 같은 순서
(clone → rename → 배경·라벨 → `leading.visible = true` → glyph fill)로 재현하고, **단계마다 v1 조건 다섯 가지를 따로** 기록한다.
leading 의 exposedInstances · componentProperties · overrides · 속성 참조 · glyph visible/fill · render bounds 도 함께.
property 는 추가하지 않고 BOOLEAN 속성 존재 여부와 visible 참조만 읽는다.
finally 에서 clone 을 반드시 지우고 variant 5개 · tone 옵션 · 세트 크기 · 기존 variant · 파일 전체 Chip 인스턴스 · Icon / Dot · stray 를 재확인한다.
mock: 정상 실행 · 중간 단계 강제 실패 모두 `cleanupOk` true.

### 32p 결과 — 원인 확정

`leading.visible = true` 는 정상 (설정 · 즉시 되읽기 true · Icon / Dot · 16×16 · index 0 · glyph `success/strong` 전부 정상).
실패한 것은 **`c4_propertyRef` 하나**: 원본 leading 은 `{ mainComponent: "leading#1052:0" }`, clone 직후 leading 은 **`{}`**.
→ variant 를 clone 하면 중첩 인스턴스의 INSTANCE_SWAP 속성 참조가 보존되지 않는다. (mock 은 참조를 그대로 복사해서 못 잡았다.)

probe 의 `cleanupOk` false 는 **판정 오류**다: `cloneRemoved` 를 삭제한 노드 참조의 `.removed` 로 봤는데 실제 환경에서 기대값이 나오지 않았다.
나머지 7개(variant 5 · tone 원복 · 기존 variant · 인스턴스 · Icon / Dot · 세트 크기 · stray 0)는 전부 true — 파일은 원래 상태다.
교훈: 삭제 여부는 참조가 아니라 **id 로 다시 조회해 null 인지**로 판정한다.

## 32-v2) Phase H2-A v2 (DRY_RUN 전)

`32-H2A-v2-sync-chip-variant-create` / `32b-H2A-v2-sync-chip-variant-create-verify` (파일 `.v2.js`, v1 보존).
- clone 직후 leading 을 기존 속성 `leading#1052:0` 에 재연결 — 13 과 같은 방식 `inst.componentPropertyReferences = { mainComponent: propKey }`.
  재연결 전/후 참조를 `rebind` 로 결과에 남긴다. 새 속성 없음. preflight 에 `leadingKeyIsExpected` · `sourceLeadingIndex0` 추가.
- leading 조건 9개를 따로 낸다: `leadingIsInstance` · `leadingVisible` · `leadingMainIconDot` · `leadingSize16` · `leadingPropertyRefCorrect` ·
  `leadingIndex0` · `glyphVisible` · `glyphSize8` · `glyphColorSuccessStrong`. `allLeadingChecks` 는 합산용.
  세트 속성이 정확히 `tone` + `leading#1052:0` 인지, padding 4/8/4/8 · gap 4 도 따로 본다.
- rollback: id 재조회로 삭제 판정 + 넓혔던 세트 크기 복원 + cleanup 11항목(`cloneGone` · `noSyncVariant` · `variantCount5` ·
  `toneOptionsRestored` · 기존 variant · 인스턴스 · Icon / Dot · 메인 화면 · leading 정의 · 세트 크기 · stray). 되읽기 실패 시 상세도 함께 낸다.
- verifier v2: 같은 9항목 + 기존 5개 leading 참조가 그대로인지(`existingLeadingRefsIntact`).

mock 을 실제 동작(clone 시 중첩 참조 `{}`, 삭제 노드 `.removed` 불명확)으로 고쳐 시험:
정상 → APPLY 통과 (rebind `{}` → `leading#1052:0`) · verifier 통과 · 기존 variant 변경 시 해당 항목만 실패 /
재연결이 무시되는 경우 → `leadingPropertyRefCorrect` 만 실패하고 rollback cleanup 11항목 전부 true /
재연결 직후 강제 실패 · 라벨 변경 실패 → rollback cleanup 전부 true.
처음 시험에서 재연결 실패 시 넓힌 세트 크기가 복원되지 않는 문제를 찾아 고쳤다.

### Phase H2-A CLOSED (2026-09-18)

`32b-H2A-v2-sync-chip-variant-create-verify` — `successCriteriaMet` true · `failedCriteria` [].
`tone=sync` = `1114:684` · 72×24 · bg `surface/subtle` · 라벨 `success/strong` · leading Icon / Dot visible · 참조 `leading#1052:0` · glyph 8×8 `success/strong`.
기존 variant 5개 · 파일 Chip 인스턴스 65개 불변, stray 없음.

## 33) Phase H2-B — 화면 sync 배지 교체 (DRY_RUN 전)

`33-H2B-v1-sync-chip-screen-replace` / verifier `33b-H2B-v1-sync-chip-screen-replace-verify`.
- `1002:478` 자리(부모 `1003:1744` 의 자식 index — 숨긴 원본 Bell `1002:487` 때문에 flow index 와 다르다)에 `tone=sync` 인스턴스를 넣고
  라벨 문구만 "실시간 동기화 완료" 로 override. 색은 전부 마스터 상속 — 되읽기에서 인스턴스 overrides 중 색 관련 필드가 0 인지 확인.
- 폭 예측 = padding 8+8 + leading 16 + gap 4 + 원본 라벨 폭. 라벨 글꼴 · 크기 · 자간이 원본과 같을 때만 정확(`predictedChipWidthExact`).
- 31 의 부모 사슬 예측 + 자기 검증(Bell 위치 포함), Header 값 그대로 비교, 다른 sync 복제본은 모양으로 찾아 보호.
- rollback: id 재조회로 인스턴스 삭제 확인 + 원본 visible 복원 + 부모 크기 · Header · 보호 대상 · Chip 인스턴스 수 확인.

mock: DRY_RUN 137×24 · 부모 165×24 · Bell 0,0 유지 · 간격 4 · 중심 32 · self-check true /
APPLY 통과(overrides = characters 하나, 색 override 0) / verifier 통과, Header blur 제거 + 복제본 색 변경 시 해당 항목만 실패 /
원본 숨김 실패 → 인스턴스 삭제 · 원본 visible · 부모 159 복귀.

### Phase H2 CLOSED (2026-09-18)

`33b-H2B-v1-sync-chip-screen-replace-verify` — `successCriteriaMet` true · `failedCriteria` [] · `protectedDiff` [] · `errorCount` 0.
sync Chip 인스턴스 `1115:688` · `tone=sync` · 137×24 · "실시간 동기화 완료" · leading Icon / Dot (`leading#1052:0`) · colorOverrides [].
부모 165×24 · Header 1024×64 · 중심 32. 원본 `1002:478` 숨김 → **G5 삭제 목록**.

## 34p) PROBE — Pretendard 사용 가능 여부 (읽기 전용)

`34p-font-pretendard-v1-availability-probe`. 전역 교체 전에 이 PC 의 Figma/Scripter 에서 Pretendard 가 보이고 로드되는지 확인한다.
- `listAvailableFontsAsync` 로 Pretendard 계열 family(이름 변형 포함)와 style 목록 → `loadFontAsync` 로 Regular / Medium / SemiBold / Bold 실제 로드
  (로드는 문서를 바꾸지 않는다). SemiBold 는 "Semi Bold" 같은 표기 차이도 찾아서 실제 이름을 보고한다.
- 텍스트 스타일 8개의 현재 값과 굵기 매핑(400 Regular · 500 Medium · 600 SemiBold · 700 Bold) 가능 여부.
- 교체 범위 참고: 파일 / 메인 화면 텍스트 노드 중 로컬 스타일이 **연결되지 않은** 노드 수 — 스타일만 바꿔서는 따라오지 않는 노드다.
- 끝에서 텍스트 스타일 8개를 처음 값과 다시 비교해 비파괴를 확인한다.

결과: `pretendardFamilyFound` true · `chosenFamily` Pretendard · 4 굵기 전부 load true · `allRolesMappable` 8/8 ·
`currentStylesMatchSpec` 8/8 · 메인 화면 텍스트 209개 전부 Local Text Style 연결(`mainFrameWithoutStyle` 0) ·
파일 전체 1306개 중 576개 스타일 연결(730개는 미연결 — 이번 범위 밖).

## 34) Phase I — Local Text Style 8개 fontName 교체 (DRY_RUN 전)

`34-v1-font-pretendard-style-swap` / verifier `34b-v1-font-pretendard-style-swap-verify`.

- 역할 이름으로 스타일 8개를 찾아 **fontName 만** Gothic A1 → Pretendard 로 바꾼다. size · lineHeight · letterSpacing ·
  style name/id 는 34p 와 동일한 방식으로 다시 비교해 불변을 확인한다. 개별 TEXT node · 컴포넌트 · 인스턴스 · backup 은
  직접 만지지 않는다 — 스타일 객체 8개만 `set` 한다.
- 스타일은 파일 전체 공유 객체이므로 메인 화면 209개 외에 다른 화면 · backup 의 텍스트도 자동 상속된다. 이 사실을 숨기지 않고
  DRY_RUN 결과의 `scopeImpact`(파일 전체 대비 메인 화면 밖 영향 개수, backup 2개 프레임 개별 집계)로 그대로 보고한다.
- 레이아웃 기준값: 메인 화면 안에서 이 8개 스타일을 쓰는 텍스트를 포함한 모든 auto-layout 컨테이너를(부모 체인을 타고 올라가며)
  찾아 FIXED 축의 free space(= 크기 − padding − 자식 필요 크기, gap 포함)를 잰다. 특정 노드 ID 를 하드코딩하지 않는 일반화된
  방식이라 Toolbar/Select/Button/Chip/Header sync Chip/KPI/카드/NavItem 어디든 해당되면 자동으로 잡힌다.
  20px 미만인 컨테이너는 `tightContainers` 로 따로 표시(기존에 알려진 Toolbar free space 약 14px 케이스가 여기 해당).
- APPLY(아직 실행 안 함): 8개 style.fontName 을 순서대로 바꾸고 되읽기 — 값 8개 모두 Pretendard 로 바뀌었는지,
  나머지 필드 불변인지, 메인 화면 209개 중 override 없는 노드가 전부 상속됐는지, 레이아웃 기준값 재측정에서
  overflow(free space 가 양수 → 음수로 넘어간 컨테이너)가 새로 생겼는지 확인. 실패 시 8개 스타일을 Gothic A1 로 되돌리고
  재확인. Gothic A1 재로드 가능 여부를 **mutation 전에** preflight 에서 먼저 확인해, rollback 안전성이 보장 안 되면
  아예 아무것도 바꾸지 않고 멈춘다.

mock 테스트(53개 항목, Figma Plugin API 를 흉내 낸 Node 하네스로 검증 — 실제 Figma 실행 전 로직 확인용):
DRY_RUN 209개 정상 통과(Toolbar free space 14 감지) / 텍스트 개수가 209 아닐 때·미연결 텍스트가 있을 때·이미 Pretendard 일 때·
Pretendard 로드 실패일 때 각각 해당 blocker 만 걸림 / 기존 override 있는 노드는 막지 않고 정보로만 보고 /
APPLY 정상 통과(8개 전부 Pretendard, mutationCount 8, overflow 없음, pluginData 기준값 저장) /
APPLY 도중 강제 실패 → 3개 스타일까지 바뀐 상태에서 rollback, 8개 전부 Gothic A1 로 복원 확인 /
rollback 안전성(Gothic A1 재로드) 자체가 실패하면 mutation 0 으로 아예 멈춤 / verifier 는 기준값 있을 때 통과,
없을 때(34 를 안 돌렸을 때) 명확히 실패.

**지금은 DRY_RUN 만 실행한다. APPLY·verifier 링크는 DRY_RUN 결과를 ChatGPT 검토 후 별도로 받는다.**

### 34 v1 DRY_RUN 실행 결과 → ChatGPT 검토 (2026-09-18)

`preflightPassed` false. 유일한 blocker `noExistingNegativeFreeSpace` — Main(`1002:3`, FIXED 1024×1024,
clipsContent=true, overflowDirection=VERTICAL)의 **의도된 vertical scroll**(freeH −67, F2-B/F3 에서 만든 구조)을
overflow 오류로 오판. v1 의 절대값 기준(모든 음수 free space 금지) 판정이 scroll 컨테이너를 구분하지 못한 게 원인.
`scopeImpact`(mainFrameEligible 209 · fileWideEligible 576 · otherScreensAffected 367 · backup 1044:47 영향 177)는
공유 스타일의 정상 동작으로 확인, blocker 아님. 실제 위험 지점은 Toolbar(`1003:1695`, freeW 14)와
Search Input(`1070:71`, freeW 2) — 둘 다 non-scroll 고정폭이라 Pretendard 교체 후 진짜 overflow 위험.

## 34 v2) Phase I v2 — scroll 컨테이너 구분 + regression 비교 (DRY_RUN 전)

`34-v2-font-pretendard-style-swap` / verifier `34b-v2-font-pretendard-style-swap-verify` (파일 `.v2.js`, v1 보존).

- **scroll 컨테이너 구조적 분류** (ID 하드코딩 없음): `clipsContent === true` + `overflowDirection` 이 해당 축과 일치
  (`HORIZONTAL`/`BOTH` → freeW, `VERTICAL`/`BOTH` → freeH) + 그 축 sizing 이 `FIXED`. 이 조합이면 기존 음수 free space 를
  DRY_RUN blocker(`noUnexpectedExistingOverflow`)에서 제외한다. scroll 이 아닌 컨테이너는 그대로 막는다(진단용 — 교체와
  무관한 기존 문제를 먼저 드러낸다).
- **APPLY 판정을 절대값 → regression 비교로 변경**: scroll 컨테이너는 `after < before − 0.5` 일 때만 `scrollRegressions` 로
  정보성 보고(성공 여부에 영향 없음, rollback 유발 안 함). scroll 이 아닌 컨테이너는 여전히 `after < −0.5` 면 진짜 overflow →
  `newOverflow` 실패 → rollback. HUG 컨테이너 크기 변화 자체는 실패 기준이 아니고 free space(overflow 여지)만 본다.
- DRY_RUN 출력에 `scrollContainers`(id·name·axis·현재 free space) 를 새로 추가해 어떤 컨테이너가 의도된 scroll 로
  분류됐는지 검토할 수 있게 했다.
- `34b` 도 같은 문제(overflow 절대값 판정)가 있어 함께 v2 로 갱신: scroll 분류를 verifier 에도 반영하고, pluginData
  기준값 키를 `joob.34.baseline.v2` 우선 → 없으면 v1 키(`joob.34.baseline`)로 대체 조회하도록 해서 v1/v2 어느 쪽으로
  APPLY 했어도 검증 가능하게 했다.

mock 테스트(61개 항목, Main 을 FIXED+clipsContent+overflowDirection=VERTICAL 스크롤 컨테이너로 재현하고 Toolbar
freeW 14 · Search Input freeW 2 를 실제 ID(`1003:1695`/`1070:71`)로 재현):
DRY_RUN — Main 의 큰 음수 freeH 가 더 이상 안 막음(scroll 로 분류) / Toolbar 를 인위로 이미 음수로 만들면(scroll 아님)
여전히 막힘(교체와 무관한 기존 문제는 계속 잡아낸다) / 기존 6개 케이스(개수·미연결·override·이미 Pretendard·로드 실패) 그대로 통과 /
APPLY Case A(scroll 불변 → PASS) · Case B(scroll 이 −20 더 나빠짐 → `scrollRegressions` 로만 flag, `successCriteriaMet` 그대로 true) ·
Case D(Toolbar 가 음수로 넘어감 → 실패 + rollback, Gothic A1 복원) · Case E(Search Input 가 음수로 넘어감 → 실패 + rollback) /
무관한 실패로도 깨끗이 rollback / rollback 안전성 자체가 실패하면 mutation 0 / verifier v2 는 v2 기준값을 찾고 Main scroll 을
오판하지 않음 + v1 기준값만 있을 때 v1 키로 대체 조회.

**지금은 v2 DRY_RUN 만 실행한다. APPLY·verifier 링크는 DRY_RUN 결과를 ChatGPT 검토 후 별도로 받는다.**

### 34-v2 DRY_RUN 결과 → ChatGPT 검토 (2026-09-18)

`preflightPassed` true, `blockers` []. 8개 스타일 전부 found, Pretendard 4 굵기 로드 성공, 메인 화면 209/209,
미연결 0, Main 이 scroll 로 정상 분류(freeH −67, 안 막음), Toolbar freeW 14 · Search Input freeW 2 가 민감 항목으로
확인. scopeImpact(파일 전체 576 · 다른 화면 367 · backup 1044:47 영향 177)는 공유 스타일의 정상 동작으로 허용.
**34-v2 APPLY 승인** → 같은 파일에서 `DRY_RUN = false` 로만 바꿔 실행(같은 scriptVersion, 새 파일 안 만듦).

### 34-v2 APPLY 결과 (2026-09-18)

`successCriteriaMet` true. `allEightUpdatedToPretendard` · `allNonFontFieldsUnchanged` · `allEligibleTextInheritsPretendard` ·
`noDirectNodeOverridesCreated` · `noNewOverflow` · `noErrors` 전부 true. 레이아웃: Toolbar freeW 14 → 53(오히려 여유 증가),
Search Input freeW 2 → 2(불변), Main freeH −67 → −67(불변, scroll regression 없음). **APPLY 성공, 재실행 안 함.**

## 34b v3) verifier — baseline 의존 typography 오판 수정 (read-only)

`34b-v3-font-pretendard-style-swap-verify` (파일 `.v3.js`, v1·v2 보존).

34b-v2 verifier 실행 결과 `allEightArePretendard` false, `mainFrameInheritsPretendard` false 로 나왔으나
`measured.styles` 는 8개 전부 Pretendard, `mismatched` 배열의 각 항목도 실제 font 는 Pretendard — **판정 로직 버그**였다.
원인: `baselineFrom` = null(`joob.34.baseline.v2`/`joob.34.baseline` pluginData 를 이 Run 에서 못 찾음) →
`chosenFamily` 가 baseline 에서만 오는 값이라 null 이 됐고, 두 check 와 `backupImpact.nowPretendard` 가 전부
`chosenFamily` 비교에 의존해 measured 값과 무관하게 false/0 이 됨.

수정: baseline 을 typography 판정에서 완전히 뺐다. `allEightArePretendard` · `mainFrameInheritsPretendard` ·
`backupImpact` 는 지금 읽은 `fontName.family` 를 `/pretendard/i` 로 직접 판정(문자열 비교 · baseline 의존 없음).
`weightsMatchRoles` 도 baseline.applied 대신 34 APPLY 와 같은 `STYLE_ALIASES` 표로 직접 판정(Semi Bold 같은 표기
차이 허용). baseline 부재는 `errors` 가 아니라 `warnings` 로만 남기고 `successCriteriaMet` 에 섞지 않는다 — baseline 이
없어도 지금 상태만으로 전부 검증 가능. 단, baseline JSON 이 **깨진 경우**(파싱 실패)는 진짜 문제이므로 `errors` 로 유지.
`backupImpact` 에 실제 fontName 샘플(최대 8개)을 추가해 backup 텍스트가 실제로 무엇을 반환하는지 바로 볼 수 있게 했다.
baseline 이 있을 때(정상 케이스)는 여전히 찾아 쓰고 scroll regression 대조에 보조로 활용 — 있을 때의 동작은 그대로다.

mock 테스트(28개 항목): **34b-v2 로 버그를 먼저 재현**(스타일이 실제로 Pretendard인 상태에서 baseline 만 없게 만들면
`allEightArePretendard`/`mainFrameInheritsPretendard` 가 잘못 false) → **34b-v3 로 같은 상태에서 재검증하면 정상
true**(mismatched 빈 배열, `errorCount` 0, baseline 부재는 `warnings` 에만) / baseline 이 실제로 있을 때는 v2 와
동일하게 정상 동작(scroll regression 대조 포함, warnings 없음) / `Semi Bold`(공백 있는 표기) alias 허용 확인 /
backup 샘플이 실제 Pretendard 문자열로 나오는지 확인 / **진짜 문제(한 노드가 실제로 Gothic A1 로 남아있는 경우)는
여전히 잡아낸다** — baseline 독립성이 진단 능력을 죽이지 않았는지 확인 / baseline JSON 이 깨진 경우는 `errors` 로
남아 `successCriteriaMet` 를 false 로 만들되, typography 측정 자체는 정상적으로 계속 됨을 확인.

**지금 실행할 것: 34b-v3 verifier (read-only, 바로 Run).**

### 34b-v3 verifier 결과 → Phase I CLOSED (2026-09-18)

`successCriteriaMet` true · `failedCriteria` [] · `phaseVerdict` "Phase I (Pretendard) CLOSED 가능".
8개 스타일 전부 Pretendard(`allEightArePretendard`) · 굵기 매핑(`weightsMatchRoles`) · size/line 불변(`sizeLineUnchanged`) ·
메인 화면 209/209 상속(`mainFrameInheritsPretendard`) · overflow 없음(`noOverflowNow`, `overflowNow` []) ·
scroll regression 없음(`scrollRegressionsNow` []) · backup `1044:47` 177/177 Pretendard 상속 확인. `baselineFrom` 은
null 이었지만 `warnings` 로만 남고 `errorCount` 0 — 실제 typography 판정에는 영향 없음(34b-v3 의 baseline 독립 설계대로).

## Phase I (Pretendard 폰트 전환) CLOSED (2026-09-18)

Local Text Style 8개 Gothic A1 → Pretendard 완료. Toolbar `1003:1695` freeW 14→53(여유 증가) · Search Input
`1070:71` freeW 2→2(불변) · Main `1002:3` scroll freeH −67→−67(불변) — 새 overflow · scroll regression 전혀 없음.
메인 화면을 최종 source of truth 로 완성하는 작업의 마지막 디자인 시스템 단계. 다음은 G5(hidden/legacy cleanup) →
final global verify → source of truth 확정 순서로 진행한다.

## 35) Phase G5 사전 감사 — hidden/legacy 노드 인벤토리 (read-only)

`35-G5-v1-legacy-cleanup-audit`.

- 범위는 메인 화면 `1002:2` 서브트리만. backup(`1044:47`/`1019:2`)은 이 서브트리 밖이라 애초에 스캔 대상이 아니고
  결과에도 안 나온다 — cleanup 대상에서 완전히 제외.
- 알려진 후보 5개(`1003:1735` legacy View Toggle hidden · `1003:1734` View Toggle wrapper · `1003:1728` reset
  wrapper · `1002:487` legacy Bell hidden · `1002:478` legacy sync hidden)를 지금 상태로 다시 확인하되, **이 목록만
  믿지 않는다**: 서브트리 전체에서 `visible === false` 인 모든 노드(부모가 hidden 이면 자식은 더 안 내려간다 — 같이
  지워지므로 별도 후보 아님)와, 이름에 legacy/구버전/old/deprecated/temp/copy/backup 류 패턴이 있는 **visible 노드**도
  함께 찾는다.
- 분류: `SAFE_TO_DELETE` 는 **hidden 노드에만** 준다(visible 노드는 아무리 이름이 수상해도 최대 `REVIEW_REQUIRED`).
  그 중에서도 COMPONENT/COMPONENT_SET 자신이거나 내부에 컴포넌트 정의를 포함하고 그 컴포넌트가 파일 어딘가에서
  실제 인스턴스로 쓰이고 있으면 `REVIEW_REQUIRED` 로 보호한다. hidden 노드는 Figma auto-layout 이 flow 계산에서
  이미 제외하므로(HUG 부모 크기 불변) 레이아웃 영향이 없다는 근거를 이유에 남긴다. 같은 부모의 비슷한 크기 visible
  INSTANCE 형제가 있으면 "교체 인스턴스로 보인다"고 같이 낸다(높이는 좁게, 폭은 규칙 차이를 감안해 넉넉하게 비교 —
  실제 sync 배지 131×24 → Chip 137×24 같은 6px 차이도 잡아야 해서).
  visible wrapper(자식 ≤1, padding/gap/시각 요소 전부 없음) → `REVIEW_REQUIRED`(평탄화 후보, 삭제 후보 아님).
  자식 2개 이상이거나 padding/gap 이 남아있는 visible 노드 → `KEEP`.
- 알려진 후보가 지금 문서에 아예 없으면 note 로만 남기고(크래시 안 남) 목록에서 빠진다. 존재하지만 상태가
  바뀌었으면(예: 이제 visible) — 숨기지 않고 **지금의 실제 상태 그대로** 후보 목록에 넣어서 정확하게 재분류한다.

mock 테스트(38개 항목): 알려진 hidden 후보 3개 SAFE_TO_DELETE + 교체 인스턴스 감지 확인(sync 배지 6px 폭 차이 포함,
처음엔 임계값이 너무 좁아서 놓치는 버그를 찾아 폭 허용치를 넓힘) / visible wrapper 중 padding 있는 건 KEEP, 순수
passthrough 는 REVIEW / 목록에 없던 새 hidden 노드도 스캔으로 발견 / hidden 인데 내부에 실사용 컴포넌트가 있으면
보호(REVIEW, 삭제 후보 제외) / 이름만 수상한 visible passthrough 는 REVIEW(SAFE 아님) / 이름은 수상해도 실제
spacing 역할 있는 visible 노드는 KEEP / backup 은 후보에 전혀 안 나옴 / 알려진 후보가 문서에 없을 때 note 로만
보고 / 알려진 후보가 있지만 상태가 바뀌었을 때 stale 데이터 아니라 지금 상태 그대로 정확히 보여줌 / summary
집계(cleanup/review/keep/protected count) 정합성 확인.

**지금 실행할 것: 35-G5 audit (read-only, 바로 Run). 삭제 APPLY 는 이 결과를 검토한 뒤 별도로 준비한다.**

### 35-G5-v1 실행 결과 → ChatGPT 검토 (2026-09-18)

`SAFE_TO_DELETE` 70개로 나왔으나 상당수가 실제 legacy 가 아니라 **컴포넌트 인스턴스 내부의 의도적으로 숨긴
optional slot**(App Card/Chip/KPI 안의 `leading`·`caption` 같은 variant 전용 레이어, id 가
`I<instanceId>;<nodeId>` 형태)이었다. v1 은 "hidden 이면 기본적으로 안전"으로 판정해 이런 인스턴스 내부
구조까지 다 잡아버린 게 원인 — 실제 cleanup 대상은 screen-level hand-built legacy 노드여야 한다.
**v1 SAFE_TO_DELETE 결과는 신뢰하지 않는다. v2 로 재분류 필요.**

## 35 v2) Phase G5 사전 감사 — 인스턴스 내부 보호 + 보수적 SAFE 판정 (read-only)

`35-G5-v2-legacy-cleanup-audit` (파일 `.v2.js`, v1 보존).

- **규칙 1 — 인스턴스 내부 descendant 는 무조건 먼저 분리**: parent chain 에 `INSTANCE` 가 하나라도 있거나
  id 가 `I<...>;<...>` 형태(세미콜론 포함)면 화면 cleanup 대상에서 제외하고, optional-slot 이름 패턴
  (`leading`/`trailing`/`caption`/`glyph`/`icon`/`badge`/`label`/`dot`/`indicator` 등) 이거나
  `componentPropertyReferences` 가 있으면 `KEEP`(인스턴스가 스스로 관리하는 상태), 패턴이 애매하면
  `REVIEW_REQUIRED` — **이 경로에서는 `SAFE_TO_DELETE` 를 아예 주지 않는다.**
- **`SAFE_TO_DELETE` 판정을 보수적으로 축소**: hidden 이라는 것만으로 더 이상 안전하다고 안 본다. (a) 같은 부모의
  비슷한 크기 visible INSTANCE 형제가 지금 감지되거나, (b) 이전 단계 verifier 로 CLOSED 까지 확인된 기록
  (`confirmedReplaced: true`)이 있을 때만 준다. 둘 다 없으면(자동 탐지도 안 되고 기록도 없으면)
  `REVIEW_REQUIRED` 로 내린다 — 이번에 새로 발견된 `1009:703`/`1009:709`/`1002:506` 이 여기 해당(역할 미확인,
  `confirmedReplaced: false`).
- 알려진 후보 목록을 H1/H2/G1-B 5개 + Phase B(Toolbar) 11개(`1003:1697`~`1729`) + Phase D(KPI) 4개
  (`1002:24`/`42`/`60`/`78`) + Phase F1(Nav) 6개(`1002:512`~`542`, 전부 CLOSED 기록 있어 `confirmedReplaced: true`)
  + 새로 발견된 3개(`confirmedReplaced: false`)로 확장.
- 각 후보에 `insideInstance` · `nearestInstanceAncestor` · `isComponentDefinedOptionalLayer` ·
  `topLevelLegacyRoot` · `hasVisibleReplacementSibling` · `deletionScopeDescendantCount` 추가.
  요약도 `safeLegacyRoots` · `protectedInstanceInternals` · `keepWrappers` · `reviewRequired` ·
  `totalHiddenButIntentional` 5개 버킷으로 다시 나눴다.

mock 테스트(37개 항목): **A** hidden nested `leading` slot(App Card 인스턴스 내부) → KEEP, 절대 SAFE 아님 /
**B** hidden KPI `caption` slot → KEEP / **C** 화면 legacy 원본 + 감지된 교체 인스턴스(Bell·sync 배지, 6px 폭
차이 포함) → SAFE_TO_DELETE 유지 / **D** visible wrapper padding 있으면 KEEP 유지 / 인스턴스 내부인데 이름
패턴이 애매한 레이어는 REVIEW(KEEP 도 SAFE 도 아님) / id 에 세미콜론만 있고 실제 INSTANCE 부모가 없는 경우도
id 패턴만으로 인스턴스 내부로 판정 / **회귀 확인**: v1 에서 SAFE 였던 "새로 발견 + 교체 미탐지 + CLOSED 기록
없음" 노드가 v2 에서는 REVIEW_REQUIRED 로 내려감 / CLOSED 기록만 있고 이번 mock 에 교체 인스턴스가 없어도
기록으로 SAFE 판정 / summary 5버킷 정합성 · backup 범위 제외 재확인.

**지금 실행할 것: 35-G5-v2 audit (read-only, 바로 Run). 삭제 APPLY 는 이 결과를 검토한 뒤 별도로 준비한다.**

### 35-G5-v2 실행 결과 → ChatGPT 검토, APPLY 승인 (2026-09-18)

`safeLegacyRoots` 24 · `protectedInstanceInternals` 43 · `keepWrappers` 2 · `reviewRequired` 3 ·
`totalHiddenButIntentional` 43 · `errorCount` 0. v2 분류가 의도대로 동작함을 확인. **exact allowlist 24개**
(KPI 4 · Toolbar 11 · View Toggle 1 · Header 2 · Nav 6) 로 삭제 대상을 고정 — 동적 hidden scan 결과를 추가
삭제 대상으로 쓰지 않는다. 절대 삭제 금지: REVIEW_REQUIRED 3개(`1009:703`/`1009:709`/`1002:506`) ·
KEEP wrapper 2개(`1003:1734`/`1003:1728`) · 인스턴스 내부 전부 · Component/Component Set · backup 2개.

## 36) Phase G5 — exact allowlist 24개 삭제 스크립트 (DRY_RUN 전)

`36-G5-v1-legacy-cleanup-apply` / verifier `36b-G5-v1-legacy-cleanup-apply-verify`.

- **ALLOWLIST 상수가 유일한 삭제 대상 소스.** 동적 스캔 결과를 절대 안 쓴다. 정적 자체 점검으로 ALLOWLIST 가
  NEVER_TOUCH(REVIEW_REQUIRED 3 + KEEP wrapper 2)와 겹치지 않는지, 중복 id 가 없는지 먼저 확인한다.
- preflight — 24개 각각: exists · visible=false · mainFrame 서브트리 안 · insideInstance=false(35-G5-v2 와
  같은 판정: parent chain 에 INSTANCE 있음 또는 id 에 `;` 포함) · COMPONENT/COMPONENT_SET 아님 · 부모가 여전히
  mainFrame 안. 하나라도 어긋나면 24개 전부 막는다(부분 삭제 없음).
- **flow 스냅샷으로 "삭제 전후 visible layout 불변"을 증명**: 24개는 전부 hidden 이라 Figma auto-layout 의
  flow 계산에 애초에 안 잡힌다 — 그래서 flow 만(=visible && non-absolute 자식만) 훑은 스냅샷은 24개를 지워도
  이론상 완전히 같은 해시가 나와야 한다. 조금이라도 다르면 다른 무언가가 바뀐 것이므로 즉시 실패 처리.
  Main·Toolbar·Search Input·Header·Aside·KPI section·Grid 의 free space 와 View Toggle·Bell·Sync Chip 도
  이름으로 따로 재측정.
- **rollback**: remove() 는 되돌릴 수 없어서, 삭제 전 mainFrame 전체를 clone 해 같은 페이지 안 메인 프레임
  밖(오른쪽 멀리)에 "fresh backup"을 만든다(DRY_RUN 에서는 생성 안 함). 24개 각각의 "mainFrame 루트부터의
  자식 index 경로"를 삭제 전에 기록해두고, 검증 실패 시 backup 안에서 같은 경로를 찾아 clone 후 원래 부모의
  같은 index 에 다시 끼워 넣는다(새 id 로 재생성 — 완전한 원상복구는 아니지만 구조·시각은 복원). fresh backup 은
  성공·실패 관계없이 지우지 않고 남긴다. 기존 backup(`1044:47`/`1019:2`)은 건드리지 않는다.

mock 테스트(58개 항목, clone()/remove()/insertChild() 를 지원하는 목업으로 실제 삭제·복원까지 재현):
DRY_RUN 24개 정상 통과 / 대상 하나가 문서에서 사라졌을 때·인스턴스 내부로 옮겨졌을 때 각각 막힘 /
APPLY 24개 전부 삭제 + flow 해시·레이아웃·refs·보호 대상 전부 불변 확인 + mutationCount 정확히 1(backup)+24(삭제) /
**진짜 rollback 시나리오**: 삭제 도중 무관한 노드 하나가 우연히 숨겨지는 부작용을 주입 → flow 해시 불일치로
감지 → 24개 전부 backup 경로 조회로 복원, `rollbackClean` true, backup 은 안 지워짐 확인(이 테스트에서 처음엔
부작용을 preflight 단계에서 주입해 "삭제 전" 기준값 자체가 이미 오염되는 바람에 실패를 못 잡는 버그를 찾아,
정확히 삭제 루프 시점에 주입하도록 고쳤다) / verifier 는 APPLY 직후 통과, APPLY 없이 차갑게 돌리면
`allTargetsDeleted` false 로 정확히 실패.

**지금은 DRY_RUN 만 실행한다. APPLY·verifier 링크는 DRY_RUN 결과를 ChatGPT 검토 후 별도로 받는다.**

### 36-v1 DRY_RUN 통과 → APPLY 실행 → 실패 → rollback 성공 (2026-09-18)

DRY_RUN: `preflightPassed` true, 24/24 found, `insideInstanceBlocked` 0, `protectedNodesConfirmed` 5,
flow snapshot nodeCount 517 / hash `df9da4ef`. **APPLY 승인** → 같은 파일 `DRY_RUN=false` 만 바꿔 실행.

APPLY 결과: `aborted` true, `failure` = "되읽기 검증 실패: layoutUnchanged" (다른 check 는 전부 통과 —
`flowSnapshotUnchanged` 포함). `rolledBack` true, `rollbackClean` true — 24개 전부 fresh backup(`1133:644`)
경로 조회로 복원됐지만, **remove() 는 되돌릴 수 없어 복원된 24개는 전부 새 id 를 받았다**(예: `1002:24` →
`1133:1408`). **36-v1 은 재실행하지 않는다.**

원인 분석(1번 요청 — 실제 실행 전 `flowSnapshotUnchanged` 는 통과했으므로 hidden 노드가 hash 에 잡혀 오판한
게 아니다): `failedCriteria` 가 `layoutUnchanged` **하나만** 포함했다 — flow 스냅샷(hidden 노드는 애초에
제외)은 문제가 아니었고, 별도의 숫자 비교(`layoutOf()` 의 freeW/freeH, `near()` 임계값)가 원인이다. 36-v1 은
이 비교에 `near(..., 0.02)`라는 지나치게 빡빡한 허용치를 썼다 — 프로젝트 전반의 다른 스크립트는 전부 기본
0.5 를 쓰는데 이 check 만 0.02 로 좁혀놨었다. hidden 노드는 flow/HUG 계산에서 이미 제외되므로 삭제로 실제
freeW/freeH 가 바뀔 이유가 없고, 실제 Figma 가 문서 mutation 뒤 내부적으로 좌표를 아주 미세하게(0.02px 미만은
아니고 그보다 약간 더) 재계산해 순수 float 오차가 발생했을 가능성이 가장 유력 — "진짜 레이아웃 변화"가 아니라
"체크 임계값이 너무 빡빡했던" 문제로 잠정 결론.

## 37) Phase G5 — rollback 후 복구 상태 확인 (read-only)

`37-G5-v1-recovery-audit`.

- 사용자가 알려준 원본→복원 24개 id 매핑을 그대로 하드코딩해 각각 존재 · visible=false · mainFrame 서브트리 안 ·
  인스턴스 내부 아님 · **원래 속했던 그룹 컨테이너(KPI section/Toolbar/Header/Aside) 서브트리 안**(정확한 직속
  부모까지는 모르므로 그룹 단위로만 확인, 과도하게 단정하지 않음)인지 재확인.
- 원본 24개 id 가 전부 사라졌는지(중복 존재 방지), fresh backup(`1133:644`)이 mainFrame 밖에 그대로 있는지
  (손대지 않음), View Toggle/Bell/Sync Chip 과 REVIEW_REQUIRED 3개·KEEP wrapper 2개도 재확인.
- Main·Toolbar·Search Input·Header·Aside·KPI section·Grid 를 36-v1 DRY_RUN 실측값과 **0.5px 허용치**로 재대조
  (36 의 0.02 는 이 조사 자체가 반증하는 값이라 여기서는 프로젝트 표준인 0.5 사용). 이 스크립트를 만들다가
  **크기 비교도 같은 함정에 걸릴 뻔한 걸 자체 테스트로 발견**: 처음엔 `size` 를 "1024×1024" 같은 문자열로 비교했는데,
  이러면 폭이 0.3px 만 떠도 문자열이 달라져 오탐이 난다 — w/h 를 숫자로 따로 내서 전부 `near()` 로 통일했다.

mock 테스트(34개 항목, restoredRows 24개를 원본 그대로 재현): 전부 정상 복원됐을 때 `currentStateHealthy` true /
복원된 노드가 실수로 visible=true 인 경우·예상 그룹 밖으로 나간 경우·아예 없어진 경우 각각 잡아냄 / 원본 id 가
아직 남아있는(중복) 경우 잡아냄 / fresh backup 이 없거나 mainFrame 안으로 잘못 들어간 경우 잡아냄 / **0.3px
같은 미세한 차이는 0.5px 허용치 안에서 정상 통과**, **몇 px 급 실제 변화는 여전히 잡아냄** — 이번 조사의 핵심
가설(빡빡한 임계값이 오탐 원인)을 뒷받침.

**지금 실행할 것: 37-G5 recovery audit (read-only, 바로 Run). 36-v2 APPLY 는 이 결과를 보고 별도로 준비한다.**

### 37-G5-v1 실행 결과 → rollback 상태 정상 확인 (2026-09-18)

`currentStateHealthy` true. 복원된 24개 전부 정상(존재·hidden·mainFrame 안·원래 그룹 안), 원본 id 전부 소멸,
fresh backup(`1133:644`) mainFrame 밖에 정상 보존, `layoutCompare` 전부 match(Main 1024×1024/freeH −67 ·
Toolbar 976×60/freeW 53 · Search Input 240×36/freeW 2 · Header 1024×64 · Aside 256×1024 · KPI
flowChildCount 4 · Grid flowChildCount 12), refs·보호 대상 전부 정상. **36-v2 준비 승인.**

## 36 v2) Phase G5 — restoredAsId 기준 allowlist + 0.5px 허용치 (DRY_RUN 전)

`36-G5-v2-legacy-cleanup-apply` (파일 `.v2.js`, v1 보존). 기존 fresh backup(`1133:644`)은 이 스크립트가
전혀 참조하지 않는다 — 건드리지 않는다.

- **ALLOWLIST 를 37 로 확인된 restoredAsId 24개로 교체**(원본 id 는 이제 전부 사라졌으므로 그대로 두면 전부
  "찾지 못함"으로 막힘).
- **레이아웃/refs 비교 허용치를 전부 0.5px 로 통일**(v1 의 0.02 폐기, 프로젝트 표준과 일치).
- **크기 비교를 문자열이 아니라 숫자로**: `size` 문자열 그대로 비교하던 걸 w/h `near()` 비교로, refs 비교도
  `JSON.stringify` strict 비교에서 필드별 `near()` 비교로 바꿨다 — 둘 다 같은 부동소수점 함정에 걸릴 수 있었다.
- **추가 안전장치**: preflight 에 `insideExpectedGroup`(37 과 같은 그룹 매핑 — KPI section/Toolbar/Header/Aside
  서브트리 안인지)을 새로 넣어, 혹시 복원 위치가 예상과 다르면 삭제 전에 막는다.
- 그 외(ALLOWLIST·NEVER_TOUCH 겹침 자체 점검, preflight 구조, fresh backup + path 기반 rollback, flow snapshot)는
  v1 과 동일.

mock 테스트(29개 항목): restoredAsId 24개로 DRY_RUN 정상 통과 / 그룹 밖으로 옮겨진 경우·소실된 경우 각각 막힘 /
APPLY 24개 삭제 성공 시 기존 backup(`1133:644`) 이름·존재 그대로(참조조차 안 함) 확인 / **v1 버그 재현 테스트**:
flow 스냅샷에 안 잡히는 대상(Toolbar padding 을 삭제 도중 0.3px 만 틀어지게 주입 — 실제 v1 이 겪은 것과 같은
패턴, `flowSnapshotUnchanged` 는 그대로 true 인데 `layoutUnchanged` 만 걸리는 상황을 재현)이 **0.5px 허용치에서는
정상 통과**함을 확인해 이번 수정이 실제로 그 실패를 해결하는지 검증 / 2px 급 진짜 변화는 여전히 잡아 rollback
확인 / NEVER_TOUCH 5개 보호 유지 확인.

**지금은 v2 DRY_RUN 만 실행한다. APPLY 는 이 결과를 검토한 뒤 진행한다.**

### 36-v2 APPLY 도 동일하게 실패 → rollback 성공 (2026-09-18)

`failure` = "되읽기 검증 실패: layoutUnchanged" — 0.5px 로 넓혔는데도 다시 걸렸다(**tolerance 를 더 이상 임의로
늘리지 않기로 함** — 사용자 명시적 지시). `rolledBack` true · `rollbackClean` true, 24개 전부 세 번째 세대 id
(`1135:xxxx`)로 재생성됨. 새 fresh backup `1135:1535` 생성, 기존 `1133:644` 은 그대로 보존.

원인 규명 필요 — 정확히 어떤 노드의 어떤 필드가 얼마나 벗어났는지 36-v2 가 실패 시에 **저장하지 않아** 사후에
알 수 없다는 사실 확인. 다음 두 개를 read-only 로 준비.

## 38) Phase G5 — 2차 rollback 이후 상태 확인 (read-only)

`38-G5-v2-recovery-audit`. 37 과 같은 구조를 세 번째 세대 id(`1135:xxxx`) 기준으로 갱신 — 원본·1차 복원
(`1133:xxxx`) 둘 다 안 남아있는지(`staleIds`), 두 backup(`1133:644` · `1135:1535`) 다 mainFrame 밖에 그대로
있는지(둘 다 손대지 않음). **`layoutMismatchCount` 는 일부러 `currentStateHealthy` 판정에서 뺐다** — 지금
조사 중인 값을 스스로 "정상"이라고 판정하면 순환 논리가 되므로, 숫자만 그대로 내고 사람이 판단하게 한다.

## 39) Phase G5 — layoutUnchanged 실패 원인 진단 (read-only, full-precision)

`39-G5-v1-layout-diagnostic`.

**한계를 먼저 밝힌다**: 36-v2 가 실패했던 정확한 "삭제 직후, rollback 직전" 값은 어디에도 저장돼 있지 않다
(rollback() 이 실패 경로에서 layoutBefore/After 를 pluginData 에 안 남겼다 — 성공했을 때만 저장하도록 짜여
있었다). 그래서 그 순간을 되짚을 수는 없고, 이 스크립트는 대신:
- 지금(2차 rollback 이후) 값을 **반올림 없이 최대 정밀도로**(raw width/height/padding/gap, 자식 개별 폭·높이까지)
  낸다
- 유일하게 남아있는 신뢰 가능한 기준점인 **36-v1 DRY_RUN 최초 실측값**과 필드 단위로 대조해 "지금도 벗어나
  있는지" 확인한다 (그 실패 순간의 delta 는 아니지만, 적어도 지금 상태가 원래 기준과 얼마나 다른지는 정확히 보여준다)
- 표 형식: node id/name · field · before(=DRY_RUN 최초값) · after(=지금 raw 값을 반올림) · delta · absDelta ·
  tolerance(0.5, flowChildCount 는 정수라 tolerance 없이 정확히 비교) · pass, **절대값 큰 순서로 정렬**해서
  가장 어긋난 필드가 맨 위에 오게 했다
- Main·Toolbar·Search Input·Header·Aside·KPI section·Grid 전부 + refs(View Toggle/Bell/Sync Chip, 값 그대로) +
  flow snapshot(지금 해시만, 비교 대상 없음을 명시) + 보호 대상 5개까지 한 스크립트에 전부 포함

다음 APPLY 시도가 다시 실패하면, 이 스크립트를 "삭제 직전"과 "rollback 직후" 두 번 돌려서 실제 delta 를 잡을 수
있다는 것도 염두에 두고 설계했다(지금은 그 페어링을 아직 안 함 — 우선 지금 상태 진단이 먼저).

mock 테스트: 38 은 25개(2차 세대 정상 · stale id(원본/1차) 각각 감지 · 2차 노드 소실 · backup 두 개 독립 감지 ·
layoutMismatchCount 가 currentStateHealthy 를 순환 판정하지 않는지) / 39 는 29개(정확히 일치할 때 전부 pass ·
0.3px drift 는 표에 정확히 찍히되 pass · 2px drift 는 fail 로 잡히고 정렬 1위로 올라옴 · Main 높이가 소수점이어도
정밀하게 처리 · flowChildCount 는 tolerance 없이 정수 비교 · `layoutFull` 의 raw 필드들이 반올림 없이 정확한지 ·
refs/보호 대상이 없을 때 크래시 없이 missing 으로 보고).

**지금 실행할 것: 38(2차 recovery audit) + 39(진단) 둘 다 read-only, 순서 상관없이 바로 Run. 36-v3 APPLY 는
이 두 결과를 검토한 뒤 별도로 준비한다.**

### 38·39 실행 결과 → 지금 상태는 정상, drift 없음 (2026-09-18)

39: `totalFields` 15 · `failingFields` 0 · `worstAbsDelta` 0 — Main/Toolbar/Search Input/Header/Aside/KPI/Grid
전부 36-v1 DRY_RUN 최초 실측값과 absDelta 0 으로 정확히 일치. `refsUnchangedNow` true · `protectedNodesOk` true.
**지금 이 순간에는 실제 레이아웃 drift 가 전혀 없다** — v1·v2 실패는 영구적 상태 차이가 아니라 삭제 직후 측정
그 순간에만 존재했다 사라지는 무언가였을 가능성이 더 높아졌다. **추가 recovery audit·진단 스크립트는 그만
만들고, 36-v3 APPLY 하나만 준비하기로 함.**

## 36 v3) Phase G5 — 3세대 allowlist + 실패 시 진단 캡처 + settle yield (DRY_RUN 전)

`36-G5-v3-legacy-cleanup-apply` (파일 `.v3.js`, v1·v2 보존). **tolerance 는 0.5 로 유지, 더 늘리지 않았다**(사용자
명시적 지시).

- **ALLOWLIST 를 36-v2 rollback 이후 실제 id(세 번째 세대, `1135:xxxx`)로 교체**. `EXPECTED_GROUP` 도 같이 갱신.
- **핵심 변경 — `layoutUnchanged` 가 실패하면 `rollback()` 을 부르기 전에 반드시 진단을 먼저 만든다**:
  `fieldDiagnostics`(TRACKED_LAYOUT 7개 × w/h/freeW/freeH/flowChildCount, node id/name·before·after·delta·
  absDelta·tolerance·pass, absDelta 큰 순서로 정렬) + `layoutBefore/After` · `refsBefore/After` ·
  `flowBefore/After` 전체를 `failureDiagnostics` 라는 이름으로 `rollback()` 결과에 그대로 포함시킨다 —
  rollback 이 성공하든 일부만 성공하든 이 진단은 최종 JSON 에서 절대 안 사라진다. v1·v2 는 이걸 아예 안 만들어서
  "무엇이 얼마나 달랐는지"를 한 번도 실제로 본 적이 없었다.
- **삭제 루프 직후 한 번의 최소 yield(`settle()`, `setTimeout(resolve, 0)`)를 넣고 나서 재측정**. 근거: Figma 의
  auto-layout 재계산이 이론상 동기적이어도, 24개 연속 remove() 직후 곧바로 읽으면 아주 드물게 아직 반영 안 된
  transient 값을 읽을 가능성을 배제할 수 없다는 게 지금까지 조사에서 남은 유일한 미확인 가설이다(39 의 결과가
  "지금은 drift 없음"이라 사후 증명은 안 됨). 그래서 **임의로 긴 delay 를 넣지 않고 이벤트 루프를 딱 한 tick
  흘려보내는 것만** 한다.
- 그 외(정적 자체 점검, preflight + insideExpectedGroup, fresh backup + path 기반 rollback, flow snapshot)는
  v2 와 동일. **기존 fresh backup(`1133:644`, `1135:1535`) 은 이 스크립트가 전혀 참조하지 않는다.**

mock 테스트(29개 항목): 3세대 allowlist 로 DRY_RUN 정상 통과 / APPLY 성공 시 backup 두 개(1133:644, 1135:1535)
전부 이름·존재 그대로(참조 자체를 안 함) / 0.3px 급 영구적 drift 는 여전히 통과 / **2px 급 영구적 drift → 실패
+ rollback, `failureDiagnostics` 가 최종 JSON 에 살아남고 정확한 필드(toolbar.freeW) · before/after/delta(-2) ·
absDelta(2) · tolerance(0.5) · pass(false) 를 담고 있는지 확인** / **transient 시나리오**: Toolbar padding 을
삭제 루프 마지막 항목에서 일부러 틀리게 만들고 `setTimeout(0)` 으로 다음 tick 에 원래 값으로 되돌리도록
예약(실제 v1/v2 가 겪은 것처럼 flow snapshot 에는 안 잡히는 padding 을 건드림) → `settle()` 이 그 tick 을
흘려보내 correction 이 반영된 뒤에 측정하므로 실패 없이 정상 통과함을 확인(처음엔 flow 자식의 width 를
건드리는 시나리오로 만들었다가 그건 flow snapshot 자체도 깨뜨려 실제 관찰된 패턴과 안 맞는다는 걸 찾아 padding
방식으로 고쳤다) / NEVER_TOUCH 5개 보호 유지.

**지금은 v3 DRY_RUN 만 실행한다. 이번 APPLY 가 다시 실패하면, 처음으로 `failureDiagnostics` 에 실제 무엇이
얼마나 달랐는지가 남는다.**

### 36-v3 APPLY 실패 → failureDiagnostics 로 진짜 원인 확인: 비교 버그였다 (2026-09-18)

`allTargetsDeleted` · `flowSnapshotUnchanged` · `trackedRefsUnchanged` · `protectedNodesUntouched` · `noErrors`
전부 true, `layoutBefore`/`layoutAfter` 모든 실제 숫자도 동일 — **실제 레이아웃 변화는 전혀 없었다.**
`layoutUnchanged=false` 의 유일한 원인: `main.freeW` · `toolbar.freeH` · `kpiSection.freeW/freeH` ·
`grid.freeW/freeH` 6개가 전부 `null → null`(그 컨테이너가 해당 축에서 `FIXED` 가 아니라 freeW/H 자체가
"해당 없음")인데, `near(null, null)` 이 `typeof` 체크에서 걸려 무조건 false 를 반환해 "달라졌다"로 오판한
**비교 로직 버그**였다. tolerance 도 settle() 도 원인이 아니었다 — v3 가 만든 `failureDiagnostics` 가 아니었으면
끝까지 몰랐을 것.

## 36 v4) Phase G5 — null-vs-null 비교 버그 수정 (DRY_RUN 전)

`36-G5-v4-legacy-cleanup-apply` (파일 `.v4.js`, v1·v2·v3 보존). **tolerance·settle 는 손대지 않았다**(원인이
아니었으므로).

- `evalField()` 로 비교 로직을 하나로 모았다: `before===null && after===null` → `pass=true`(둘 다 "해당 없음"이면
  같은 것) · 한쪽만 `null` → `pass=false`(진짜 차이) · 둘 다 숫자 → 기존 `near(a,b,0.5)` 그대로 ·
  `flowChildCount` 는 원래부터 정수 exact compare 그대로.
- **`c.layoutUnchanged` 판정과 `failureDiagnostics.fieldDiagnostics` 진단표가 이제 같은 함수 호출 결과를
  공유한다** — 이번 버그가 "판정 로직과 진단 로직이 서로 다르게 구현돼 있다가 어긋난" 종류였기 때문에, 구조
  자체를 하나로 합쳐 같은 종류의 재발을 막았다.
- ALLOWLIST 는 36-v3 rollback 이후 실제 id(네 번째 세대, `1137:xxxx`)로 교체, `EXPECTED_GROUP` 도 갱신. 기존
  backup 3개(`1133:644` · `1135:1535` · `1137:2426`)는 이 스크립트가 전혀 참조하지 않는다.

mock 테스트(29개 항목): mock 자체를 실제 버그 패턴과 똑같이 만들었다 — Main(freeW HUG) · Toolbar(freeH HUG) ·
KPI section(둘 다 HUG) · Grid(둘 다 HUG) 를 실제로 HUG 축으로 설정해 6개 필드가 진짜로 `null` 이 나오게 하고,
**이 정확한 시나리오에서 APPLY 가 성공하는지**(v1~v3 라면 반드시 실패했을 상황)를 핵심으로 검증 / null/null 두
값이 결과에 `before:null, after:null, pass:true` 로 명시적으로 남는지(조용히 건너뛴 게 아니라) / 같은 노드의
다른 축이 진짜 숫자면(Toolbar.freeW) 2px 급 진짜 변화는 여전히 잡아 rollback / **한쪽만 null 인 병적인 경우**
(sizing mode 가 중간에 바뀐 것처럼 시뮬레이션)는 여전히 실패로 정확히 잡히는지(과잉 수정 방지) / backup 3개
전부 참조 안 함 / NEVER_TOUCH 5개 유지.

**지금 실행할 것: 36-G5-v4 DRY_RUN. 통과하면 APPLY 진행 여부를 결과 검토 후 결정한다.**

### 36-G5-v4 APPLY 성공 (2026-09-18)

`successCriteriaMet` true · `rolledBack` false · `allTargetsDeleted` · `flowSnapshotUnchanged` ·
`layoutUnchanged`(v4 수정 후 처음으로 통과) · `trackedRefsUnchanged` · `protectedNodesUntouched` · `noErrors`
전부 true. 24개 삭제(하위 103개 포함), backup `1138:3317` 생성. **Phase G5 삭제 실행 완료.**

## 40) Phase G5 최종 검증 (read-only)

`40-G5-v1-final-verify`.

- 삭제 대상 24개(v4 allowlist) 가 전부 없는지 · REVIEW_REQUIRED 3개·KEEP wrapper 2개 존재(+wrapper 가 Toolbar
  서브트리 안에 있는지) · View Toggle/Bell/Sync Chip 존재·visible.
- KPI section 이 KPI Card 4개, Grid 가 App Card 12개만 flow 에 남았는지(legacy 는 이미 삭제됐으니 hidden 으로
  숨어서 안 잡힐 걱정도 없다).
- **NavItem 6개는 best-effort** — 정확한 컴포넌트 마스터 id 를 갖고 있지 않아 이름 패턴("nav item")으로 찾는다.
  안 맞으면 note 로 "직접 aside 목록을 봐달라"고 명시하지, 조용히 넘기지 않는다.
- Main 이 여전히 의도된 vertical scroll 컨테이너인지 **절대값이 아니라 구조로**(FIXED height ·
  clipsContent · overflowDirection VERTICAL) 확인.
- 지금까지 생긴 fresh backup 4개(`1133:644` · `1135:1535` · `1137:2426` · `1138:3317`) 전부 mainFrame 밖에
  그대로 있는지 — 전부 손대지 않는다.

mock 테스트(26개 항목): 정상 상태에서 전부 통과 / 삭제 대상이 하나라도 남아있으면(회귀) 잡음 / REVIEW_REQUIRED·
KEEP wrapper 누락 각각 잡음 / ref 가 hidden 이면 잡음 / KPI·Grid 개수가 하나라도 다르면 잡음 / NavItem 개수가
다르면 note 와 함께 잡음 / Main 이 scroll 구조가 아니면 잡음 / backup 이 없거나 mainFrame 안으로 잘못 들어가면
각각 잡음.

**지금 실행할 것: 40-G5-v1-final-verify (read-only, 바로 Run). 통과하면 Phase G5 CLOSED 로 기록한다.**

### 40-G5-v1 실행 결과 → navItemCount6 만 false, 나머지 전부 통과 (2026-09-18)

`allDeletedTargetsAbsent` · `reviewRequiredPresent` · `keepWrappersPresent` · `keepWrappersInsideToolbar` ·
`refsAllPresentAndVisible` · `kpiCardCount4` · `gridAppCardCount12` · `mainIsScrollContainer` ·
`allBackupsPresentOutsideMainFrame` · `noErrors` 전부 true. 유일한 실패는 `navItemCount6` — 원인은 verifier
탐지 방식의 false negative: Aside 의 direct flow children 이 Container 2개(`1002:493`/`1002:532`)뿐이고
NavItem 인스턴스는 그 안에 중첩돼 있어서, v1 의 "direct child + 이름 패턴" 방식으로는 0개가 나오는 게 정상이었다.
실제 NavItem instance id 6개(`1093:614`/`619`/`624`/`629`/`634`/`639`, F1 단계에서 생성) 확인.

## 40 v2) Phase G5 최종 검증 — NavItem 판정만 exact id 로 수정 (read-only)

`40-G5-v2-final-verify` (파일 `.v2.js`, v1 보존). **NavItem 검증만 고쳤다** — 이름 패턴 best-effort 를 버리고
exact id 6개 각각에 대해 exists · type===INSTANCE · visible===true · Aside(`1002:492`) 서브트리 안(중첩 깊이
무관, `inside()` 로 확인)인지 직접 확인해 6개 전부 만족해야 `navItemCount6=true`. 나머지 v1 검증 로직(삭제 대상
24개 부재, 보호 대상, refs, KPI 4/Grid 12, Toolbar 목록, Main scroll 구조, backup 4개)은 전혀 안 바꿨다.

mock 도 실제 구조(Aside → Container 2개 → 그 안에 NavItem 중첩)로 갱신해서 재현: 정상 상태에서 통과(v1 스크립트로
같은 mock 을 돌리면 여전히 false 가 나와 버그가 진짜였음을 다시 확인) / NavItem 하나가 아예 없거나 · hidden 이거나 ·
Aside 밖에 있는 경우 각각 잡음(과잉 통과 방지) / 나머지 6개 v1 실패 시나리오(삭제 대상 잔존·보호 대상 누락·
scroll 구조 깨짐·backup 소실)는 v1 과 동일하게 동작함을 회귀 확인. 총 26개.

**지금 실행할 것: 40-G5-v2-final-verify (read-only, 바로 Run). 통과하면 Phase G5 CLOSED 로 기록한다.**

## Phase G5 CLOSED (2026-09-18)

`40-G5-v2-final-verify` — `successCriteriaMet` true · `failedCriteria` [] · `phaseVerdict` "Phase G5 CLOSED 가능".
삭제 대상 24개 전부 부재 · REVIEW_REQUIRED 3개/KEEP wrapper 2개 존재(+Toolbar 서브트리 안) · View Toggle/Bell/
Sync Chip 존재·visible · KPI Card 4/App Card 12 · NavItem 6(exact id) · Main vertical scroll 구조 유지 ·
backup 4개(`1133:644`/`1135:1535`/`1137:2426`/`1138:3317`) 전부 mainFrame 밖에 보존. 전부 확인.

## 메인 화면 source of truth 확정 (2026-09-18)

A~H2(Chip·Button·Select/Input·Add·KPI·App Card·NavItem·layout/scroll·Footer 제거·View Toggle·Header Bell·
Sync Chip) + Pretendard 폰트 전환 + G5(legacy/hidden 정리) 전부 CLOSED. `메인 화면 (1002:2)` 을 디자인
시스템·컴포넌트 체계의 공식 기준 화면으로 확정한다. 이후 다른 화면은 이 메인 화면에서 이미 검증된 컴포넌트
(Button/Select/Input/Chip/KPI/App Card/NavItem/Pagination/Icon Library/Icon Button)와 토큰(Typography·
Spacing·Radius·Controls 높이)을 그대로 재사용해서 확장한다.
