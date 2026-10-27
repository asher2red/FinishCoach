import { useI18n } from "../i18n/context";
import React, { useContext } from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { Theme } from "./design";

export function BrandMark() {
  const { t: tr } = useI18n();

  const c = useContext(Theme);
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 16,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("../../assets/brand/coach-cap-small.png")}
          contentFit="contain"
          style={{ width: 46, height: 46 }}
          accessible={false}
          alt=""
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: c.text,
            fontSize: 21,
            lineHeight: 26,
            fontWeight: "800",
          }}
        >
          Finish Coach
        </Text>
        <Text style={{ color: c.muted, fontSize: 12, lineHeight: 18 }}>
          {tr("brand.mark.a.little.better.every.day")}
        </Text>
      </View>
    </View>
  );
}
