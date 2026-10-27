import { message as msg } from "../i18n/core";
import { useI18n } from "../i18n/context";
import React from "react";
import { View } from "react-native";
import { usePurchase } from "../purchases/context";
import { Button, Card, Row, T } from "./design";
const states = {
  disabled: msg("purchase.settings.setup.required"),
  loading: msg("purchase.settings.loading"),
  ready: msg("purchase.settings.ready.to.purchase"),
  purchasing: msg("purchase.settings.processing.purchase"),
  restoring: msg("purchase.settings.restoring.purchases"),
  purchased: msg("purchase.settings.purchased"),
  pending: msg("purchase.settings.purchase.pending"),
  cancelled: msg("purchase.settings.purchase.cancelled"),
  error: msg("purchase.settings.unable.to.verify"),
};
export function PurchaseSettings() {
  const { t: tr, text } = useI18n();

  const { state, controller } = usePurchase();
  const busy = controller.isBusy();
  return (
    <Card>
      <T big>{tr("purchase.settings.in.app.purchase.test")}</T>
      <T>
        {state.product?.title ||
          tr("purchase.settings.finish.coach.test.purchase")}
      </T>
      <T>
        {tr(
          "purchase.settings.a.one.time.test.product.existing.app.features.remain",
        )}
      </T>
      <T>
        {tr(
          "purchase.settings.use.an.apple.sandbox.or.google.license.tester.account",
        )}
      </T>
      <View accessibilityLiveRegion="polite">
        <T>
          {tr("purchases.statusLabel", { value: text(states[state.status]) })}
        </T>
        <T>
          {tr("purchases.ownershipLabel", {
            value:
              state.ownership === "owned"
                ? tr("purchase.settings.purchased")
                : state.ownership === "not_owned"
                  ? tr("purchase.settings.not.purchased")
                  : tr("purchase.settings.not.yet.verified"),
          })}
        </T>
        <T>{text(state.message)}</T>
        {state.sandbox !== null && (
          <T>
            {tr("purchases.environmentLabel", {
              value: state.sandbox
                ? tr("purchase.settings.sandbox.test")
                : tr("purchase.settings.live.store.purchase"),
            })}
          </T>
        )}
      </View>
      {state.product && (
        <T>{tr("purchases.priceLabel", { price: state.product!.price })}</T>
      )}
      <Row>
        <Button
          title={
            state.ownership === "owned"
              ? tr("purchase.settings.purchased")
              : state.product
                ? tr("purchases.buyAtPrice", {
                    price: state.product.price,
                  })
                : tr("purchase.settings.load.product.price.first")
          }
          selected
          disabled={!controller.canPurchase()}
          onPress={() => void controller.purchase()}
        />
        <Button
          title={tr("purchase.settings.restore.purchases")}
          disabled={!state.initialized || busy}
          onPress={() => void controller.restore()}
        />
        <Button
          title={tr("purchase.settings.refresh.purchase.status")}
          disabled={state.status === "disabled" || busy}
          onPress={() => void controller.refresh()}
        />
      </Row>
      <T>
        {tr(
          "purchase.settings.restore.with.the.same.store.account.anonymous.purchases.are",
        )}
      </T>
    </Card>
  );
}
