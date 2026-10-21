# Apple·Google 일회성 인앱 결제 테스트

## 구현 및 현재 상태

Expo 58.0.14 / React Native 0.88에서 `npx expo install react-native-purchases`로 SDK 10.15.0을 설치했다. 자체 서버·로그인·DB 변경은 없다. 기존 기능을 유료화하지 않으며 결제 상태를 루틴 저장소에 기록하지 않는다. 구매·복원은 실제 SDK 메서드만 호출한다. 모의 성공 코드나 RevenueCat Test Store 연동은 앱에 없다.

현재 RevenueCat·App Store Connect·Play Console을 조작할 연결 도구와 자격 증명이 없고 공개 SDK 키도 미설정이다. **콘솔 상품·가격·entitlement는 아직 생성하지 않았다.** 아래 값은 코드와 일치하도록 콘솔에서 구성할 값이다. 실제 판매 활성화와 스토어 제출은 하지 않았다. 앱은 기본적으로 ‘설정 필요’ 상태이며 실제 결제창·Sandbox 결제 성공을 검증하지 않았다.

## 상품 구성

| 항목 | 값 |
| --- | --- |
| 앱 Bundle ID / Android package | `com.finishcoach.app` |
| 표시 이름 | Finish Coach 테스트 구매 |
| 유형 | 비소모성 일회성 구매 |
| iOS 상품 ID | `com.finishcoach.app.testpurchase` |
| Android 상품 ID | `finish_coach_test_purchase` |
| RevenueCat offering | `test` |
| offering 안 custom package ID | `test_purchase` |
| entitlement | `test_purchase` |
| 목표 미국 기준 가격 | USD 0.99 |

Apple ID는 영문·숫자·마침표를 사용하고 100자 이내이다. Android ID는 소문자로 시작하고 소문자·밑줄만 사용한다. 두 플랫폼 앱은 같은 RevenueCat 프로젝트에 연결하되 각 플랫폼 상품을 동일 entitlement와 package의 해당 플랫폼 슬롯에 연결한다. `current` offering이나 첫 번째 상품으로 대체하지 않는다.

USD 0.99를 콘솔에서 선택·확인해야 한다. 현재 계정의 실제 가격 옵션은 접근하지 못해 미확인이다. 해당 옵션을 선택할 수 없으면 다른 가격으로 자동 대체하지 말고 사용자에게 보고한다. 앱은 USD 상품 가격이 0.99가 아니면 구매를 차단한다. KRW 등 다른 통화는 스토어의 현지화 가격을 그대로 표시하며 임의 환산하지 않는다. 가격 조회 전에는 `$0.99` 버튼을 만들지 않는다.

## 환경 설정

`.env.example`을 `.env.local`로 복사하고 각 플랫폼의 RevenueCat 공개 SDK 키를 입력한다. 테스트 계정 준비를 완료한 후에만 테스트 스위치를 켜서 새 네이티브 바이너리를 빌드한다.

```dotenv
EXPO_PUBLIC_IAP_TEST_ENABLED=true
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=appl_해당앱의공개SDK키
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=goog_해당앱의공개SDK키
```

공개 변수는 앱 바이너리에 포함된다. 서버용 `sk_` 키, Apple `.p8`, Google 서비스 계정 JSON은 여기에 넣지 않는다. 키는 RevenueCat 콘솔의 각 플랫폼 앱 설정에서 확인한다. 콘솔용 비밀 자격 증명은 해당 콘솔에 직접 등록한다. 기본 `.env.example`은 구매 비활성화·빈 키이며 `.env.local`은 gitignore 대상이다. EAS로 빌드할 때도 해당 빌드 환경에 같은 공개 변수를 지정해야 한다. 기존 APK에 키를 입력하는 설정 화면은 없다.

이 스위치는 테스트 기능 활성화일 뿐 Sandbox를 강제하는 API가 아니다. 실제 과금 여부는 **스토어 테스트 계정·결제 수단**이 결정한다. 일반 계정으로 결제를 진행하면 실제 청구될 수 있다. 결제창에 테스트 표시가 없으면 결제를 취소하고 계정 설정을 확인한다.

## 외부 콘솔 준비

### Apple

1. Apple Developer Program과 App Store Connect 접근 권한, `com.finishcoach.app` 앱 레코드 및 필요한 계약·판매자 설정을 준비한다. Personal Team 기기 설치만으로 App Store Sandbox 상품 테스트 준비가 끝난 것은 아니다.
2. In-App Purchases에서 **Non-Consumable** 상품을 위 ID·이름으로 만들고 미국 기준 USD 0.99를 선택한다. 필요한 현지화·메타데이터를 작성하되 실제 판매 제출은 하지 않는다.
3. RevenueCat Apple 앱에 App Store 연결 자격 증명을 콘솔에서 등록하고 상품을 가져와 offering·package·entitlement를 연결한다.
4. Sandbox 테스터를 만들고 개발 서명 앱/지원되는 Sandbox 환경을 준비한다. 테스트 기기 설정에서 Sandbox 계정을 사용하고 실제 스토어 상품이 조회되는지 확인한다. Expo Go는 차단된다.
5. Xcode StoreKit 로컬 파일 테스트와 App Store Connect 상품을 사용하는 Sandbox 테스트를 혼동하지 않는다. 이번 구현에서는 로컬 StoreKit 성공을 실제 Apple 결제 검증으로 대체하지 않았다.

### Google

1. Play Console에 동일 package의 앱을 준비하고 판매자·결제 설정을 확인한다.
2. 위 상품 ID로 one-time product를 만들고 USD 0.99 및 필요한 구매 옵션을 설정한다. RevenueCat에서 **non-consumable** 상품으로 구성한다. 구독이나 consumable로 지정하지 않는다. Android SDK의 category 검사만으로 콘솔의 비소모성 설정까지 증명할 수는 없다.
3. RevenueCat Google 앱에 필요한 Google Play API·서비스 계정 접근을 콘솔에서 연결하고 offering·package·entitlement를 연결한다. SDK의 자동 거래 처리를 사용하며 직접 consume하는 코드는 없다.
4. 내부 테스트 트랙·테스터 초대·설치 계정을 준비하고 해당 계정을 **라이선스 테스트** 목록에도 등록한다. 테스트 트랙 설치만으로 무료 테스트가 되는 것은 아니다.
5. Google Play가 설치된 기기에서 테스트 결제 표시와 테스트 결제 수단을 확인한다. 라이선스 테스터는 package가 맞는 sideload/debug 빌드도 테스트할 수 있지만, 단순 로컬 APK 설치만으로 조건을 충족한 것으로 판단하지 않는다.

외부 콘솔에서 필요한 테스트용 상품 활성화·트랙 업로드 단계는 사용자가 해당 대상과 범위를 확인한 후 수행해야 한다. 현재 어떤 상품 활성화나 배포도 실행하지 않았다.

## 익명 사용자·환불

SDK configure에 appUserID를 넘기지 않아 RevenueCat 익명 ID를 사용한다. SDK를 한 번만 초기화하고 SDK가 식별자를 관리한다. 재설치 시 익명 ID가 달라질 수 있으며 같은 스토어 계정에서 명시적으로 구매 복원을 사용해야 한다. RevenueCat 프로젝트의 restore/transfer 정책에 따라 복원 대상 연결이 달라질 수 있으므로 테스트 시 확인한다.

Apple와 Google의 익명 ID를 연결할 앱 로그인이 없으므로 플랫폼 간 구매 자동 공유는 지원하지 않는다. 구매 복원을 누르면 SDK `restorePurchases`를 호출하며 자동 복원 호출로 로그인 창을 띄우지 않는다.

일회성 상품 환불의 신뢰할 수 있는 반영을 위해 각 스토어의 플랫폼 서버 알림을 RevenueCat 수신 대상으로 설정해야 한다. 자체 서버는 필요하지 않다. 리스너는 백엔드 push 자체가 아니며 앱이 받은 CustomerInfo가 갱신될 때 통지된다. 앱 재진입·수동 갱신 때 캐시를 무효화하고 CustomerInfo를 다시 조회한다. 실제 환불 반영 시점은 스토어·RevenueCat 전파에 의존한다.

## 상태·오류 처리

- 별도 컨트롤러가 구매 상태를 메모리에 보관하고 CustomerInfo의 활성 `test_purchase` entitlement와 정확한 플랫폼 상품 ID로 판정한다. 로컬 boolean은 사용하지 않는다.
- 초기화·상품 조회·구매·복원·대기·취소·오류·완료를 구분한다. unknown을 미구매로 처리하지 않는다. 네트워크 오류 때 기존 확인 결과는 유지하며 새 구매를 차단한다.
- 저장된 상품 객체를 무조건 구매하지 않고 결제 직전에 정확한 상품과 가격을 다시 확인한다. 직전 CustomerInfo에서 이미 구매가 확인되면 결제창을 열지 않는다.
- 동기 잠금으로 구매·복원·갱신 중복 실행을 막는다. 사용자 취소는 재시도 가능한 정상 상태이다.
- pending 오류 또는 entitlement 없는 성공은 대기로 표시한다. 같은 앱 실행 중 중복 구매를 막으며 승인 후 리스너·상태 재조회에서 권한을 확인하면 완료로 전환한다. 대기 거래의 취소·거절로 권한이 생기지 않는 경우 스토어 상태 확인 후 앱을 재실행하고 다시 조회할 수 있다.
- 상품 조회가 실패해도 SDK가 초기화되었다면 구매 복원을 사용할 수 있다. 복원된 권한이 없는 경우와 연결 실패를 구분한다.
- 구매 리스너와 AppState 리스너는 루트 Provider에서 관리하고 해제한다. 화면 이동으로 구매 상태를 재초기화하지 않는다.

## 파일

- `src/purchases/config.ts`: 상품·offering·entitlement 식별자와 구성 검증.
- `src/purchases/client.ts`: 지연 SDK import, 단일 초기화, 상품 검증·실제 SDK 호출·CustomerInfo 변환.
- `src/purchases/controller.ts`: 상태·잠금·오류·복원 및 최신 결과 처리.
- `src/purchases/context.tsx`, `.web.tsx`: 루트 수명 주기와 웹 SDK 제외.
- `src/ui/PurchaseSettings.tsx`, `.web.tsx`: 기존 테마의 설정 카드와 웹 전용 안내.
- `src/app/_layout.tsx`, `src/screens/Coach.tsx`: Provider와 설정 카드 연결만 변경.
- `.env.example`, `package.json`, `package-lock.json`: 공개 변수 예시 및 결제 SDK.
- `tests/purchases.test.ts`, `tests/purchase-client.test.ts`, `e2e/purchases.spec.ts`: 모의 SDK·브라우저 테스트.

## 검증 구분

단위 테스트는 SDK를 모킹하며 실제 결제 증명이 아니다. 웹 안내·테마·기존 기능은 실제 브라우저에서 확인한다. 키가 없는 네이티브 빌드는 초기화/상품/결제 성공을 증명하지 않는다.

아직 실행하지 못한 실제 시나리오: Apple Sandbox와 Google 라이선스 테스트 계정의 상품 조회·현지화 가격, 결제창·성공·취소·승인 대기, 재실행·재설치 복원, 환불 알림 전파. 외부 설정 완료 후 두 플랫폼의 기기에서 각각 실행해야 한다.

## 공식 근거

- [Expo 인앱 결제와 네이티브 빌드](https://docs.expo.dev/guides/in-app-purchases/)
- [RevenueCat Expo 설치](https://www.revenuecat.com/docs/getting-started/installation/expo)
- [SDK 초기화·플랫폼 공개 키](https://www.revenuecat.com/docs/getting-started/configuring-sdk)
- [익명 사용자](https://www.revenuecat.com/docs/customers/identifying-customers), [구매 복원](https://www.revenuecat.com/docs/getting-started/restoring-purchases)
- [비구독 상품·Android 비소모성·환불 알림](https://www.revenuecat.com/docs/platform-resources/non-subscriptions)
- [Test Store와 플랫폼 Sandbox 차이](https://www.revenuecat.com/docs/test-and-launch/sandbox)
- [Google 라이선스 테스트와 실제 과금 주의](https://developer.android.com/google/play/billing/test)
- [Apple 상품 ID 규칙](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information)
- [Google 상품 등록·ID 규칙](https://support.google.com/googleplay/android-developer/answer/1153481?hl=en)

### 이번에 실행한 검사

- TypeScript와 lint 통과.
- Vitest 60개 통과. 이 중 새 결제 테스트 24개는 모의 SDK/어댑터 검증이다. 단일 초기화·플랫폼 키·정확한 상품·현지화 가격·USD 기준 가격 차단·구독/소모성 오설정·동시 실행·대기·취소·복원·오류·권한 철회·리스너 정리 등을 확인한다.
- Playwright 11개 통과. 웹 결제 안내, Light/Dark 및 기존 앱 기능을 실제 Chrome에서 검증했다.
- Web export와 Android/iOS JS export 성공. 웹 출력에서 RNPurchases 모듈 참조가 없음을 확인했다.
- Expo Doctor는 **19/20 통과**. 기존 Expo 계열 5개 패키지에 패치 업데이트 권고가 있다(`@expo/ui` 58.0.20→58.0.21, Expo 58.0.14→58.0.16, expo-font 58.0.8→58.0.9, expo-image 58.0.15→58.0.16, expo-router 58.0.23→58.0.24). 이번 결제 SDK 추가로 생긴 버전 불일치는 아니며 범위 밖 패키지를 일괄 업그레이드하지 않았다.
- iOS Release 네이티브 빌드·설치·실행 성공. CocoaPods에 RNPurchases 10.15.0 / PurchasesHybridCommon 19.12.0 / RevenueCat 5.95.0 연결을 확인했다. XCTest로 설정 카드의 화면 내 위치, 미확인 구매 상태, 가격 없는 구매 버튼·복원 버튼 비활성화 및 오늘 화면 복귀를 검증했다. 이는 공개 키 없는 구성 안내 검증이며 Apple 결제 테스트가 아니다.
- Android Release APK 빌드 성공(105MB), apksigner 검증 통과. 통합 Manifest에 `com.android.vending.BILLING`이 포함됨을 확인했다. Android 실기기 결제창이나 라이선스 테스트는 미실행이다.
