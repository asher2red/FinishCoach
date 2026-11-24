import { useState } from "react";
import { useAuth, signInWithGoogle } from "../account/auth";
import { cloud } from "../account/client";
import { hasWorkspaceData, workspaceOf } from "../account/repository";
import { repository } from "../data/storage";
import { useStore } from "../data/context";
import { errorMessage } from "../i18n/core";
import { useI18n } from "../i18n/context";
import { Button, Card, T } from "./design";

export function AccountSettings() {
  const { t, text } = useI18n();
  const { session } = useAuth();
  const { state, mutate, reload, busy, ready } = useStore();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const run = async (action: () => Promise<void>) => {
    setFeedback("");
    setPending(true);
    try {
      await action();
    } catch (error) {
      setFeedback(text(errorMessage(error, "account.loginFailed")));
    } finally {
      setPending(false);
    }
  };
  return (
    <Card>
      <T big>{t("account.title")}</T>
      {!session ? (
        <>
          <T>{t("account.guest")}</T>
          <Button
            title={t("account.google")}
            disabled={pending}
            onPress={() => void run(signInWithGoogle)}
          />
        </>
      ) : (
        <>
          {!!session.user.email && <T>{session.user.email}</T>}
          <T>{t("account.online")}</T>
          <Button
            title={t("account.refresh")}
            disabled={pending || busy}
            onPress={() => void reload()}
          />
          {ready && !hasWorkspaceData(state) && (
            <Button
              title={t("account.import")}
              disabled={pending || busy}
              onPress={() =>
                void run(async () => {
                  const local = await repository.load();
                  if (!local || !hasWorkspaceData(local)) {
                    setFeedback(t("account.noGuestData"));
                    return;
                  }
                  await mutate((next) => {
                    if (!hasWorkspaceData(next))
                      Object.assign(next, workspaceOf(local));
                  });
                })
              }
            />
          )}
          <Button
            title={t("account.signOut")}
            disabled={pending || busy}
            onPress={() =>
              void run(async () => {
                const { error } = await cloud.auth.signOut({ scope: "local" });
                if (error) throw error;
              })
            }
          />
        </>
      )}
      {!!feedback && <T>{feedback}</T>}
    </Card>
  );
}
