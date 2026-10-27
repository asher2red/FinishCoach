import { useI18n } from "../i18n/context";
import React from "react";
import { Card, T } from "./design";
export function PurchaseSettings() {
  const { t: tr } = useI18n();

  return (
    <Card>
      <T big>{tr("purchase.settings.in.app.purchase.test")}</T>
      <T>
        {tr("purchases.in.app.purchase.testing.is.available.in.the.android")}
      </T>
    </Card>
  );
}
