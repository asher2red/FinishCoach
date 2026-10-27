import React from "react";
import { View } from "react-native";
import { resources } from "../i18n/generated";
import { useI18n } from "../i18n/context";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import { Card, T, Button, Row } from "./design";
export function LanguageSettings() {
  const { locale, t } = useI18n();
  const { state, mutate, busy } = useStore();
  const selected = normalizeSettings(state.settings).language;
  return (
    <Card>
      <T big>{t("language.title")}</T>
      <T>{t("language.description")}</T>
      <Row>
        {(Object.keys(resources) as (keyof typeof resources)[]).map(
          (language) => (
            <View key={language} style={{ flex: 1, minWidth: 120 }}>
              <Button
                title={
                  language === "ko"
                    ? t("language.option.ko")
                    : language === "en"
                      ? t("language.option.en")
                      : (new Intl.DisplayNames([language], {
                          type: "language",
                        }).of(language) ?? language)
                }
                selected={locale === language}
                disabled={busy}
                onPress={() => {
                  if (selected !== language)
                    void mutate((s) => {
                      s.settings = {
                        ...normalizeSettings(s.settings),
                        language,
                      };
                    });
                }}
              />
            </View>
          ),
        )}
      </Row>
      <T>{selected === null ? t("language.automatic") : t("language.saved")}</T>
    </Card>
  );
}
