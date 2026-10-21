# Light / Dark 배경 테마

## 변경 내용

- `src/domain/settings.ts`: `backgroundTheme: "light" | "dark"` 추가. 기존 데이터나 잘못된 값은 Light로 보정한다. 기존 `themeColor` 6종 및 알림 설정은 유지한다.
- `src/ui/ThemeSettings.tsx`: 배경 테마 카드 → 메뉴 컬러 테마 카드 순서. 두 모드에 작은 화면 미리보기, 라디오 선택 상태, 키보드 포커스 및 스크린 리더 값을 제공한다.
- `src/ui/useAppTheme.ts`: OS 모드 자동 추종을 제거하고 저장된 배경 설정과 강조색으로 팔레트를 계산한다.
- `src/ui/tokens.ts`: 기존 Light/Dark 팔레트에 elevated, overlay, dark, shadow 역할을 추가한다. Dark에서는 그림자를 제거하고 표면색과 테두리로 구분한다. 기본 배경 Light `#F7F8FA`, Dark `#111725`; 카드 `#FFFFFF` / `#1C2535`; 상위 표면 `#FFFFFF` / `#263247`.
- `src/ui/design.tsx`, `PickerPanel.tsx`: 카드·버튼 그림자, 입력창의 키보드·선택색, 날짜·시간 선택기의 표면과 배경막을 공통 토큰으로 관리한다. 차트는 이미 공통 색상 토큰을 사용해 계산 로직 수정 없이 반영된다.
- `src/ui/ThemeRuntime.tsx`, `.web.tsx`, `src/app/_layout.tsx`: 네이티브 Appearance와 상태 표시줄, 앱 루트 배경 및 웹의 document 배경·color-scheme을 맞춘다. 앱의 선택을 OS 변경이 덮어쓰지 않는다. 라우팅·화면 키를 바꾸지 않아 입력 상태를 초기화하지 않는다.

## 저장

기존 `settings` 안에 배경과 강조색을 별도 필드로 저장한다. IndexedDB metadata 및 SQLite app_settings JSON의 기존 저장·정규화 경로를 사용하며 스키마나 DB 버전은 변경하지 않는다. 테마 변경은 저장 성공 후 즉시 반영하며 알림 재예약을 호출하지 않는다. 시작 시에는 기존 비동기 저장소 복원 과정을 따른다. 저장된 테마를 읽기 전 초기 프레임과 기존 밝은 스플래시까지 완전히 제거하는 별도 부팅 처리는 추가하지 않았다.

## 검증

- lint / TypeScript 검사 통과.
- 단위 테스트 35개 통과: 기존 설정 보정, 알림 설정 보존, SQLite 재연결 및 IndexedDB 복원, 12가지 조합의 텍스트 대비 포함. 주요·보조 텍스트와 선택 버튼의 대비 4.5:1 이상을 검증한다.
- Playwright 8개 통과: 두 배경과 6가지 강조색 독립 적용·복원, OS 변경 무시, 6개 화면, 다크 입력 필드·날짜 선택기, 기존 루틴·기록·프로젝트·통계 기능.
- Web export 및 Android/iOS production JS bundle export 성공.
- iOS Release 시뮬레이터 빌드·설치 성공. XCTest로 배경 선택·오늘 화면 이동·앱 재시작 후 복원·Light 복귀 통과. 기존 메뉴 6개 이동·스크롤 고정·키보드 회귀 테스트도 통과.
- Android 실기기·에뮬레이터 실행은 미확인. 기존 APK에는 이번 테마 변경이 포함되지 않으며 새 APK 빌드가 필요하다.

## 화면

- [Light 설정](background-light-settings.png)
- [Dark 설정](background-dark-settings.png)
- [Dark 날짜 선택기](background-dark-picker.png)

- [iOS Dark 설정](background-dark-ios.png)
- [iOS Light 설정](background-light-ios.png)
- [iOS Dark 오늘 화면](background-dark-today-ios.png)
