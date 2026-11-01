# 오늘 루틴 홈 화면 위젯

캐릭터 위젯을 텍스트 목록 위젯으로 교체했습니다. 기존 위젯 종류(`FinishCoachWidget` / Android `CoachWidgetProvider`)를 유지하므로 업데이트 후 기존 위젯이 목록으로 바뀝니다. 캐릭터 PNG, 이미지 복사·다운샘플링, 감정·달성률 게이지는 위젯에서 제거했습니다. `assets/mascot` 원본은 디자인 자료로만 보존하며 위젯에서 참조하지 않습니다.

## 표시와 집계

- 제목: `오늘 루틴(남은 개수/전체 개수)` / `Today’s routines(n/m)`. 예: 전체 5개 중 2개 완료 → `오늘 루틴(3/5)`.
- `src/domain/today.ts`의 오늘 화면과 동일한 발생 항목과 집계 기준을 사용합니다. 완료도 남겨 표시하고, 건너뛴 항목은 미완료로 집계합니다. 비활성 루틴의 미완료는 제외하되 완료 이력은 유지합니다.
- 사용자 제목을 번역하거나 바꾸지 않습니다. 각 행 한 줄, 넘치는 제목은 말줄임표 처리합니다.
- 흰 배경, 미완료 검은색, 완료 초록색(`#16703D`). 앱의 다크 모드·강조색과 무관한 고정 팔레트입니다. 접근성 레이블에는 완료/미완료도 읽어 줍니다.
- 완료/취소/루틴 편집·언어 변경 후 앱 상태를 기존 공유 저장소로 반영합니다. 위젯의 제목/항목을 탭하면 오늘 화면을 엽니다. 위젯에서 직접 완료하는 기능은 추가하지 않습니다.
- 빈 상태는 `오늘 루틴(0/0)`과 안내 문구입니다. 날짜·타임존 변경이나 자정 만료 시 이전 날짜의 항목을 숨기고 `오늘 루틴(—/—)`과 앱 실행 안내를 표시합니다. 앱을 실행하면 오늘 항목을 다시 생성해 전달합니다.

## Android

`modules/finish-coach-widget`의 로컬 Expo Module + AppWidgetProvider를 유지합니다. `ListView`가 세로로 스크롤되며 제목은 고정됩니다. API 31+는 `RemoteViews.RemoteCollectionItems`, API 24–30은 `RoutineListService`를 사용합니다. 서비스는 BIND_REMOTEVIEWS 권한으로 보호하고 외부에 공개하지 않습니다. 행 최소 높이 44dp, 제목 44dp로 터치를 확보합니다. Android 위젯 크기 조절 시 목록 공간이 늘어나며 전체 항목을 잘라내지 않습니다.

스냅샷 schema v2는 AtomicFile로 저장합니다. 기존 v1 캐릭터 스냅샷은 목록으로 해석하지 않고 새 데이터 전달 전까지 갱신 안내를 표시합니다. OS 30분 갱신과 날짜·시간·타임존 브로드캐스트 및 권한 없는 inexact 자정 알람을 유지합니다. OS 지연으로 자정 즉시 갱신은 보장하지 않습니다.

## iOS

Expo Widgets 58과 기존 App Group 파일 타임라인 브리지를 유지합니다. `plugins/with-finish-coach-widget.cjs`에서 생성 Extension의 provider/view를 공유 파일 기반으로 연결하며 생성 native 폴더를 직접 수정하지 않습니다. 텍스트만 렌더링하므로 큰 이미지 아카이브 문제가 없습니다.

소형·중형은 3개, 대형은 10개까지 표시하고 초과 시 `더 보기 (+N)`를 표시합니다. 탭하면 오늘 화면에서 전체 목록을 확인합니다. **WidgetKit은 홈 위젯 안에서 목록의 직접 스크롤을 지원하지 않습니다.** 따라서 iOS에서 위아래 스와이프로 항목을 모두 탐색하는 요구는 충족할 수 없으며 Android 스크롤과 구분합니다. Dynamic Type·OS 틴트 모드는 표시 가능한 행 수/색상에 영향을 줄 수 있습니다.

앱 그룹 설정: `group.com.finishcoach.app`, Extension `com.finishcoach.app.widgets`. transport 파일 이름·버전은 기존 v1을 유지하되 내부 snapshot은 v2입니다. 스토리지·타임라인 직렬화는 앱 데이터 저장과 분리되어 실패해도 루틴 저장을 막지 않습니다.

## 개발과 검증

번역은 `localization/messages.csv`에서 관리하고 `npm run i18n:generate` → `npm run widgets:generate`로 생성합니다. `widgets:check`로 리소스 최신 상태를 검사합니다. 네이티브 변경이므로 Expo Go/OTA만으로 반영되지 않으며 앱 재빌드가 필요합니다. 웹에는 홈 위젯을 렌더링하지 않습니다.

코드 검증: lint·타입 검사·81개 테스트·i18n 검사 통과. 목록 75개, 중복/긴 제목, 완료·취소, 건너뛰기, 빈 목록, 날짜/타임존 만료, 공유 타임라인과 연속 갱신을 검사했습니다. 네이티브 빌드 및 실제 화면 검증 결과는 아래에 기록합니다.

공식 문서: [Expo Widgets SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/widgets/), [Android collection widgets](https://developer.android.com/develop/ui/views/appwidgets/collections), [Apple Widget Extension](https://developer.apple.com/documentation/WidgetKit/Creating-a-Widget-Extension).

iOS 격리 JS 런타임의 시간대에 의존하지 않도록 유효성 검사를 네이티브로 옮겼습니다. `routine-props.swift`가 OS Calendar/TimeZone으로 날짜·오프셋·만료를 검사한 뒤 렌더러에 전달합니다. `npm run test:widget-native`는 실제 Foundation으로 한국 자정 직후(UTC 전날), 만료 시각, 타임존 변경, 기존 스냅샷과 누락 데이터를 검사합니다(macOS/Xcode 필요).

### 네이티브 검증 기록

- Android Release APK 빌드 성공, API 36 에뮬레이터에 업데이트 설치 성공. 테스트 스냅샷 30개로 제목 고정, 완료 초록색/미완료 검은색, 한 줄 말줄임, 위아래 스크롤, 마지막 30번째 항목 도달, 행 탭으로 앱 열기, 빈 상태를 실제 홈 화면에서 확인했습니다. 테스트 뒤 원래 위젯 스냅샷을 복원했으며 루틴 DB는 수정하지 않았습니다.
- 캡처: [목록/말줄임/색상](widget-evidence/android-routines-list.png), [하단까지 스크롤](widget-evidence/android-routines-scrolled.png), [빈 상태](widget-evidence/android-routines-empty.png).
- Android 최종 APK 안에 이전 512px 캐릭터 PNG가 없음을 확인했습니다.
- iOS 앱+Extension Release 시뮬레이터 빌드 성공. 날짜/시간대는 네이티브 검사로 보완했고, 시뮬레이터 App Group 접근은 앱과 Extension에 각각 임시 서명하여 검증했습니다. `--deep` 앱 서명만으로는 Extension의 entitlement가 반영되지 않는 경우가 있어 각각 서명해야 합니다. 실제 아이폰은 유효한 개발 팀과 App Group 프로비저닝이 별도로 필요합니다.
- 실제 Android/iPhone 기기, Android 24–30 서비스 경로, iOS 전체 크기·Dynamic Type·틴트 조합은 별도 수동 검증이 필요합니다.
- iOS 최종 재빌드·개별 App Group 임시 서명·업데이트 설치 후, 홈 화면에서 `오늘 루틴(3/3)`과 실제 오늘 항목 `운동`, `일기`, `프로젝트 작업`의 검은색 표시를 확인했습니다. 캐릭터는 표시되지 않습니다. [iOS 실제 홈 캡처](widget-evidence/ios-routines-list.png). 소형 실표시 확인이며 대형·완료 색상·초과 항목의 모든 조합을 실검증했다고 간주하지 않습니다.
