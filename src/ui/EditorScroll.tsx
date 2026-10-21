import React, { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { InputVisibility } from "./InputVisibility";
import { tokens } from "./tokens";

export function EditorScroll({ children }: { children: React.ReactNode }) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const focused = useRef<React.ComponentRef<typeof TextInput> | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const reveal = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current;
      if (!input?.isFocused()) return;
      scroll.current?.measureInWindow((_x, top, _w, height) => {
        input.measureInWindow((_ix, y, _iw, inputHeight) => {
          if (!input.isFocused() || height <= 0) return;
          const bottom = Math.min(
            top + height,
            Keyboard.metrics()?.screenY ?? Infinity,
          );
          const gap = tokens.space.small;
          const delta =
            y < top + gap
              ? y - top - gap
              : Math.max(0, y + inputHeight - bottom + gap);
          if (delta)
            scroll.current?.scrollTo({
              y: Math.max(0, offset.current + delta),
              animated: false,
            });
        });
      });
    });
  }, []);
  useEffect(() => {
    const events = [Keyboard.addListener("keyboardDidShow", reveal)];
    if (Platform.OS === "ios")
      events.push(Keyboard.addListener("keyboardDidChangeFrame", reveal));
    return () => {
      events.forEach((sub) => sub.remove());
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [reveal]);
  return (
    <InputVisibility.Provider
      value={(input) => {
        focused.current = input;
        reveal();
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          testID="editor-scroll"
          style={{ flex: 1 }}
          onLayout={reveal}
          onContentSizeChange={reveal}
          onScroll={(event) => {
            offset.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={{ padding: 24, alignItems: "center" }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </InputVisibility.Provider>
  );
}
