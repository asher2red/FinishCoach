# 한국어·영어 번역 관리

Expo SDK 58 / React Native 0.88 / Expo Router 구조를 유지하고 `expo-localization`으로 기기 언어를 읽습니다. 앱용 번역은 CSV에서 생성한 TypeScript 리소스를 사용하며 런타임 CSV 파싱이나 번역 서버는 없습니다.

## 파일과 적용 범위

- 단일 번역 원본: [messages.csv](../localization/messages.csv)
- 시트 붙여넣기용 생성물: [messages.tsv](../localization/messages.tsv)
- 앱용 생성물: `src/i18n/generated.ts` (수동 수정 금지)
- 후보·미사용 키 보고서: `localization/extraction-report.json`
- 공통 번역/형식 API: `src/i18n/core.ts`, `context.tsx`, `labels.ts`
- 언어 선택 UI: `src/ui/LanguageSettings.tsx`

최초 조사에서 한국어 문자열 305종을 수집했습니다. 문장 보간, 복수형, 설정 옵션을 정리한 최종 원본은 350키이며 모두 한국어·영어 번역을 포함합니다. 현재 참조 318키, 보존된 미사용 후보 32키이며 내부 값 검토 후보는 93개입니다. 화면 6개, 공통 버튼/카드, 입력·날짜/시간 선택기, 검증/저장 오류, 접근성 레이블, 알림 권한/채널 안내, 인앱 결제 안내를 적용했습니다. 기존 저장 enum·라우트·식별자와 사용자 입력은 변경하지 않습니다.

추출은 TypeScript AST를 이용한 후보 조사입니다. 한국어 내부 enum/비교값/기본 활동 예시 등은 검토 후보로 남습니다. 후보 수는 미번역 UI 개수와 같지 않습니다. 미사용 키는 과거 조각 등이며 자동 삭제하지 않습니다. 새 영어 문구나 동적으로 만든 문자열까지 완전 자동 판정하지 않으므로 코드 리뷰도 필요합니다.

## CSV 작성 규칙

`key,ko,en,context,source` 열을 사용합니다. `key/context/source`는 메타데이터이고 나머지 `ko`, `en`, `ja`, `pt-BR` 같은 언어 태그 열은 번역입니다. 필수 열을 삭제하지 마세요. `source`는 대표 파일 추적용이며 코드 식별자가 아닙니다.

UTF-8, RFC 4180 형식입니다. 쉼표·따옴표·실제 줄바꿈은 CSV 인용 규칙으로 보존하고 BOM 입력도 허용합니다. 키는 화면/의미 기반으로 유지하며 행 정렬이나 파일 줄 번호와 무관합니다. 같은 의미의 공통 액션은 재사용하고 의미가 다른 문구는 별도 키를 사용합니다.

보간은 `{number}`, `{price}` 같은 이름을 사용합니다. 모든 언어에서 변수 집합이 같아야 하며 생성된 키/인수 타입으로 일반 `t()` 호출을 검사합니다. 복수형은 `units.activityCount.plural.one` / `.other` 쌍을 작성합니다. 한국어·영어는 Hermes 호환 명시적 cardinal 규칙으로 분기하고 다른 언어는 `Intl.PluralRules`를 사용합니다. 해당 언어의 추가 범주가 없으면 `.other`를 사용합니다. 미래 언어의 few/many 등은 별도 키를 추가할 수 있습니다. 네이티브 런타임에 PluralRules가 없으면 해당 언어 규칙 또는 호환 폴리필도 추가해야 합니다.

## Google Sheets 왕복

### CSV 가져오기 (권장)

1. Google Sheets → 파일 → 가져오기 → 업로드에서 `localization/messages.csv`를 선택합니다.
2. 구분 기호는 쉼표를 사용하고 자동 숫자·날짜·수식 변환을 끄거나 셀을 일반 텍스트로 관리합니다.
3. 키와 `{변수}`를 유지하면서 언어 열을 편집합니다.
4. 파일 → 다운로드 → 쉼표로 구분된 값(.csv)으로 내보냅니다.
5. 아래 명령으로 먼저 검사하고 원본에 반영합니다.

```sh
npm run i18n:import-sheet -- /path/to/export.csv
npm run i18n:import-sheet -- /path/to/export.csv --write
npm run i18n:generate
npm run i18n:check
```

첫 명령은 dry run입니다. `--write`일 때만 키별로 병합하며 시트에서 누락된 기존 키는 유지합니다. 완전한 CSV를 원본 경로에 직접 교체해도 generate/check로 검증할 수 있지만 누락 행 보존이 필요하면 가져오기 명령을 사용하세요.

### TSV 붙여넣기

`messages.tsv` 전체를 복사해 빈 시트 A1에 붙여넣습니다. 실제 탭은 열 구분, 실제 줄바꿈은 행 구분입니다. 셀 안의 역슬래시는 `\\`, 탭은 `\t`, CR은 `\r`, LF는 `\n`으로 가역적으로 이스케이프합니다. CSV 원본에는 실제 문자가 보존됩니다.

TSV에서 만든 시트를 CSV로 다운로드했다면 다음처럼 `--escaped`를 붙여 셀 안의 이스케이프를 한 번만 복원합니다. 직접 CSV로 가져온 시트에는 이 옵션을 붙이지 마세요.

```sh
npm run i18n:import-sheet -- /path/to/tsv-sheet-export.csv --escaped
npm run i18n:import-sheet -- /path/to/tsv-sheet-export.csv --escaped --write
npm run i18n:generate
```

실제 Google Sheets 업로드/편집은 수행하지 않았습니다. CSV→TSV 셀→시트 CSV 내보내기를 로컬에서 재현해 쉼표·따옴표·줄바꿈·탭·역슬래시 보존을 테스트했습니다.

## 개발 명령

```sh
npm run i18n:generate  # CSV → 정렬된 TS/TSV
npm run i18n:check     # 원본/참조/생성물 일치 검사
npm run i18n:extract   # 후보·미사용 보고서만 갱신; 번역 원본 불변
```

중복 키, 필수 열 누락, 빈 번역, 잘못된 CSV, 보간 불일치, 없는 키 참조, 오래된 생성물은 오류로 처리합니다. Web/네이티브 번들 및 로컬 플랫폼 빌드 앞에 check가 실행됩니다.

추가 언어는 CSV에 언어 열을 추가하고 모든 행을 번역한 뒤 generate/check를 실행합니다. 선택 옵션은 리소스에서 생성됩니다. 네이티브 OS 지원 언어 메타데이터도 필요하면 `app.json`의 expo-localization `supportedLocales`를 확장해 새 바이너리를 빌드합니다. RTL 레이아웃은 이번 검증 범위 밖입니다.

## 언어 선택·저장·형식

설정의 언어 항목에서 한국어/English를 즉시 선택합니다. 기존 설정에 `language`를 추가했으며 `null`은 기기/브라우저 자동 감지, 명시적 `ko/en`은 사용자 선택입니다. 예전 데이터의 필드 누락도 null로 보정합니다. 선호 언어 목록에서 지원 언어를 찾고 없으면 영어로 폴백합니다. 명시적 선택은 OS 변경보다 우선하며 기존 IndexedDB/SQLite 설정으로 복원됩니다. 테마·알림·콘텐츠 저장 구조는 유지합니다.

언어를 key로 지정해 화면을 재마운트하지 않습니다. 입력값·커서·화면 상태를 유지합니다. Web 정적 내보내기는 영어로 만들고 각 경로의 hydration 이후 감지 언어를 적용해 React hydration 불일치를 방지합니다. 오늘 날짜는 hydration 이후 표시해 빌드 시점 날짜와 실행 날짜 차이도 방지합니다.

날짜/요일/숫자는 Intl을 사용하며 한국어 시간 표시는 기존 오전/오후 구조를 유지합니다. DB 날짜, 시간대, 월요일 기준 통계, 정렬 계산은 바꾸지 않습니다. 결제 가격은 RevenueCat의 현지화 문자열을 그대로 보간하며 환산하지 않습니다.

도메인 오류는 키/인수 descriptor를 UI에서 현지화합니다. 알 수 없는 저장/SDK 오류는 현지화된 안전한 안내로 표시합니다. 비즈니스 로직은 번역 문자열을 비교하지 않습니다. Android 채널 이름과 권한 안내는 선택 언어를 사용합니다. 알림 본문의 루틴명은 사용자 데이터이므로 번역하지 않으며 Finish Coach 브랜드명도 유지합니다. 예약 ID·시각·소리·진동 의미는 유지합니다.

## 검증과 한계

- lint / TypeScript 검사 통과
- 단위 테스트 73개 통과: CSV/TSV/BOM, 보간/복수형, 생성물 검사 실패 경로, 추가 언어, 추출 보존, 설정 폴백과 기존 도메인/저장/결제/알림 검사 포함
- Web E2E 15개 통과: 기존 기능, 6개 영어 화면, 320/390/1280 너비, 언어/테마/데이터 복원, OS 변경과 사용자 선택 독립, 입력값·포커스·커서 유지
- Web 및 Android/iOS JS 번들 생성 확인
- iOS 시뮬레이터 Release 빌드·설치 및 UI 테스트 1개 통과: 영어 6개 메뉴 이동/터치 영역, 재실행 후 선택 유지, 영어 입력 폼, AM/PM 시간 선택기 확인
- Android 실제 기기 실행, 실제 네이티브 알림 수신, 스토어 결제창 언어, 실제 Sheets 왕복은 미검증

영문 실행 화면: [오늘](i18n-today-en.png), [설정/다크](i18n-settings-en-dark.png). 이미지 에셋은 수정하지 않았으며 추가 번역이 필요한 이미지 내 문구는 발견하지 못했습니다. 이 작업에서는 커밋·푸시·배포를 수행하지 않습니다.
