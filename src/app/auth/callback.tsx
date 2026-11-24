import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { finishSignIn } from "../../account/auth";
import { useI18n } from "../../i18n/context";
import { Button, Card, T } from "../../ui/design";

export default function AuthCallback() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [failed, setFailed] = useState(false);
  const { t } = useI18n();
  useEffect(() => {
    if (!code) return;
    let active = true;
    void finishSignIn(code).then(
      () => {
        if (active) router.replace("/settings");
      },
      () => {
        if (active) setFailed(true);
      },
    );
    return () => {
      active = false;
    };
  }, [code]);
  return (
    <Card>
      <T>{t(failed || !code ? "account.loginFailed" : "account.connecting")}</T>
      {(failed || !code) && (
        <Button
          title={t("account.back")}
          onPress={() => router.replace("/settings")}
        />
      )}
    </Card>
  );
}
