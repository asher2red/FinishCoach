import XCTest

final class NavigationUITests: XCTestCase {
  func shot(_ name: String, _ app: XCUIApplication) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  func assertChoice(_ id: String, _ app: XCUIApplication) {
    let choice = app.descendants(matching: .any)[id].firstMatch
    let selected = XCTNSPredicateExpectation(predicate: NSPredicate(format: "selected == true OR value == %@ OR value CONTAINS %@", "1", "선택됨"), object: choice)
    XCTAssertEqual(XCTWaiter.wait(for: [selected], timeout: 10), .completed)
  }

  func testPurchaseSetupWithoutCredentials() {
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication(bundleIdentifier: "com.finishcoach.app")
    app.launch()
    app.buttons["bottom-menu-settings"].tap()
    let scroll = app.descendants(matching: .any)["screen-scroll"].firstMatch
    let title = app.staticTexts["인앱 결제 테스트"].firstMatch
    XCTAssertTrue(title.waitForExistence(timeout: 10))
    for _ in 0..<20 {
      if title.frame.minY >= scroll.frame.minY && title.frame.maxY <= scroll.frame.maxY { break }
      let below = title.frame.maxY > scroll.frame.maxY
      let start = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: below ? 0.7 : 0.3))
      let end = scroll.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: below ? 0.4 : 0.6))
      start.press(forDuration: 0.05, thenDragTo: end)
    }
    XCTAssertGreaterThanOrEqual(title.frame.minY, scroll.frame.minY)
    XCTAssertLessThanOrEqual(title.frame.maxY, scroll.frame.maxY)
    XCTAssertTrue(app.staticTexts["현재 상태: 설정 필요"].exists)
    XCTAssertTrue(app.staticTexts["구매 확인: 아직 확인하지 못함"].exists)
    XCTAssertFalse(app.buttons["상품 가격 확인 필요"].isEnabled)
    XCTAssertFalse(app.buttons["구매 복원"].isEnabled)
    app.buttons["bottom-menu-today"].tap()
    XCTAssertTrue(app.staticTexts["오늘, 하나씩 끝내볼까요?"].waitForExistence(timeout: 10))
  }

  func testMilestoneKeyboardVisibility() {
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication(bundleIdentifier: "com.finishcoach.app")
    app.launch()
    app.buttons["bottom-menu-projects"].tap()
    app.buttons["＋ 프로젝트 만들기"].tap()
    let scroll = app.descendants(matching: .any)["editor-scroll"].firstMatch
    let title = app.textFields["프로젝트 제목"]
    XCTAssertTrue(title.waitForExistence(timeout: 10))
    title.tap()
    title.typeText("Keyboard draft")
    for index in 1...3 {
      let add = app.buttons["＋ 마일스톤 추가"]
      for _ in 0..<8 { if add.isHittable { break }; scroll.swipeUp() }
      XCTAssertTrue(add.isHittable)
      add.tap()
      let field = app.textFields["마일스톤 \(index)"]
      XCTAssertTrue(field.waitForExistence(timeout: 10))
      XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
      let visible = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
        field.isHittable && field.frame.maxY <= app.keyboards.firstMatch.frame.minY + 1
      }, object: nil)
      XCTAssertEqual(XCTWaiter.wait(for: [visible], timeout: 5), .completed)
      field.typeText("Step \(index)")
      XCTAssertEqual(field.value as? String, "Step \(index)")
    }
    shot("milestones-keyboard-ios", app)
    for _ in 0..<8 { if app.textViews["완료 기준"].isHittable { break }; scroll.swipeDown() }
    let notes = app.textViews["완료 기준"]
    notes.tap()
    notes.typeText("Line one\nLine two\nLine three")
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
    XCTAssertTrue(notes.isHittable)
    XCTAssertLessThanOrEqual(notes.frame.maxY, app.keyboards.firstMatch.frame.minY + 1)
    shot("multiline-keyboard-ios", app)
    for _ in 0..<10 { if app.buttons["닫기"].firstMatch.isHittable { break }; scroll.swipeDown() }
    app.buttons["닫기"].firstMatch.tap()
    XCTAssertTrue(app.buttons["bottom-menu-projects"].waitForExistence(timeout: 10))
    app.buttons["＋ 프로젝트 만들기"].tap()
    XCTAssertEqual(app.textFields["프로젝트 제목"].value as? String, "")
    XCTAssertFalse(app.textFields["마일스톤 1"].exists)
    app.buttons["닫기"].firstMatch.tap()
  }

  func testBackgroundThemePersistence() {
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication(bundleIdentifier: "com.finishcoach.app")
    app.launch()
    app.buttons["bottom-menu-settings"].tap()
    let scroll = app.descendants(matching: .any)["screen-scroll"].firstMatch
    let dark = app.descendants(matching: .any)["background-theme-dark"].firstMatch
    for _ in 0..<4 { if dark.isHittable { break }; scroll.swipeUp() }
    XCTAssertTrue(dark.isHittable)
    dark.tap()
    assertChoice("background-theme-dark", app)
    shot("background-dark-ios", app)
    app.buttons["bottom-menu-today"].tap()
    XCTAssertTrue(app.staticTexts["오늘, 하나씩 끝내볼까요?"].waitForExistence(timeout: 10))
    shot("background-dark-today-ios", app)
    app.terminate()
    app.launch()
    app.buttons["bottom-menu-settings"].tap()
    assertChoice("background-theme-dark", app)
    let light = app.descendants(matching: .any)["background-theme-light"].firstMatch
    light.tap()
    assertChoice("background-theme-light", app)
    shot("background-light-ios", app)
  }

  func testFixedMenuAndRoutes() {
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication(bundleIdentifier: "com.finishcoach.app")
    app.launch()
    let ids = ["today", "routines", "history", "statistics", "projects", "settings"]
    let titles = ["오늘, 하나씩 끝내볼까요?", "꾸준함을 만드는 루틴", "쌓여가는 나의 실행", "실행으로 확인하는 성장", "끝까지 가는 프로젝트", "나에게 맞는 설정"]
    let bar = app.otherElements["bottom-navigation"]
    XCTAssertTrue(bar.waitForExistence(timeout: 15))
    XCTAssertEqual(app.otherElements.matching(identifier: "bottom-navigation").count, 1)
    var widths: [CGFloat] = []
    for (index, id) in ids.enumerated() {
      let button = app.buttons["bottom-menu-\(id)"]
      XCTAssertTrue(button.isHittable)
      XCTAssertGreaterThanOrEqual(button.frame.width, 44)
      XCTAssertGreaterThanOrEqual(button.frame.height, 48)
      widths.append(button.frame.width)
      button.tap()
      XCTAssertTrue(app.staticTexts[titles[index]].waitForExistence(timeout: 10))
      XCTAssertTrue(button.isSelected)
    }
    XCTAssertLessThan((widths.max() ?? 0) - (widths.min() ?? 0), 1)
    let items = app.otherElements["bottom-navigation-items"]
    XCTAssertEqual(items.frame.height, 56, accuracy: 1)
    let before = bar.frame
    shot("navigation-before-scroll", app)
    let scroll = app.descendants(matching: .any)["screen-scroll"].firstMatch
    XCTAssertTrue(scroll.exists)
    scroll.swipeUp()
    scroll.swipeUp()
    XCTAssertEqual(bar.frame.minY, before.minY, accuracy: 1)
    XCTAssertEqual(bar.frame.maxY, before.maxY, accuracy: 1)
    XCTAssertLessThanOrEqual(scroll.frame.maxY, bar.frame.minY + 1)
    let footer = app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", "기기에 저장")).firstMatch
    XCTAssertTrue(footer.isHittable)
    XCTAssertLessThanOrEqual(footer.frame.maxY, bar.frame.minY)
    shot("navigation-after-scroll", app)
    print("NAV_MEASURE content=\(items.frame.height) bar=\(bar.frame.height) y=\(bar.frame.minY) screen=\(app.frame)")

    app.buttons["bottom-menu-routines"].tap()
    app.buttons["＋ 루틴 만들기"].tap()
    let field = app.textFields["활동 이름 (직접 추가 가능)"]
    XCTAssertTrue(field.waitForExistence(timeout: 10))
    field.tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
    shot("navigation-editor-keyboard", app)
    app.buttons["닫기"].firstMatch.tap()
    let restored = app.buttons["bottom-menu-routines"]
    let visible = NSPredicate(format: "exists == true AND hittable == true")
    expectation(for: visible, evaluatedWith: restored)
    waitForExpectations(timeout: 10)
    XCTAssertEqual(app.otherElements.matching(identifier: "bottom-navigation").count, 1)
  }
}
