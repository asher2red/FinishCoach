# 버튼·카드 디자인 개선

이 문서는 최초 타일·카드 개선 기록이다. 이후 적용한 빨간 모자·입체 PNG 아이콘·파스텔 팔레트와 최신 검증 범위는 [브랜드 가이드 반영 보고](BRAND-DESIGN.md)를 기준으로 확인한다.

## 기존 구조와 적용 범위

Expo SDK 58 / React Native 0.88 / Expo Router이며 Web은 React Native Web으로 동일 UI를 렌더링한다. `src/ui/design.tsx`의 Button·Card·Theme을 화면, 선택기, 알림 설정, 통계가 공유하고 있었다. 기존 이미지는 앱/템플릿 이미지와 두 종류의 템플릿 탭 아이콘뿐이어서 6개 메뉴에 맞는 일관된 선형 SVG를 추가했다. 이미 설치된 `expo-image`로 표시하며 의존성 추가는 없다.

## 파일과 컴포넌트

- `src/ui/design.tsx`: 기존 Button에 action/tile 변형, 아이콘·설명, hover/focus/pressed/disabled/selected 표현. Card에 content/metric/featured 변형.
- `src/ui/tokens.ts`: 기존 밝은·어두운 팔레트 이동, 표면 테두리·hover·강조색 위 텍스트 추가. 반경·여백·아이콘 크기·플랫폼 그림자 정의.
- `src/ui/ActionIcon.tsx`, `assets/icons/*.svg`: 오늘·루틴·기록·통계·프로젝트·설정 아이콘. 장식 이미지는 스크린 리더에서 숨김.
- `src/screens/Coach.tsx`: 기존 6개 메뉴 버튼에 tile 적용, 오늘의 요약을 공통 featured 카드로 연결. 라우트와 클릭 핸들러 유지.
- `src/ui/AnalyticsDashboard.tsx`: 작은 수치 카드만 그림자 없는 metric 변형 적용.
- `scripts/serve-web.mjs`: SVG를 `image/svg+xml`로 제공해 브라우저 아이콘 표시 지원.
- `e2e/design.spec.ts`: 좁은/넓은 레이아웃, 이미지 로딩, 메뉴 키보드 실행·선택 상태, 다크·모션 감소 환경 검증.

## 디자인 규칙

메뉴 타일은 상단의 26px 아이콘과 하단 제목으로 구성되며 전체가 하나의 Pressable이다. 최대 너비 156px, 기본 높이 112px, 유동 줄바꿈으로 작은 화면과 넓은 화면에서 균형을 유지한다. 일반 버튼은 최소 높이 48px와 20px 아이콘 변형을 사용하며 폼의 액션은 타일로 바꾸지 않았다. 제목은 줄 수 제한 없이 줄바꿈한다.

버튼 반경 14px, 타일 20px, 카드 24px, 카드 내부 여백 20px를 공유한다. 콘텐츠 카드는 1px 테두리와 낮은 그림자, 통계 수치 카드는 테두리만, 오늘의 요약 카드는 강조색 표면을 사용한다. 정보 카드는 View로 유지해 클릭 효과나 중첩 터치 영역을 추가하지 않았다.

선택 타일은 색상 외에도 체크 표시와 굵은 제목으로 구분한다. 네이티브 접근성 selected 상태를 유지하고 Web은 `aria-current=page`로 현재 메뉴를 알린다. 제목을 접근성 이름으로 유지해 기존 버튼 탐색을 보존했다. 비활성 버튼은 기존 disabled 이벤트 차단을 유지한다.

## 플랫폼 처리

- Web: 낮은 boxShadow, hover 배경/테두리, pointer/not-allowed 커서, 3px focus 외곽선. 로컬 SVG MIME 지원.
- iOS: shadowOffset·shadowRadius·shadowOpacity를 사용하고 카드 overflow를 숨기지 않아 그림자와 내부 컨트롤을 보존.
- Android: 낮은 elevation 2와 표면 테두리 사용.
- 새 애니메이션이나 확대/이동 효과를 추가하지 않아 모션 감소 환경에서도 동일하게 동작한다.

## 검증

- lint / TypeScript: 통과.
- Vitest: 기존 31개 통과.
- Chrome E2E: 기존 4개와 추가 2개, 총 6개 통과. 320·390·1280px, 아이콘 이미지 정상 로딩, 키보드 focus/Enter 이동, 현재 메뉴 표시, 다크 모드·모션 감소와 비활성 설정 확인.
- Expo export: Web 정적 빌드와 Android/iOS Hermes 번들 생성 성공.
- iOS 시뮬레이터 Release 빌드·설치·실행 성공. 실제 캡처에서 SVG 아이콘 6종, 타일 체크 표시와 카드 표면·그림자 렌더링 확인.
- Android 실기기 렌더링·TalkBack/VoiceOver·큰 시스템 글자 크기 확인은 추가 수동 검증 항목이다.

데이터 모델·DB·알림 예약·저장·라우팅·기능 핸들러는 수정하지 않았다. 기존 APK/아이폰 설치본은 이번 디자인을 반영하지 않으며 별도 재빌드가 필요하다.

## 화면

- [모바일](design-mobile.png)
- [다크 / 320px](design-mobile-dark.png)
- [데스크톱](design-desktop.png)
- [긴 액션 제목과 비활성 설정](design-settings-dark.png)
- [iOS 시뮬레이터](design-ios.png)

이전 화면은 Git 커밋 `6b888bc`의 `docs/mobile-web.png`, `docs/desktop-dark.png`에서 비교할 수 있다.
