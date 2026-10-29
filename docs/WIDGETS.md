# 도베르만 교관 홈 화면 위젯

## 구성

실제 OS 홈 화면 위젯입니다. Web 카드나 다른 앱 위의 오버레이를 추가하지 않습니다.

- iOS: Expo SDK 58 공식 `expo-widgets` 58.0.25, Expo UI SwiftUI. `systemSmall` 하나를 지원합니다. `app.json` 플러그인이 Extension과 App Group을 재생성합니다.
- Android: `modules/finish-coach-widget`의 로컬 Expo Module + AppWidgetProvider/RemoteViews. 공식 Expo Android 위젯 API는 현재 타임라인과 위젯 전체의 콜드 스타트 딥링크 연결이 제한되어, 필요한 기능을 작은 로컬 모듈로 구현했습니다.
- Web: `runtime.ts`의 no-op 구현만 포함합니다. 네이티브 위젯 모듈을 import하지 않습니다.
- 새 서버·로그인·오버레이 권한·위젯 안의 완료/삭제 조작은 없습니다.

추가 의존성은 `expo-widgets`, `expo-asset`, `expo-file-system`이며 기존 `@expo/ui`를 58.0.25로 맞췄습니다. 새 FileSystem 바이너리와 기존 ExpoModulesCore 간 시작 시 심볼 충돌이 발견되어 Expo 58.0.21 / React Native 0.88.1 및 SDK 권장 패치 버전으로 맞췄습니다. 메이저 SDK 변경은 없으며 `expo-doctor` 20개 검사를 통과했습니다. 네이티브 생성 폴더를 직접 수정하지 않습니다. Android Manifest/리소스는 로컬 모듈의 원본이고 자동 링크됩니다.

## 캐릭터와 화면

`assets/mascot/doberman-expression-sheet-v1.png` 원본을 보존했습니다. imagegen 스킬의 내장 image_gen 도구로 기존 캐릭터를 참조하여 얼굴 중심 투명 PNG 5개를 만들었습니다.

- `doberman-watch.png`: 감시
- `doberman-strict.png`: 엄격
- `doberman-observe.png`: 관찰
- `doberman-expect.png`: 기대
- `doberman-approve.png`: 인정

생성 프롬프트: 원본 시트의 해당 순번 도베르만만 분리해 동일한 검정/황갈색 무늬, 빨간 F 모자, 정면 시점, 매트 3D 스타일과 조명을 보존한다. 머리와 짧은 목만 중앙 배치하고 귀·모자·턱을 자르지 않는 투명 정사각 PNG로 만든다. 각 단계의 눈썹/눈꺼풀/다문 입 표정만 변화시킨다. 다른 캐릭터·텍스트·배경·소품을 넣지 않는다.

말풍선 형태의 짧은 문구, 얼굴, 큰 퍼센트와 게이지를 표시합니다. 0%에는 `!!`, 완료에는 `✦` 배지를 사용합니다. 정적 타이포그래피 장치이며 OS 이모지 그림에 의존하지 않습니다. 위젯 전체를 누르면 `finishcoach:///`로 오늘 화면을 엽니다.

## 달성률과 상태

`src/domain/today.ts`로 기존 오늘 화면의 계산을 그대로 추출하여 화면과 위젯이 공유합니다. 계산 의미는 변경하지 않았습니다.

- 오늘 날짜의 occurrence가 대상입니다.
- 활성·미삭제 루틴에 속한 항목 또는 이미 완료된 항목을 포함합니다.
- 건너뛴 항목도 분모에 포함하며 완료 수에는 넣지 않습니다.
- 보관/비활성화한 루틴의 이미 완료된 오늘 항목은 유지합니다.
- 주간 목표는 날짜별 occurrence를 만들지 않으므로 이 분모에 임의로 추가하지 않습니다.
- 프로젝트/마일스톤은 기존 오늘 루틴 달성률의 분모에 없으므로 새로 포함하지 않습니다.
- 퍼센트는 기존과 동일한 `Math.round(done / total * 100)`입니다.
- 전체 수 0은 100%로 간주하지 않고 중립 얼굴과 `—`, 작전 계획 안내를 표시합니다.

표정 경계는 반올림 전 실제 비율 25/50/75%이며 `done >= total && total > 0`일 때만 승인합니다. 예를 들어 199/200은 숫자가 100%로 반올림되더라도 기대 얼굴을 유지합니다.

## 스냅샷과 갱신

`src/widgets/snapshot.ts`: version, 현지 날짜, 타임존 오프셋, done/total/percent, 상태와 얼굴, 언어/테마, 현지화된 문구와 접근성 안내, 갱신 시각, 다음 현지 자정 expiresAt, 고정 딥링크를 만듭니다. 사용자 루틴명·메모를 스냅샷에 넣지 않습니다.

`WidgetSync`는 저장소의 성공적으로 반영된 상태와 `I18nProvider`의 언어를 구독합니다. 최초 로딩, 완료/취소, 등록·수정·삭제, 언어/테마 변경에 반영합니다. 기존 앱 포그라운드/분 단위 generate 흐름으로 날짜 변경도 재계산됩니다. 알림 예약 로직은 변경하지 않았습니다.

`publisher.ts`가 쓰기를 직렬화하고 중간 대기 요청은 최신 상태로 병합합니다. 갱신 시각만 달라진 동일 내용은 다시 보내지 않습니다. 위젯 쓰기는 앱의 저장 트랜잭션 밖에 있으며 실패가 앱 저장을 취소하지 않습니다. 실패 결과는 다음 상태 갱신 때 재시도합니다.

- iOS: 캐릭터 파일을 App Group `widgetsDirectory`에 임시 파일→이동으로 복사합니다. 로컬 `FinishCoachWidgetModule`이 현재 표시/자정 중립 상태 두 엔트리를 `ExpoWidgets/finish-coach-timeline-v1.json`에 원자적으로 기록합니다. Extension의 파일 기반 제공자가 같은 JSON을 직접 읽습니다. SDK의 UserDefaults suite가 앱 전용 폴더에 저장되는 환경에서도 공유됩니다. Expo UI 레이아웃은 유지하며 비동기 작업/React hook은 격리 렌더링 함수에서 사용하지 않습니다.
- Android: JSON을 내부 filesDir의 `AtomicFile`에 쓰고 위젯을 갱신합니다. 원본 SQLite를 열지 않습니다. OS 30분 주기 갱신과 날짜/시간/타임존 브로드캐스트를 받고, 다음 자정에 inexact AlarmManager 갱신을 예약합니다. 정확한 알람/백그라운드 서비스 권한을 추가하지 않습니다.

현재 날짜 또는 타임존과 맞지 않거나 expiresAt을 넘긴 스냅샷은 `—`와 ‘오늘 현황 확인’으로 표시합니다. 신뢰할 수 없는 오늘 데이터를 새로 계산하지 않습니다. iOS는 자정 중립 타임라인을 사용합니다. OS 절전/프로세스 제한으로 실제 표시 갱신은 늦어질 수 있으며, 초 단위 실시간 반영이나 정확히 00:00 변경을 보장하지 않습니다.

## 언어·테마·접근성

`localization/messages.csv`의 `widget.*` 12개 키를 추가했습니다. 한국어·영어 문구와 스크린 리더 안내는 기존 번역 API에서 생성해 전달합니다. Android의 초기/갤러리 문자열은 같은 CSV에서 XML로 생성합니다. 앱 명시적 언어 선택과 Light/Dark·6가지 강조색을 따릅니다.

숫자와 텍스트를 함께 제공하고 위젯 전체에 완료 수/전체 수/달성률/탭 안내 접근성 레이블을 둡니다. iOS tinted/accented 모드에서는 텍스트 대비를 조정하고 이미지 fullColor 모드를 지정하지만 최종 표시 효과는 OS의 렌더링 모드에 따릅니다. 모든 틴트·대형 글꼴 조합을 검증했다고 간주하지 않습니다.

## 생성과 빌드

```sh
npm run i18n:generate
npm run widgets:generate
npm run widgets:check
npm run i18n:check
npx expo prebuild --no-install
npm run build:android:local
npm run run:ios:local -- --device <SIMULATOR_ID> --configuration Release --no-bundler
```

`widgets:generate`가 Android 캐릭터 리소스와 초기 문구를 생성합니다. 번역/이미지 변경 후 실행하고 생성 결과를 함께 보관합니다. 로컬 플랫폼 빌드의 사전 단계에서도 실행합니다. Expo Go는 지원하지 않으며 네이티브 앱을 다시 빌드해야 합니다. Web 미리보기에서는 홈 화면 위젯을 확인할 수 없습니다.

iOS 설정:

- 앱: `com.finishcoach.app`
- Extension: `com.finishcoach.app.widgets`
- App Group: `group.com.finishcoach.app`

실제 아이폰에서는 메인 앱과 Extension 모두 같은 개발 팀으로 서명하고 App Group entitlement를 승인받아야 합니다. Personal Team은 App Groups 지원 제약이 있으므로 현재 무료 계정으로 실기기 설치가 가능하다고 가정하지 않습니다. 시뮬레이터 빌드는 실기기 서명 검증을 대체하지 않습니다. 외부 개발자 콘솔 설정은 변경하지 않았습니다.

## 위젯 추가

앱을 새 버전으로 설치하고 한 번 실행해 데이터를 준비합니다.

- Android: 홈 화면 빈 공간 길게 누르기 → 위젯 → Finish Coach → 원하는 위치에 추가합니다.
- iOS: 홈 화면 빈 공간 길게 누르기 → 편집/위젯 추가 → Finish Coach → 작은 위젯 추가 → 완료합니다.

최초 앱 실행 전에는 중립 초기 안내를 표시할 수 있습니다. 앱에서 완료/취소 후 홈 화면으로 돌아가 확인합니다. 위젯 탭은 앱이 종료되어 있거나 실행 중이어도 오늘 화면을 열어야 합니다.

## 검증 기록

- `expo-doctor`: 20/20 통과.
- lint / TypeScript / 번역 362키 검사 / 위젯 생성물 일치 검사 통과.
- 단위 테스트: 86개 통과. 25/50/75/100% 경계, 199/200 반올림, 빈 상태, 완료/취소, 시간대/자정 만료, 저장 실패 재시도, 최신 갱신 직렬화 포함.
- Web E2E: 15개 통과. 기존 루틴·프로젝트·기록·언어·테마 흐름 유지.
- Web 및 Android/iOS JS 번들 생성 통과.
- 최종 SDK 패치로 Android Release APK 빌드 성공. 에뮬레이터(API 36)에 업데이트 설치 성공, 기존 루틴과 위젯 유지 확인.
- Android 실제 홈 화면에서 빈 상태 → 루틴 등록 0% → 완료 100% → 완료 취소 0%, 영어/한국어·다크 테마, 실행 중/일반 프로세스 종료 후 위젯 탭으로 오늘 화면 열기를 확인했습니다. OS 설정의 ‘강제 중지’는 앱/위젯을 비활성화할 수 있으므로 일반 프로세스 종료와 구분합니다.
- iOS 앱+Extension Release 빌드 성공, 앱 시작/재실행 UI 테스트 1개 통과. 전용 시뮬레이터에서 App Group 캐릭터 파일 쓰기를 확인했습니다. 후속 수정 후 실제 iOS 홈 화면의 도베르만·진행률 표시를 확인했습니다(아래 이미지 제한 수정 절 참조). 실제 아이폰 설치와 위젯 탭의 콜드 스타트 검증은 별도입니다.

실제 Android 홈 화면 캡처:

- [빈 상태](widget-evidence/android-empty.png)
- [0% 감시](widget-evidence/android-zero.png)
- [100% 승인](widget-evidence/android-complete.png)
- [한국어·다크·100%](widget-evidence/android-complete-ko-dark.png)
- [최종 배포 APK의 100%](widget-evidence/android-final-complete.png)
- [완료 취소·0%](widget-evidence/android-undo-ko-dark.png)

[iOS 앱 실행 캡처](widget-evidence/ios-app-running.png)는 앱 화면이며 홈 화면 위젯 캡처가 아닙니다.

남은 수동 검증: 실제 아이폰에서 올바른 팀/App Group 서명으로 위젯을 추가한 뒤 자정 상태와 딥링크를 확인해야 합니다. 실제 아이폰 서명·설치, 실제 자정 도달/재부팅/Doze 갱신, iOS 모든 틴트 모드와 VoiceOver/TalkBack 실기기 낭독, Android 24~30 표현은 미검증입니다. Android 31 미만은 RemoteViews 색상 API를 구분해 사용하며 일부 모서리/게이지 표현이 다를 수 있습니다. OS 지연으로 정확한 시각의 갱신을 보장하지 않습니다.

로컬 APK: `artifacts/finish-coach-android-local.apk`. 커밋·푸시·스토어 제출은 수행하지 않았습니다.

## iOS 초기 눈 아이콘 표시 수정

초기 시뮬레이터에서는 SDK 타임라인이 호스트 앱 전용 Preferences에 저장되어 Extension이 읽지 못했고, 눈 아이콘과 초기 안내만 표시되었습니다. `plugins/with-finish-coach-widget.cjs`가 공식 위젯 타깃에 파일 기반 제공자를 연결합니다. 설정상 이 플러그인은 `expo-widgets`보다 앞에 두어야 합니다. 생성된 네이티브 파일을 직접 편집하지 않습니다.

`localization/widget-strings.json`은 CSV에서 생성하며, 중립 도베르만 PNG와 함께 Extension 자체의 Resources에 넣습니다. 따라서 앱 실행 전/공유 파일이 없는 상태에도 캐릭터와 중립 안내를 표시합니다. 정상 데이터가 있으면 공유 스냅샷의 선택 언어·진행률·얼굴을 사용합니다.

수정 검증: iOS 앱+Extension 빌드, PNG/번역 리소스의 Extension 패키징, 시뮬레이터의 공유 JSON 기록(현재 상태와 자정 상태 2개)을 확인했습니다. lint/타입 검사 및 단위 테스트 88개 통과. 기존 데이터는 유지하여 업데이트 설치했습니다. 실제 화면에 이전 캐시가 남으면 앱을 한 번 열고 홈 화면으로 돌아가며, 필요 시 기존 위젯을 제거하고 다시 추가합니다. 실제 아이폰 App Group 서명 검증은 별도입니다.

## iOS 이미지 아카이브 크기 제한 수정 및 실제 화면 확인

공유 파일 전달을 고친 후에도 WidgetKit이 1254×1254 원본 비트맵을 `WidgetArchiver.ArchivingError.imageTooLarge`로 거부해 이전 눈 아이콘 화면이 남는 문제가 있었습니다. SwiftUI의 작은 frame 지정은 원본 비트맵 크기를 줄이지 않습니다.

`plugins/widgets/widget-images.swift`가 ImageIO로 최대 512px 썸네일을 디코딩하고 투명 PNG를 캐시에 원자적으로 기록합니다. 현재 얼굴과 중립 이미지 모두 실제 축소 파일을 렌더러에 전달합니다. 원본 에셋은 보존합니다. Android도 아래와 같이 별도 축소 리소스를 사용합니다.

검증:

- `npm run test:widget-images`: 실제 Swift/ImageIO로 표정 5종 모두 512×512 이하, 투명도 유지, 캐시 재사용 확인.
- iOS Release 앱+Extension 빌드 성공.
- WidgetKit 로그에서 512×512 이미지 준비 및 타임라인 갱신 성공 확인. 이전 imageTooLarge 오류와 구분했습니다.
- 실제 홈 화면 UI 테스트에서 진행률 레이블 확인(67%, 3개 중 2개 완료).
- 사용자의 이후 완료 상태에서 도베르만 승인 얼굴, 한국어 문구와 100%를 실제 홈 화면 캡처로 확인했습니다: [수정된 iOS 위젯](widget-evidence/ios-doberman-fixed.png).

이 결과는 시뮬레이터의 실제 홈 화면 표시 검증입니다. 실제 아이폰의 서명/설치 검증을 대체하지 않습니다.

## Android 위젯 이미지 경량화

`widgets:generate`는 기존 Expo 이미지 도구에 포함된 Jimp를 사용해 원본 1254×1254 PNG 5종을 최대 512px 투명 PNG로 생성합니다. 고정된 리사이저를 사용해 macOS/Linux에서 동일한 `widgets:check` 검사가 가능합니다. 원본과 위젯의 표시 크기, 표정 선택 및 클릭 동작은 유지합니다. PNG 총량은 약 6.3MB에서 1.1MB로 줄고, 표정 하나의 RGBA 픽셀 메모리는 약 6.0MiB에서 1.0MiB로 감소합니다.

검증: lint·타입 검사·89개 테스트·리소스 최신 검사 통과. Android Release APK 재빌드 및 API 36 에뮬레이터 업데이트 설치 성공. 최종 APK 안의 표정 PNG 5종이 모두 512×512임을 확인했으며, 홈 화면에서 도베르만·한국어 문구·0% 표시를 확인했습니다. 캡처: [android-small-images.png](widget-evidence/android-small-images.png). 실제 Android 기기는 이번 수정에서 미검증입니다.
