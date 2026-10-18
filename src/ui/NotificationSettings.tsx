import React from "react";
import { Platform, Switch, View, Linking } from "react-native";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import { Card, T, Row, Button } from "./design";
import { requestPermission } from "../services/notifications";
export function NotificationSettings() {
  const { state, mutate, busy } = useStore();
  const settings = normalizeSettings(state.settings);
  const [message, setMessage] = React.useState("");
  return (
    <View style={{ gap: 18 }}>
      <T big>앱 전체 알림 설정</T>
      <T>
        모든 루틴에 공통으로 적용하고 변경 즉시 저장합니다. 소리와 진동을 꺼도
        알림은 표시됩니다.
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
                <T>{key === "soundEnabled" ? "알림음" : "진동"}</T>
                <T>
                  {key === "soundEnabled"
                    ? "루틴 알림이 울릴 때 소리를 재생합니다."
                    : "루틴 알림이 울릴 때 진동을 사용합니다."}
                </T>
              </View>
              <Switch
                accessibilityLabel={key === "soundEnabled" ? "알림음" : "진동"}
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
                웹 브라우저에서는 앱이 소리·진동을 일관되게 제어할 수 없어 이
                설정을 변경할 수 없습니다.
              </T>
            )}
            {Platform.OS === "ios" && key === "vibrationEnabled" && (
              <T>
                iOS 일반 알림은 진동만 독립 제어할 수 없습니다. 저장된 Android
                설정을 표시하며 iOS에서는 시스템 설정을 따릅니다.
              </T>
            )}
          </Card>
        );
      })}
      <Card>
        <T>
          OS의 무음·방해 금지·집중 모드와 사용자가 변경한 알림 채널 설정이
          우선합니다. 설정은 이미 예약한 알림에도 다시 반영합니다.
        </T>
        <Button
          title="알림 권한 확인 및 요청"
          onPress={() =>
            void requestPermission()
              .then((message) => {
                setMessage(message);
                void mutate(() => {});
              })
              .catch(() => setMessage("권한 설정을 열 수 없습니다."))
          }
        />
        {Platform.OS !== "web" && (
          <Button
            title="기기 알림 설정 열기"
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setMessage("기기 설정을 열 수 없습니다."),
              )
            }
          />
        )}
        {!!message && <T>{message}</T>}
      </Card>
    </View>
  );
}
