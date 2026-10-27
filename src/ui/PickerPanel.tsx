import { useI18n } from "../i18n/context";
import React, { useContext } from "react";
import { Modal, View, ScrollView, Platform, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Theme, T, Button, Row } from "./design";
export function PickerPanel({
  title,
  onCancel,
  onConfirm,
  children,
  confirmDisabled = false,
}: {
  title: string;
  onCancel: () => void;
  onConfirm: () => void;
  children: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  const { t: tr } = useI18n();

  const c = useContext(Theme);
  return (
    <Modal
      transparent
      animationType={Platform.OS === "web" ? "none" : "fade"}
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: c.overlay,
          justifyContent: Platform.OS === "web" ? "center" : "flex-end",
          alignItems: "center",
        }}
      >
        <Pressable
          accessibilityLabel={tr("picker.panel.close.picker.backdrop")}
          onPress={onCancel}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <SafeAreaView
          testID="picker-panel"
          style={{
            width: "100%",
            maxWidth: 480,
            maxHeight: "95%",
            backgroundColor: c.elevated,
            borderRadius: 24,
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, gap: 14 }}
          >
            <T big>{title}</T>
            {children}
            <Row>
              <View style={{ flex: 1 }}>
                <Button title={tr("common.cancel")} onPress={onCancel} />
              </View>
              <Button
                title={tr("common.confirm")}
                disabled={confirmDisabled}
                selected
                onPress={onConfirm}
              />
            </Row>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
