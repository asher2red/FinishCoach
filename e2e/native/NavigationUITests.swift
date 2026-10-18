import XCTest

final class NavigationUITests: XCTestCase {
  func shot(_ name: String, _ app: XCUIApplication) {
    let attachment = XCTAttachment(screenshot: app.screenshot())
    attachment.name = name
    attachment.lifetime = .keepAlways
    add(attachment)
  }

  func testFixedMenuAndRoutes() {
    continueAfterFailure = false
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
