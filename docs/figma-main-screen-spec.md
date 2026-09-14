# 피그마 메인 화면 실측 스펙

- 파일: `줍줍 레퍼런스` (fileKey `hILvufkI04JInvPtCCf1L1`)
- 프레임: `메인 화면 (지원 목록 및 kpi 차트)` — node `1002:2`
- 추출일: 2026-09-14 / 도구: Figma MCP `get_design_context`, `get_metadata`, `get_variable_defs`
- **이 문서의 값은 모두 피그마 노드에서 읽은 실제 값이다. 추정치는 "추정"으로 따로 표기했다.**

---

## 1. 프레임 / 레이아웃 골격

| 노드 | 이름 | 위치 | 크기 |
|---|---|---|---|
| `1002:2` | 메인 화면 (프레임 루트) | — | **1280 × 1024** |
| `1002:492` | Aside (사이드바) | 0, 0 | **256 × 1024** |
| `1002:469` | Header (상단바) | 256, 0 | 1024 × 64 |
| `1002:3` | Main | 256, 0 | 1024 × 1024 |
| `1002:4` | Container (본문) | 24, 64 | **976 × 896** |

- 본문 좌우 여백 **24px** (1024 − 976 = 48 / 2), 상단 여백 64px = 헤더 높이.
- 본문 섹션 y좌표: Top Header 0(h64) → KPI 80(h86) → 필터 182(h59.5) → 테이블 257.5(h687).
  → **섹션 간 간격 16px** (좌표 계산값. Auto Layout gap 속성 자체는 확인 못 함 — §9 참고)

---

## 2. 사이드바 (`1002:492`)

```
width 256 / height 1024 (full)
bg #ffffff
drop-shadow 0px 1px 4px rgba(0,0,0,0.04)
flex-direction column / justify-content space-between / padding 16px 0
```

| 요소 | 값 |
|---|---|
| 상단 블록 gap | 4px |
| 브랜드 행 | padding 0 12px, height 34, gap 5.333px |
| 앱 아이콘 | 36 × 34 (PNG) |
| "줍줍" | Abel Regular **21.333px / 29.333px**, letter-spacing −0.5333, `#0b1c30` |
| 구분자 "\|" | Inter Medium **14.667px / 18.667px**, +0.3667, `#c7c4d8` |
| "JOOB" | Inter SemiBold **21.333px / 29.333px**, −0.5333, `#464555` |
| 버전 배지 v2.4 | bg `#dce9ff`, padding 2px 4px, radius **12**, Inter Medium 11/14, +0.275, `#464555`, 32.77 × 18 |
| 섹션 라벨 | Abel Regular **11 / 14**, +0.55, uppercase, `#777587`, padding 7px ?px 3px |
| ├ "메인 워크스페이스" | 좌우 padding **16px** |
| └ "시스템" | 좌우 padding **8px** ← 값 불일치 |
| Nav 컨테이너 | padding 0 12px, gap 2px |
| Nav 링크 (공통) | width 232, padding 8px 12px, radius 8, gap 8px |
| Nav 활성 (지원 내역) | bg `#dce9ff`, Abel Regular **16 / 24**, tracking 없음, `#3525cd`, height **40** |
| Nav 비활성 | bg 없음, Abel Regular **13 / 16**, −0.065, `#464555`, height **32** |
| Nav 아이콘 | 13.5×14.288 / 15×15.75 / 13.5×15 / 16.5×11.268 / 15.075×15 / 15×15 (전부 제각각) |

---

## 3. 상단바 Header (`1002:469`)

```
1024 × 64 / padding 0 24px
bg rgba(248,249,255,0.8) + backdrop-blur 12px
box-shadow 0px 1px 8px rgba(0,0,0,0.04)
flex / align-items center / justify-content space-between
```

| 요소 | 값 |
|---|---|
| 알림 버튼 | padding 8px 8px 10px, radius 8, 아이콘 13.333 × 16.667 |
| 동기화 배지 | bg `#eff4ff`, padding 4px 8px, radius **12**, gap 6, dot 8px `#006c49`, Abel Regular 11/14 +0.275 `#00714d` |
| 프로필 | 32 × 32, radius **12**, box-shadow 0px 1px 8px rgba(0,0,0,0.04) |

---

## 4. 본문 헤더 (`1009:698`, 976 × 64)

```
padding-top 4px / flex / align-items flex-end / justify-content space-between
```

| 요소 | 값 |
|---|---|
| H1 "지원 내역" | Abel Regular **28 / 36**, −0.7, `#0b1c30` |
| 시즌 배지 | bg `#e2dfff`, padding 2px 10px, radius **12**, gap 4, dot 6px `#4f46e5`, Inter SemiBold 11/14 +0.275 `#3525cd` |
| 서브카피 | Abel Regular **14 / 20**, −0.084, `#464555` |
| 기록 추가 버튼 | bg `var(--accents/indigo, #6155f5)`, padding **6px 12px**, radius 8, gap 4, drop-shadow 0px 1px 4px rgba(0,0,0,0.04), 텍스트 Abel Regular 13/16 −0.065 `#ffffff`, 아이콘 9.333, **높이 28** |

---

## 5. KPI 카드 (`1002:23`)

```
Section: flex / gap 12px / align-items flex-start / justify-content center
카드 4장 각각 flex:1 0 0 → 실제 235 × 86
```

**카드 공통**

```
bg #ffffff / padding 16px / radius 8 / overflow hidden
box-shadow 0px 1px 2px rgba(0,0,0,0.05)     ← border 없음
flex-direction column / justify-content space-between
```

| 요소 | 값 |
|---|---|
| 라벨 | Abel Regular **11 / 14**, +0.55, uppercase, `#777587` |
| 수치 | Inter SemiBold **28 / 36**, −0.7, `#0b1c30` |
| 단위 "건" | Abel Regular 11/14, +0.275, `#464555`, 수치와 gap 4 (baseline 정렬) |
| 수치 블록 | 상단 padding 4px, 높이 36, **내부 배지는 absolute 배치** |

**델타 배지 4종 — 전부 다름**

| 카드 | bg | 텍스트 | padding | radius | top |
|---|---|---|---|---|---|
| 1. 이번 달 지원 | `#dce9ff` | Inter **SemiBold** 11/14 `#3525cd` | 2px **6px** | 2 | **13** |
| 2. 진행 중 | `rgba(108,248,187,0.6)` | Inter **Medium** 11/14 `#00714d` | 2px **6px** | 2 | 15 |
| 3. 이번 달 불합격 | `#ffdad7` | Inter **Medium** 11/14 `#930013` | 2px **6px** | 2 | 15 |
| 4. 최종 합격 | `#eff4ff` | **Abel** Regular 11/14 `#777587` | 2px **8px** | 2 | 15 |

---

## 6. 필터 / 검색 툴바 (`1003:1695`, 976 × 59.5)

```
bg #ffffff / padding 12px / radius 8
drop-shadow 0px 1px 1px rgba(0,0,0,0.05)
flex / align-items center / justify-content space-between
```

| 요소 | 값 |
|---|---|
| 검색 입력 | 249 × **31**, bg `#eff4ff`, radius 8, padding **6px 12px 6px 36px**, box-shadow 0px 1px 2px rgba(0,0,0,0.05) |
| 검색 placeholder | Abel Regular **13 / normal**, tracking 없음, `#777587` |
| 검색 아이콘 | 13.5 × 13.5, left 12 |
| 필터 그룹 gap | 8px |
| 셀렉트 (4개) | bg `#eff4ff`, radius 8, padding **6px 28px 6px 12px**, **높이 28** |
| 셀렉트 텍스트 | Abel Regular **13 / 16**, −0.065, `#0b1c30` |
| 셀렉트 화살표 | 8 × 4.933, right 7.7 (포지션 필터만 right 8.05) |
| 초기화 버튼 | 배경 없음, padding **6px 10px**, radius 8, gap 4, Abel Regular 13/16 −0.065 `#464555`, 높이 28 |
| 뷰 토글 컨테이너 | bg `#eff4ff`, padding 4, radius 8 |
| 토글 버튼 | radius 4, padding **4px 4px 10px** (위아래 비대칭), 아이콘 13.5 |
| 토글 활성 | bg `#ffffff` + drop-shadow 0px 1px 1px rgba(0,0,0,0.05) |

---

## 7. 지원 카드 그리드 (`1002:139` → `1002:140`)

- 카드 12장, 전부 **235 × 201**
- 4열 그리드. 열 피치 247 → **가로 간격 12**, 행 피치 241 → **세로 간격 40**
- 푸터(`1002:451`, 976 × 52)는 y = 635.5. 3행 카드가 y = 683에서 끝나므로 **약 47.5px 겹침**

**카드 공통 (`1002:141`, `1003:1794`, `1003:1839`, `1009:93` 확인)**

```
bg #ffffff
border 1px solid rgba(199,196,216,0.3)
radius 8
drop-shadow 0px 1px 1px rgba(0,0,0,0.05)
padding 17px                      ← 17
flex-direction column / justify-content space-between
내부 gap 12px, 정보행 gap 8px
```

| 요소 | 값 |
|---|---|
| 상태 dot | 10 × 10, radius 12, `#3525cd`(진행) / `#ba1a1a`(불합격), 링 box-shadow 0 0 0 4px rgba(색,0.15) |
| 기업명 | Abel Regular **16 / 22**, −0.4, `#0b1c30` |
| 포지션 칩 | bg `#eff4ff`, padding **2px 8px**, radius 8, 11/14, +0.275, `#464555` |
| ↳ Card 11 "PO" | 같은 칩인데 **Inter Medium** (다른 카드는 Abel Regular) |
| 항목 라벨 | Abel Regular 11/14, +0.275, `#777587` |
| 항목 값 | Inter Medium 11/14, +0.275, `#0b1c30` |
| 현재 단계 칩 | bg `#e5eeff`, padding 2px 8px, radius 8, Abel Regular 11/14 `#464555`, **높이 18** |
| 구분선 | border-top rgba(199,196,216,0.3), padding-top 9 |
| 단계 수 배지 | bg `#eff4ff`, radius **2**, padding 2px 6px, gap 4, 아이콘 9.75, Inter Medium 11/14 `#464555` |
| 공고 바로가기 버튼 | padding **6px 4px 10px**, 배경·radius 없음, 아이콘 12 × 12 |
| 더보기 버튼 | padding **4px 4px 10px**, 아이콘 12 × 3 |

**전형 상태 칩 — 공통 padding 2px 8px / radius 8 / 11px / line-height 14 / 높이 18**

| 상태 | bg | 텍스트 |
|---|---|---|
| 접수완료 | `#e2dfff` | `#3525cd` |
| 서류 확인 | `#6cf8bb` | `#00714d` |
| 일정 조율 | `#e2dfff` | `#3525cd` |
| 불합격 | `#ffdad6` | `#ba1a1a` |

(12장 중 접수완료 9 · 서류 확인 1 · 일정 조율 1 · 불합격 1)

---

## 8. 푸터 / 페이지네이션 (`1002:451`, 976 × 52)

```
bg #ffffff / padding 12px 16px / radius 8
drop-shadow 0px 1px 1px rgba(0,0,0,0.05)
flex / justify-content space-between
```

| 요소 | 값 |
|---|---|
| "총 20개 중 1-8 표시" | Inter Medium 11/14, +0.275, `#464555` |
| 구분 dot | 4 × 4, radius 12, `#c7c4d8` |
| "정렬: 지원일 최신순" | Abel Regular 11/14, +0.275, `#777587` |
| 페이지 버튼 | **28 × 28**, radius **4**, gap 4 |
| 현재 페이지 | bg `#4f46e5`, Inter SemiBold 11/14 `#ffffff` |
| 다른 페이지 | 배경 없음, Inter Medium 11/14 `#464555` |
| 비활성 화살표 | opacity 0.4 |

---

## 9. 텍스트 스타일 전체 목록

**Abel Regular** (한글 본문/라벨 전반)

| size / line-height | letter-spacing | 사용처 |
|---|---|---|
| 28 / 36 | −0.7 | 페이지 H1 |
| 21.333 / 29.333 | −0.5333 | 로고 "줍줍" |
| 16 / 24 | 없음 | 사이드바 활성 메뉴 |
| 16 / 22 | −0.4 | 카드 기업명 |
| 14 / 20 | −0.084 | 서브카피 |
| 13 / 16 | −0.065 | 셀렉트, 버튼, 사이드바 비활성 메뉴 |
| 13 / normal | 없음 | 검색 placeholder |
| 11 / 14 | +0.55 (uppercase) | 섹션 라벨, KPI 라벨 |
| 11 / 14 | +0.275 | 칩, 보조 텍스트 |

**Inter SemiBold**: 28/36 (−0.7) KPI 수치 · 21.333/29.333 (−0.5333) "JOOB" · 11/14 (+0.275) 배지·현재 페이지
**Inter Medium**: 14.667/18.667 (+0.3667) 구분자 · 11/14 (+0.275) 날짜·수치·배지

---

## 10. 색상 전체 목록

**변수로 등록된 색: 단 1개** — `Accents/Indigo = #6155f5` (기록 추가 버튼에만 적용). 나머지는 전부 raw hex.

| 용도 | HEX |
|---|---|
| 텍스트 (진함) | `#0b1c30` |
| 텍스트 (기본) | `#464555` |
| 텍스트 (약함) | `#777587` |
| 텍스트/보더 (가장 약함) | `#c7c4d8` |
| 인디고 A (버튼) | `#6155f5` |
| 인디고 B (페이지네이션, 시즌 dot) | `#4f46e5` |
| 인디고 C (강조 텍스트, dot) | `#3525cd` |
| 배경 (연한 블루) | `#eff4ff` |
| 배경 (칩) | `#e5eeff` / `#dce9ff` / `#e2dfff` |
| 성공 | `#6cf8bb` / `rgba(108,248,187,0.6)` / `#00714d` / `#006c49` |
| 실패 | `#ffdad6` / `#ffdad7` / `#ba1a1a` / `#930013` |
| 헤더 배경 | `rgba(248,249,255,0.8)` |
| 보더 (유일) | `rgba(199,196,216,0.3)` |

**그림자**

| 값 | 적용 방식 | 사용처 |
|---|---|---|
| 0px 1px 4px rgba(0,0,0,0.04) | drop-shadow | 사이드바, 기록 추가 버튼 |
| 0px 1px 1px rgba(0,0,0,0.05) | drop-shadow | 지원 카드, 툴바, 푸터, 토글 활성 |
| 0px 1px 2px rgba(0,0,0,0.05) | box-shadow | KPI 카드, 검색 입력 |
| 0px 1px 8px rgba(0,0,0,0.04) | box-shadow | 상단바, 프로필 |
| 0 0 0 4px rgba(색,0.15) | box-shadow(ring) | 카드 상태 dot |

---

## 11. 컴포넌트 / variant 구조

**없음.** 이 프레임의 노드 741개 중:

- frame 489 / text 177 / vector 55 / rounded-rectangle 16
- **component 0, component set 0, instance 0**

즉 카드·칩·버튼이 전부 독립 프레임으로 복제되어 있고, variant 구조도 공유 컴포넌트도 없다. 값이 카드마다 조금씩 어긋나는 원인이기도 하다.

---

## 12. 같은 역할인데 값이 다른 것

| # | 항목 | 차이 |
|---|---|---|
| 1 | 인디고 | `#6155f5`(버튼) / `#4f46e5`(페이지네이션·dot) / `#3525cd`(강조 텍스트·dot) — 3종 |
| 2 | 실패 색 | 배경 `#ffdad6`(카드) vs `#ffdad7`(KPI), 텍스트 `#ba1a1a`(카드) vs `#930013`(KPI) |
| 3 | 성공 색 | `#6cf8bb` 단색(칩) vs `rgba(108,248,187,0.6)`(KPI), dot만 `#006c49` |
| 4 | 칩 radius | 8(카드 칩·포지션) / 12(v2.4·시즌 배지) / 2(KPI 델타·단계 수) |
| 5 | KPI 델타 배지 | 좌우 padding 6px ×3 vs **8px**(최종 합격), top 13 vs 15 |
| 6 | 칩 글꼴 | 같은 역할인데 Abel Regular / Inter Medium / Inter SemiBold 혼용 (KPI 1~3 vs 4, 포지션 칩 "PO" vs "제품 기획") |
| 7 | 사이드바 메뉴 | 활성 16/24·height 40 vs 비활성 13/16·height 32 |
| 8 | 사이드바 섹션 라벨 | 좌우 padding 16 vs 8 |
| 9 | 카드 Auto Layout | Card 1·11·18은 `justify-content: space-between`, **Card 10(`1003:1794`)만 빠짐** |
| 10 | 카드 padding | 지원 카드 **17** / KPI 16 / 툴바 12 / 푸터 12·16 |
| 11 | 그림자 적용 방식 | 같은 카드류인데 drop-shadow(필터) vs box-shadow 혼용, 값도 1px vs 2px blur |
| 12 | 보더 | 지원 카드는 보더 있음, KPI 카드는 없음 |
| 13 | 아이콘 버튼 padding | 위아래 비대칭 (6/10, 4/10, 8/10) — 세로 중앙 안 맞음 |
| 14 | 그리드 간격 | 가로 12 vs 세로 40 |
| 15 | 13px 텍스트 tracking | 대부분 −0.065인데 검색 placeholder만 없음 + line-height도 normal |
| 16 | 레이아웃 겹침 | 푸터가 3행 카드와 약 47.5px 겹침 |

---

## 13. 피그마에서 확인할 수 없었던 것

| 항목 | 이유 |
|---|---|
| `Main`(1002:3), `Container`(1002:4), `Section - Applications Table`(1002:139), 카드 그리드 `Container`(1002:140)의 **Auto Layout 방향/gap/padding 속성** | 자식이 많아 코드 응답이 용량을 초과해 좌표만 담긴 sparse 메타데이터만 반환됨. 본 문서의 "본문 padding 24 / 섹션 간격 16 / 그리드 간격 12·40"은 **좌표 계산값**이며 속성 자체를 읽은 것이 아님 |
| 공유 **텍스트 스타일 이름** | 등록된 텍스트 스타일이 없어 코드에 이름이 나오지 않음 |
| 공유 **색상 스타일 이름** | 변수는 `Accents/Indigo` 1개뿐, 나머지는 스타일 없이 raw hex |
| 각 노드의 **hug / fill / fixed** 설정과 constraint | 일부만 `flex:1 0 0`로 유추 가능, 나머지는 확인 불가 |
| **hover / focus / pressed** 상태 | 해당 상태의 프레임이 파일에 없음 |
| 폰트 **weight의 피그마상 실제 스타일명** | 코드는 `font-['Abel:Regular'] font-normal`, `font-['Inter:Regular'] font-semibold` 식으로 매핑해 반환 — Abel은 Regular 단일 웨이트 |
| 카드 그리드가 **wrap Auto Layout인지 절대 배치인지** | 좌표상 균일 그리드지만 속성 미확인 |
| 상태 칩의 **명시적 height** | 코드에 height 선언 없음. 메타데이터 좌표상 18px이고 padding 2+2 + line-height 14 = 18로 일치 |

---

## 14. 확인 범위

- 코드(실제 CSS 값)까지 확인: 사이드바, 상단바, 본문 헤더, KPI 4장, 필터 툴바, 푸터, 지원 카드 4장(Card 1·10·11·18), 전형 상태 칩 `1003:1769`
- 메타데이터(크기·좌표·라벨)까지만 확인: 나머지 지원 카드 8장 — 크기는 전부 235 × 201로 동일, 칩 라벨과 폭만 대조함
