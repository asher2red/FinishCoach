import React from "react";
import { View } from "react-native";
import { usePurchase } from "../purchases/context";
import { Button, Card, Row, T } from "./design";
const states = {
  disabled: "설정 필요",
  loading: "불러오는 중",
  ready: "구매 가능",
  purchasing: "구매 처리 중",
  restoring: "구매 복원 중",
  purchased: "구매 완료",
  pending: "구매 대기",
  cancelled: "구매 취소",
  error: "확인 오류",
};
export function PurchaseSettings() {
  const { state, controller } = usePurchase();
  const busy = controller.isBusy();
  return (
    <Card>
      <T big>인앱 결제 테스트</T>
      <T>{state.product?.title || "Finish Coach 테스트 구매"}</T>
      <T>일회성 테스트 상품입니다. 기존 앱 기능은 유료화되지 않습니다.</T>
      <T>
        Apple Sandbox 또는 Google 라이선스 테스트 계정으로 진행하세요. 결제창의
        테스트 표시·결제 수단을 확인하세요.
      </T>
      <View accessibilityLiveRegion="polite">
        <T>현재 상태: {states[state.status]}</T>
        <T>
          구매 확인:{" "}
          {state.ownership === "owned"
            ? "구매 완료"
            : state.ownership === "not_owned"
              ? "미구매"
              : "아직 확인하지 못함"}
        </T>
        <T>{state.message}</T>
        {state.sandbox !== null && (
          <T>
            확인된 구매 환경:{" "}
            {state.sandbox ? "Sandbox 테스트" : "실제 스토어 구매"}
          </T>
        )}
      </View>
      {state.product && <T>스토어 가격: {state.product.price}</T>}
      <Row>
        <Button
          title={
            state.ownership === "owned"
              ? "구매 완료"
              : state.product
                ? `테스트 구매 · ${state.product.price}`
                : "상품 가격 확인 필요"
          }
          selected
          disabled={!controller.canPurchase()}
          onPress={() => void controller.purchase()}
        />
        <Button
          title="구매 복원"
          disabled={!state.initialized || busy}
          onPress={() => void controller.restore()}
        />
        <Button
          title="구매 상태 다시 확인"
          disabled={state.status === "disabled" || busy}
          onPress={() => void controller.refresh()}
        />
      </Row>
      <T>
        구매 복원은 같은 스토어 계정에서 진행하세요. 익명 사용자 구매는
        Apple·Google 간 자동 공유되지 않습니다.
      </T>
    </Card>
  );
}
