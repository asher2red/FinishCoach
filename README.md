# Finish Coach

Android · iOS · Web에서 사용하는 로컬 우선 루틴·프로젝트 관리 앱입니다. Expo SDK 58, React Native, Expo Router, TypeScript strict를 사용하며 서버·로그인·AI API 없이 동작합니다.

## 실행

Node.js 22.13 이상과 npm을 준비합니다. 이 작업 환경에서는 Node 26.0.0 / npm 11.12.1로 검증했습니다.

```bash
npm ci
npm run web       # 브라우저
npm run android   # Android 에뮬레이터 또는 연결된 기기
npm run ios       # macOS + Xcode + iOS Simulator 필요
```

실기기는 `npm start` 후 SDK 58을 지원하는 Expo Go로 QR 코드를 읽습니다. 해당 Expo Go 버전이 없는 경우 development build를 사용합니다. 네이티브 플러그인과 알림의 최종 검증은 자체 빌드에서 진행해야 합니다.

```bash
npx expo run:android
npx expo run:ios
```

Android는 SDK/JDK, iOS는 macOS/Xcode/CocoaPods 및 필요한 서명 설정이 별도로 필요합니다. 위 명령은 네이티브 프로젝트 생성과 빌드를 수행합니다. 최신 Android APK와 iOS 시뮬레이터 앱은 이 맥북에서 로컬 빌드를 완료했습니다. Play Store용 AAB와 iOS 실기기 IPA는 생성하지 않았습니다.

웹 정적 배포 산출물과 로컬 미리보기:

```bash
npm run build:web
npm run preview:web
# http://127.0.0.1:8081
```

## Android·iOS 로컬 빌드

```bash
npm run doctor:local -- android
npm run build:android:local
npm run doctor:local -- ios
npm run build:ios:local
```

컴파일은 맥북에서 수행하며, Android는 설치용 APK, iOS는 시뮬레이터용 앱을 생성합니다. 실기기 IPA는 `npm run build:ios:device:local`을 사용하며 Apple 서명이 별도로 필요합니다. [환경 설치·산출물·네트워크 사용 범위](docs/LOCAL-BUILD.md)를 확인하세요.

## Android 설치용 APK 빌드

`eas.json`의 `preview` 프로필은 개발 서버 없이 실행되는 내부 배포 APK를 생성합니다. Expo 계정 로그인이 필요합니다.

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile preview
```

첫 빌드에서는 Expo 프로젝트 연결 및 Android 서명 키 생성 안내를 따라 진행합니다. 빌드가 성공하면 EAS가 제공하는 APK 다운로드 링크를 안드로이드 폰에서 열어 설치합니다. 이 설정은 Play Store 게시를 수행하지 않습니다. 2026-10-17 EAS 빌드가 성공했습니다. [APK 다운로드](https://expo.dev/artifacts/eas/bIW4XdjvWRE9c5lBIucebzqDR5TCDftNF68gxfuxWBY.apk) · [빌드 결과](https://expo.dev/accounts/asher2red/projects/finishCoach/builds/04171dbc-591a-4901-9c6a-0a1c3bbe7288). 로컬 사본은 `artifacts/finish-coach-1.0.0.apk`에 보관합니다. 폰에서 APK를 열고 해당 브라우저/파일 앱의 설치 허용 안내를 따르면 설치할 수 있습니다. 실기기 실행·알림 전달 검증은 별도로 필요합니다.

## 2026-10-18 UI/UX 개선

날짜는 달력, 시간은 오전/오후·시·분 휠로 선택합니다. 설정 탭에서 앱 전체 알림음·진동을 관리하며 Android는 네 조합을 지원합니다. iOS 진동 및 웹 소리·진동 제어는 지원 제한을 표시합니다. 기록/통계에 실제 데이터 기반 주간 실행·활동별 횟수·시간·주간 목표 그래프와 연간 조회를 추가했습니다.

[변경 파일·설계·테스트·실기기 체크리스트](docs/UX-UPGRADE.md) · [달력](docs/calendar-picker.png) · [시간 휠](docs/time-wheel.png)

이 개선은 현재 소스와 웹 빌드에 반영되어 있습니다. 기존 APK는 이전 버전이며 폰에서 사용하려면 새 빌드가 필요합니다.

## 구현한 기능

- 오늘: 예정 시각, 완료/남음/건너뜀, 실행률, 상세 조회, 완료 취소, 빠른 등록, 프로젝트 요약.
- 루틴: 생성·수정·일시 중지·재개·보관·복원. 기본 활동과 직접 입력한 활동 선택지. 기간, 소요 시간, 알림 시각 검증.
- 반복: 매일, 특정 요일, 한 번, 시작/종료일. 날짜별 일정과 별도로 주 N회 목표 및 자유 실행 기록 지원.
- 기록: 일/주/월, 활동 필터, 현지 완료 시각·실제 소요 시간·메모 수정, 완료 취소.
- 통계: 주간 목표/완료, 월간·연간 횟수, 누적 시간, 활동별 완료율, 최근 6주 추이, 프로젝트 완료 기간. 저장된 데이터만 사용.
- 프로젝트: 제목·설명·기간·완료 기준, 진행/보류/완료/취소, 마일스톤 추가·이름 수정·순서 변경·완료·삭제.
- 모바일 SQLite, 웹 IndexedDB. 완료 로그와 예정 상태는 하나의 트랜잭션으로 저장. 보관·취소 기록 보존.
- 모바일 로컬 알림 권한·예약·취소·복구. 웹은 열린 페이지에서만 Notification API 사용.
- 시스템 라이트/다크 테마, 반응형 너비, 접근성 버튼/입력 라벨, 빈 상태, 오류 및 저장 중 표시.

## 구조와 설계

```text
src/app/                  Expo Router의 오늘·루틴·기록·통계·프로젝트 경로
src/screens/Coach.tsx     공통 화면 및 소형 디자인 시스템
src/domain/model.ts       엔티티·입력 검증·현지 날짜/시각 변환
src/domain/engine.ts      반복 생성·완료·취소·통계
src/domain/projects.ts    프로젝트 검증·상태 전환·기간 계산
src/data/repository.ts    플랫폼 중립 load/commit Unit of Work 계약
src/data/storage.ts       SQLite 테이블·관계·인덱스·트랜잭션
src/data/storage.web.ts   IndexedDB 스토어·인덱스·트랜잭션
src/data/context.tsx      초기화·직렬 저장·실패 복구·알림 동기화
src/services/notifications[.web].ts  플랫폼별 알림 서비스
tests/                    도메인·SQLite·IndexedDB·알림 테스트
e2e/                      실제 Chrome 사용자 흐름 검증
```

개별 엔티티 Repository 다섯 개 대신 모든 관련 변경을 원자적으로 저장하는 `Repository`를 사용합니다. UI는 DB를 호출하지 않습니다. SQLite에는 엔티티별 테이블, 외래 키, 일정 중복 및 활성 완료 기록 중복 방지 인덱스가 있습니다. IndexedDB도 엔티티별 스토어와 조회 인덱스를 사용합니다. MVP는 전체 상태를 읽고 트랜잭션으로 교체하므로 소규모 개인 데이터에 적합합니다. 상세한 시간대·통계·동기화 설계는 [설계 문서](docs/ARCHITECTURE.md)를 확인하세요.

## 검증 명령

```bash
npm run typecheck
npm run lint
npm test
TZ=America/New_York npm test
npm run build:web
npx expo export --platform android --platform ios --output-dir dist-native
npx expo install --check
npx expo-doctor
npm run test:e2e  # 먼저 npm run build:web 실행, Google Chrome 설치 필요
```

Playwright는 설치된 Chrome을 사용합니다. 포트 8081에서 검증 서버를 자동 실행합니다. 사용자 데이터는 테스트별 임시 브라우저 컨텍스트에만 저장됩니다. SQLite 테스트는 Node 내장 SQLite에 Expo 어댑터를 연결해 SQL 및 실제 파일 영속성을 검증합니다. Expo SQLite 네이티브 브리지를 실행하는 테스트는 아닙니다. IndexedDB 단위 테스트는 fake-indexeddb, E2E는 실제 Chrome IndexedDB를 사용합니다.

검증 결과 및 실기기 체크리스트: [TESTING.md](docs/TESTING.md).

## 알려진 제한과 미구현

- Android/iOS는 JS/Hermes 번들 생성까지 확인했습니다. 이 환경에 `simctl`/`adb`가 없어 시뮬레이터·실기기 구동, 네이티브 SQLite 브리지, 실제 알림 전달은 검증하지 못했습니다.
- 알림은 가까운 순서 최대 60개를 예약하고 앱 실행·복귀·변경·활성 중 매분에 보충합니다. 오래 앱을 열지 않으면 예약 범위를 넘어선 알림은 전달되지 않습니다. Android는 정확한 알람 권한 없이 best-effort 전달하며 절전·집중 모드에 따라 지연될 수 있습니다.
- 웹 알림은 페이지가 열려 있고 브라우저가 타이머를 실행할 때만 가능합니다. 종료 상태 푸시, 서비스 워커 기반 푸시는 미구현입니다. HTTPS 또는 localhost 환경에서 사용하세요.
- 웹의 브라우저 데이터 삭제·앱 제거 시 데이터도 삭제됩니다. 클라우드 동기화·백업/내보내기·다중 탭 동시 편집 충돌 처리는 미구현입니다. 웹은 한 탭에서 사용하세요.
- 주 시작은 월요일입니다. 변경 가능한 도메인 함수 경계는 있으나 설정 화면은 아직 없습니다. 종료일이 있는 주간 목표는 해당 주에 기간이 겹치면 전체 목표 횟수로 계산합니다.
- 날짜·시간은 공통 달력/휠 선택기를 사용합니다. 마일스톤별 마감일, 활동 선택지 독립 삭제/이름 변경 화면은 없습니다. 직접 만든 활동은 저장된 루틴의 활동 목록에 유지됩니다.
- 전체 데이터 교체 저장 방식으로 데이터가 아주 많아지면 저장이 느려질 수 있습니다. 보관은 논리 삭제이며 영구 삭제 UI는 제공하지 않습니다.
- `expo-doctor`는 20개 중 19개 검사를 완료했습니다. 설정 스키마 검사는 `exp.host` 연결 시간초과로 확인하지 못했습니다.
- `npm audit fix`로 호환 범위 내 업데이트를 적용했으나 Expo/Metro 하위 의존성 경로의 취약점 27건(높음 19, 보통 8)이 남았습니다. 제안된 `--force` 수정은 Expo 44로 내리므로 적용하지 않았습니다. 배포 전 SDK 공급자 패치 여부를 재검토해야 합니다.
- 계정·서버·AI 코칭·결제·소셜·관리자 기능은 요청 범위에 따라 구현하지 않았습니다.

## 다음 단계

1. Android/iOS 자체 빌드에서 [수동 검증](docs/TESTING.md) 수행, 알림·재부팅·업데이트·저장 실패 확인.
2. doctor의 원격 스키마 검증 재시도 및 Expo 상위 패치/취약점 업데이트 확인.
3. 내보내기/가져오기, DB 마이그레이션 복구 테스트, 증분 저장 및 대량 데이터 성능 개선.
4. 요구 시 클라우드 동기화·계정 기능을 Repository 뒤에 추가.

[모바일 웹 화면](docs/mobile-web.png) · [데스크톱 다크 모드](docs/desktop-dark.png)

공식 참고: [Expo 프로젝트 생성](https://docs.expo.dev/get-started/create-a-project/), [Expo Notifications 및 권한](https://docs.expo.dev/versions/latest/sdk/notifications/).
