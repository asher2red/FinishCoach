# 단일 색상 테마

버튼·카드의 배경, 아이콘 받침, 테두리, 강조 텍스트는 선택한 하나의 팔레트를 공유한다. 기본값은 green이며 설정에서 red / blue / green / orange / purple / black을 선택하면 즉시 적용한다. 기존 브랜드·아이콘 이미지 파일과 색상은 유지했다. 메뉴 타일 오른쪽 위의 선택 체크 표시만 제거했으며 선택은 테두리·굵은 제목·접근성 상태로 구분한다.

## 구현

- `src/ui/tokens.ts`: `getPalette(color, dark)`에서 6가지 색상과 시스템 밝기별 강조·표면·테두리·hover 색을 생성한다. 카드 종류와 메뉴가 다른 색상을 임의로 선택하지 않도록 모든 tone을 같은 팔레트에 연결한다.
- `src/ui/ThemeSettings.tsx`: 설정 화면의 6가지 선택 컨트롤, 현재 색상, 선택/포커스/비활성 상태.
- `src/screens/Coach.tsx`: 저장된 설정을 Theme Provider에 연결해 모든 화면과 선택기에 적용.
- `src/domain/settings.ts`: `themeColor` 기본값·허용 값 검사. 기존 설정이나 유효하지 않은 값은 green으로 복구한다.
- `src/data/context.tsx`: 테마 저장에는 기존 큐·트랜잭션을 사용하되 `syncNotifications: false`로 알림 재예약을 생략한다. 다른 저장 호출의 동작은 유지한다.
- `src/ui/design.tsx`: 메뉴 선택 체크 표시 제거.

SQLite의 기존 app_settings JSON과 웹 IndexedDB의 settings에 색상을 함께 저장한다. DB 구조·버전 변경 없이 기존 알림 설정과 활동 데이터를 보존한다. 저장 실패 시 기존 색상을 유지하며 기존 오류 안내를 사용한다.

## 검증

- lint·TypeScript 통과, 단위 테스트 33개 통과.
- 기존 웹 기능/반응형/키보드 검증 6개 및 새 테마 검증 1개 통과. 6가지 색상 즉시 적용, 새로고침·라우트 이동 후 유지, 알림 설정 보존, 이미지 경로 동일성, 메뉴 표면색 통일 확인.
- SQLite 파일 재열기와 IndexedDB 재조회에서 모든 색상 유지 확인. 누락/잘못된 색상 기본값과 알림 채널 ID 불변성 확인.
- Web export 및 Android/iOS Hermes 번들 생성 성공. 이번 색상 변경 버전의 실기기 재설치는 수행하지 않았다.

[녹색 기본 화면](theme-green.png) · [색상 선택 설정](theme-settings.png)

기존 브랜드 디자인 보고 이후의 색상 정책은 이 문서를 기준으로 한다.
