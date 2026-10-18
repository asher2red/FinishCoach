# 웹·모바일 내비게이션

6개 메뉴(오늘 → 루틴 → 기록 → 통계 → 프로젝트 → 설정)의 정의와 기존 `router.replace` 이동을 `src/navigation/menu.ts`에 모았다. 데이터 저장, 알림, 통계 계산과 화면별 기능은 변경하지 않았다.

## 구현

- `MenuNavigation.web.tsx`: 기존 헤더 안의 `Row`와 타일 `Button`을 그대로 사용한다. 작은 폭의 웹에서도 기존 배치를 유지한다.
- `MenuNavigation.tsx`: 네이티브 화면 안에서는 메뉴를 중복 표시하지 않는다.
- `BottomNavigation.tsx`: 네이티브 루트에서 Stack과 형제인 하단 영역을 렌더링한다. absolute 배치를 사용하지 않아 본문 높이에서 메뉴 높이가 자동으로 제외된다.
- `BottomNavigation.web.tsx`: 웹에서는 하단 메뉴를 렌더링하지 않는다.
- `src/app/_layout.tsx`: 웹 Stack은 유지하고, 네이티브에만 본문과 하단 메뉴의 세로 레이아웃을 적용한다.
- `src/screens/Coach.tsx`: 메뉴 표시를 분리하고 네이티브 본문 Safe Area에서 bottom을 제외했다. 본문 하단 여백은 네이티브 24pt, 웹은 기존 80px이다.
- `src/ui/useAppTheme.ts`: 기존 테마 계산을 추출해 본문과 하단 메뉴가 동일한 선택 색상 및 다크 모드를 사용한다.

## 높이·안전 영역

기존 메뉴 타일 하나의 최소 높이는 112pt이고 새 모바일 메뉴 항목은 56pt로 50% 줄었다. 기존 모바일의 3열 2행 메뉴는 행 간격을 포함해 약 232pt였으며, 새 메뉴는 한 줄이다. 새 전체 높이는 56pt + 상단 경계선 1pt + 기기의 하단 Safe Area이다. 접근성 글자 확대 시에는 글자를 자르는 대신 높이가 늘어날 수 있다.

하단 Safe Area와 좌우 inset은 메뉴 컨테이너에서 한 번 적용한다. 배경은 시스템 하단 영역까지 이어진다. 본문 스크롤과 메뉴는 서로 독립적이다. 선택 상태는 테마 색, 배경, 상단 선, 굵은 글씨 및 스크린 리더 선택 상태로 표시한다. 이미지 리소스는 기존 것을 그대로 사용한다.

기존 등록·수정 화면은 전체 화면 Modal을 유지한다. 편집 중에는 Modal이 메뉴를 덮으며 닫으면 원래 메뉴로 돌아온다. 편집 창 자체에 SafeAreaProvider를 두어 부모에서 이미 소비한 inset 때문에 닫기 버튼이 시스템 영역과 겹치던 문제를 보정했다. iOS 편집 ScrollView에는 키보드 inset 자동 보정을 적용했다. 편집 폼까지 메뉴를 계속 노출하려면 Modal 구조 변경이 추가로 필요하다.

## 검증

- lint, TypeScript: 통과.
- Vitest: 33개 통과.
- Web export: 성공. 기존 Playwright 7개 통과.
- 웹 320/390/1280px에서 기존 메뉴의 이동·키보드 조작 및 모바일 하단 메뉴 미표시를 추가 검증: 통과.
- Android·iOS production JS 번들 export: 성공.
- iOS 27.1 시뮬레이터 Release 빌드·설치·실행: 성공.
- iOS XCTest: 6개 메뉴 이동·선택 상태, 동일 너비·터치 높이, 스크롤 전후 고정 위치, 마지막 콘텐츠 노출, 키보드 표시와 편집 창 종료 후 메뉴 복귀 검증 통과. 실측 콘텐츠 56pt, 전체 91pt(경계선 1pt + 하단 inset 34pt).
- 화면: [iOS 하단 메뉴](navigation-ios.png).
- 스크롤 비교: [이전](navigation-ios-before-scroll.png), [이후](navigation-ios-after-scroll.png). [키보드 화면](navigation-ios-keyboard.png).
- Android 실제 기기 및 에뮬레이터 동작은 확인하지 않았다. 시스템 내비게이션 방식별 확인이 남아 있다.

별도 XCTest 검증 소스는 `e2e/native/NavigationUITests.swift`이며 `scripts/prepare-ios-navigation-test.rb`가 임시 검증 프로젝트를 만든다. 앱의 CNG 네이티브 프로젝트를 편집하지 않는다. 설치된 앱 `com.finishcoach.app`과 Xcode 및 CocoaPods의 xcodeproj gem이 필요하다.
