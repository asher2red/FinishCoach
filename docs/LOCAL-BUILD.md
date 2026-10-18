# 맥북 로컬 빌드

## 확인한 결과

- Android: 이 맥북에서 EAS `--local` 릴리스 빌드 성공. Gradle 566개 작업 완료.
- 산출물: `artifacts/finish-coach-android-local.apk` (107,782,171바이트).
- APK ZIP 무결성, Manifest·DEX·JavaScript 번들 포함, 서명 유효성 확인. 기존 APK와 서명 인증서 SHA-256이 일치한다.
- APK SHA-256: `cf1a91d81e3eec0e3d0991ac6a71af0009ebc3512c66d2bd3d41e36fc0e7152d`.
- 실제 로컬 빌드 과정의 Expo Doctor 20/20 통과. 프로젝트 lint·TypeScript 검사와 단위 테스트 31개 통과.
- iOS: Xcode 27.1에서 EAS `--local` Release 시뮬레이터 빌드 성공. 산출물은 `artifacts/finish-coach-ios-simulator.tar.gz`이며 압축 해제한 앱은 `artifacts/ios-simulator/FinishCoach.app`이다.
- iOS 앱 식별자 `com.finishcoach.app`, arm64/x86_64 실행 파일 포함을 확인했다. 아카이브 SHA-256: `4f639259000623fba88c3b81aca51796fd39760a70a0e5e23632d1659e5a7163`.
- iOS 27.1 런타임에서 지원하는 iPhone Duo 시뮬레이터를 생성하고 앱 설치·실행 및 오늘 화면 표시를 확인했다. 캡처: [iOS 실행 화면](ios-simulator.png). 설정 딥링크는 OS의 앱 열기 확인 창까지 확인했으며 설정 화면 자체는 아직 확인하지 않았다.
- 첫 시뮬레이터 부팅에서 데이터 마이그레이션 실패 상태가 보고됐지만 앱 설치·실행·화면 캡처는 성공했다. 현재 Xcode 설치에는 Simulator GUI 앱이 없으므로 직접 클릭하는 기능 검증은 추가 설치 후 필요하다. Android/iOS 실기기 알림 전달은 아직 검증하지 않았다.

## 최신 웹 확인

현재 맥북에서 `npm run preview:web` 서버를 실행하면 [http://127.0.0.1:8081](http://127.0.0.1:8081)에서 확인할 수 있다. `dist`에는 달력·시간 휠·알림 설정·기록 그래프 개선이 포함되어 있다. 로컬 주소이므로 다른 기기의 localhost나 인터넷에서는 열리지 않는다.

```bash
npm run build:web
npm run preview:web
```

## 빌드 명령

```bash
npm run doctor:local -- android
npm run build:android:local
# artifacts/finish-coach-android-local.apk

npm run doctor:local -- ios
npm run build:ios:local
# artifacts/finish-coach-ios-simulator.tar.gz

npm run build:ios:device:local
# artifacts/finish-coach-ios-device.ipa
```

`build:*:local`은 EAS CLI에 `--local`을 명시한다. 컴파일은 이 맥북에서 수행하고 소스를 EAS 클라우드 빌드 서버에 업로드해 컴파일하지 않는다. Expo 로그인·프로젝트 확인·기존 원격 서명 키 다운로드, npm/Gradle/CocoaPods 의존성 다운로드에는 인터넷을 사용한다. Android는 이전 APK와 동일한 EAS 서명 키를 사용하므로 기존 앱의 업데이트 설치가 가능하다. 키가 바뀌면 업데이트할 수 없으므로 새 키를 임의로 생성하지 않는다.

Android APK와 iOS 시뮬레이터 앱에는 JavaScript가 포함되어 실행 시 Metro 서버가 필요하지 않다. iOS 시뮬레이터 산출물은 실기기에 설치할 수 없다. iOS 실기기용 EAS 내부 배포 IPA에는 Apple Developer 멤버십, 등록 기기 및 서명 자격 증명이 별도로 필요하다.

개발 중 빠른 설치·실행은 다음 명령을 사용한다. 이 경우 개발 서버를 사용한다.

```bash
npm run run:android:local
npm run run:ios:local
```

생성된 `android/`, `ios/`는 Expo CNG 산출물이다. 수동으로 생성하거나 수정하지 않고 앱 설정과 플러그인을 유지한다. EAS 로컬 빌드는 임시 작업 디렉터리에서 네이티브 프로젝트를 생성하므로 저장소에 네이티브 파일을 추가하지 않는다.

## Android 환경

현재 프로젝트는 Expo SDK 58 / React Native 0.88이다. 설치된 React Native의 버전 카탈로그를 읽어 다음 버전을 검사한다.

- Node.js 22.13 이상
- JDK 17 이상. 이 맥북은 기존 OpenJDK 21 사용
- Android SDK Platform 37.0 (`platforms;android-37.0`)
- Android Build Tools 37.0.0
- platform-tools (`adb`)
- NDK 27.1.12297006
- CMake 3.30.5

공식 SDK 목록에서 API 37의 패키지 이름은 `android-37.0`이다. 이전 이름인 `android-37`은 조회되지 않는다. SDK 패키지 이름과 compileSdk 숫자 37을 구분한다. 빌드 검사기는 두 설치 경로를 인식한다. targetSdk는 기존 36을 유지한다.

```bash
brew install --cask android-commandlinetools
sdkmanager --sdk_root="$HOME/Library/Android/sdk" \
  'platform-tools' 'platforms;android-37.0' 'build-tools;37.0.0' \
  'ndk;27.1.12297006' 'cmake;3.30.5'
```

SDK 라이선스 동의가 필요하다. `sdkmanager`는 지원이 남아 있으나 새 Android CLI 사용이 권장된다는 경고를 표시할 수 있다.

첫 빌드에서 라이브러리 요구에 따라 Build Tools 36.0.0과 CMake 3.22.1도 Gradle이 추가 설치했다. 이 항목은 현재 맥북에 설치되어 있다.

빌드 스크립트는 명시적인 `ANDROID_HOME`/`ANDROID_SDK_ROOT`를 우선하고, 없으면 `~/Library/Android/sdk`를 사용한다. Homebrew Java 21과 platform-tools 경로를 해당 빌드 프로세스에만 추가한다. 셸 설정 파일을 덮어쓰지 않는다.

추가한 `run:*:local` 명령도 스크립트의 환경 자동 감지를 사용한다. 별도로 `npx expo run:android`처럼 Expo CLI를 직접 실행하려면 셸에도 경로를 지정한다.

```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
```

실기기를 USB로 연결하고 개발자 옵션·USB 디버깅을 활성화한 뒤 `adb devices`에서 기기를 확인한다. 에뮬레이터는 별도 설치 항목이며 APK 빌드 자체에는 필요하지 않다.

## iOS 환경

### 무료 계정으로 USB 연결한 아이폰 테스트

2026-10-18 연결된 iPhone 15 Pro용 Release 빌드와 직접 설치에 성공했다. 사용자가 개발자 앱을 신뢰한 뒤 `devicectl`로 앱 실행 성공도 확인했다. 전체 기능 및 실제 알림 전달 검증은 별도로 필요하다. 현재 프로파일 만료일은 2026-10-25 03:46:17 (한국 시간)이다. 설치한 서명 앱을 `artifacts/finish-coach-iphone-personal.ipa`에도 보관했다. 이 파일의 프로파일에는 이번 아이폰 1대만 등록되어 있으며 다른 기기에 배포할 수 있는 IPA가 아니다.

EAS 내부 배포 IPA와 별도로, Xcode의 무료 Personal Team으로 연결한 아이폰에 직접 설치할 수 있다. 아이폰의 개발자 모드를 켜고 맥을 신뢰한 뒤, Xcode 계정 설정에서 Apple Development 인증서를 생성한다. 프로젝트의 자동 서명에서 Personal Team을 선택해 개발용 프로파일을 생성한다.

```bash
npm run run:ios:local -- --device <아이폰-UDID> --configuration Release
```

프로파일이 없다면 Xcode의 Signing & Capabilities에서 자동 서명을 활성화하거나 `xcodebuild`에 `-allowProvisioningUpdates -allowProvisioningDeviceRegistration CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=<개발팀-ID>`를 지정해 생성한다. Personal Team 서명에는 만료와 기능 제한이 있어 기간 만료 후 다시 빌드·설치해야 한다.

앱은 로컬 예약 알림만 사용하므로 `expo-notifications`의 `enableRemoteNotifications`를 `false`로 설정했다. 무료 팀에서 지원하지 않는 APNs entitlement를 생성하지 않으며 로컬 알림은 유지한다. 이미 생성한 네이티브 프로젝트에 원격 푸시 권한이 남아 있으면 Expo prebuild로 재생성한다. 생성 파일을 수동 편집하지 않는다.

이 맥북에는 CocoaPods와 fastlane을 설치했고 Xcode 27.1의 최초 실행과 라이선스 동의도 완료했다. 로컬 환경 검사와 실제 시뮬레이터 빌드가 통과했다. 전체 Xcode 26.4 이상 및 iOS SDK가 필요하다. 기존 `/Library/Developer/CommandLineTools`만으로는 iOS 앱을 빌드할 수 없다.

iOS 27.1 런타임도 설치했다. 현재 런타임이 지원하는 기기는 `simctl list runtimes -j`의 `supportedDeviceTypes`로 확인한다. 이 설치본은 iPhone Duo만 지원한다. `xcodebuild -downloadPlatform iOS`는 추가 버전까지 내려받으려 할 수 있으므로 이미 사용 가능한 런타임이 있으면 중복 실행하지 않는다.

1. App Store에서 Xcode 26.4 이상을 설치한다.
2. Xcode를 처음 실행해 라이선스·추가 구성요소 설치를 완료한다.
3. Xcode Settings의 Platforms/Components에서 필요한 iOS 지원과 시뮬레이터 런타임을 설치한다.
4. `npm run doctor:local -- ios`로 확인한다.
5. `npm run build:ios:local`로 시뮬레이터용 앱을 빌드한다.

Xcode가 `/Applications/Xcode.app`에 있으면 빌드 스크립트가 해당 빌드의 DEVELOPER_DIR를 지정한다. 다른 경로인 경우 사용자가 DEVELOPER_DIR를 지정할 수 있다. 시스템의 xcode-select 설정을 자동으로 변경하거나 Apple 로그인·라이선스 동의를 대신 수행하지 않는다.

```bash
brew install cocoapods fastlane
# 다른 Xcode 경로의 예
DEVELOPER_DIR=/Applications/Xcode-beta.app/Contents/Developer npm run build:ios:local
```

## 주요 파일

- `scripts/local-build.mjs`: 로컬 사전 검사, SDK/Java 경로 감지, EAS --local 실행
- `package.json`: doctor 및 Android/iOS 로컬 빌드·실행 명령
- `eas.json`: 기존 preview APK와 별도 iOS simulator 프로필
- `.gitignore`, `.easignore`: 빌드 산출물·서명 자격 증명 제외

공식 문서: [Expo 로컬 빌드](https://docs.expo.dev/build-reference/local-builds/), [로컬 개발](https://docs.expo.dev/guides/local-app-development/), [SDK 58 환경 요건](https://docs.expo.dev/versions/v58.0.0/).
