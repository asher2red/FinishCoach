import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";

export function EditorScroll({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>();
  useLayoutEffect(() => {
    const input = document.activeElement;
    if (
      height !== undefined &&
      input instanceof HTMLElement &&
      root.current?.contains(input)
    )
      input.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [height]);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const reveal = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const input = document.activeElement;
        const editing =
          input instanceof HTMLInputElement ||
          input instanceof HTMLTextAreaElement;
        if (!editing || !root.current?.contains(input)) {
          setHeight(undefined);
          return;
        }
        if (viewport && viewport.height < window.innerHeight) {
          setHeight(
            Math.max(
              0,
              viewport.height -
                Math.max(
                  0,
                  root.current.getBoundingClientRect().top - viewport.offsetTop,
                ),
            ),
          );
        } else setHeight(undefined);
        input.scrollIntoView({ block: "nearest", inline: "nearest" });
      });
    };
    document.addEventListener("focusin", reveal);
    document.addEventListener("focusout", reveal);
    viewport?.addEventListener("resize", reveal);
    viewport?.addEventListener("scroll", reveal);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", reveal);
      document.removeEventListener("focusout", reveal);
      viewport?.removeEventListener("resize", reveal);
      viewport?.removeEventListener("scroll", reveal);
    };
  }, []);
  return (
    <div
      ref={root}
      style={{ flex: 1, minHeight: 0, display: "flex", maxHeight: height }}
    >
      <ScrollView
        testID="editor-scroll"
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 24, alignItems: "center" }}
      >
        {children}
      </ScrollView>
    </div>
  );
}
