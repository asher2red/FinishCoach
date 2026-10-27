import { message as msg, type AppMessage } from "../i18n/core";
import { useI18n } from "../i18n/context";
import React from "react";
import { Platform, Switch, View, Linking } from "react-native";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import { Card, T, Row, Button } from "./design";
import { requestPermission } from "../services/notifications";
export function NotificationSettings() {
  const { t: tr, text } = useI18n();

  const { state, mutate, busy } = useStore();
  const settings = normalizeSettings(state.settings);
  const [message, setMessage] = React.useState<AppMessage>("");
  return (
    <View style={{ gap: 18 }}>
      <T big>{tr("notification.settings.app.notification.settings")}</T>
      <T>
        {tr(
          "notification.settings.applies.to.all.routines.and.saves.immediately.notifications.still",
        )}
      </T>
      {(["soundEnabled", "vibrationEnabled"] as const).map((key) => {
        const disabled =
          busy ||
          Platform.OS === "web" ||
          (Platform.OS === "ios" && key === "vibrationEnabled");
        return (
          <Card key={key}>
            <Row>
              <View style={{ flex: 1 }}>
                <T>
                  {key === "soundEnabled"
                    ? tr("notification.settings.notification.sound")
                    : tr("notification.settings.vibration")}
                </T>
                <T>
                  {key === "soundEnabled"
                    ? tr(
                        "notification.settings.play.a.sound.for.routine.reminders",
                      )
                    : tr("notification.settings.vibrate.for.routine.reminders")}
                </T>
              </View>
              <Switch
                accessibilityLabel={
                  key === "soundEnabled"
                    ? tr("notification.settings.notification.sound")
                    : tr("notification.settings.vibration")
                }
                disabled={disabled}
                value={settings[key]}
                onValueChange={(value) =>
                  void mutate((s) => {
                    s.settings = {
                      ...normalizeSettings(s.settings),
                      [key]: value,
                    };
                  })
                }
              />
            </Row>
            {Platform.OS === "web" && (
              <T>
                {tr(
                  "notification.settings.sound.and.vibration.cannot.be.consistently.controlled.by.this",
                )}
              </T>
            )}
            {Platform.OS === "ios" && key === "vibrationEnabled" && (
              <T>
                {tr(
                  "notification.settings.ios.does.not.support.independent.vibration.control.for.standard",
                )}
              </T>
            )}
          </Card>
        );
      })}
      <Card>
        <T>
          {tr(
            "notification.settings.system.silent.mode.do.not.disturb.focus.and.notification",
          )}
        </T>
        <Button
          title={tr(
            "notification.settings.check.and.request.notification.permission",
          )}
          onPress={() =>
            void requestPermission()
              .then((message) => {
                setMessage(message);
                void mutate(() => {});
              })
              .catch(() =>
                setMessage(
                  msg(
                    "notification.settings.unable.to.open.permission.settings",
                  ),
                ),
              )
          }
        />
        {Platform.OS !== "web" && (
          <Button
            title={tr(
              "notification.settings.open.device.notification.settings",
            )}
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setMessage(
                  msg("notification.settings.unable.to.open.device.settings"),
                ),
              )
            }
          />
        )}
        {!!message && <T>{text(message)}</T>}
      </Card>
    </View>
  );
}
