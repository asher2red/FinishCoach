import React, { useRef, useEffect, useContext } from "react";
import type { WheelProps } from "./Wheel";
import { Theme } from "./design";
export default function Wheel({
  label,
  values,
  value,
  onChange,
  displayValue = (value) => value,
}: WheelProps) {
  const c = useContext(Theme),
    ref = useRef<HTMLDivElement>(null);
  const programmatic = useRef(true);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);
  const initial = useRef(Math.max(0, values.indexOf(value)));
  useEffect(() => {
    ref.current?.scrollTo({ top: initial.current * 44 });
  }, []);
  const select = (i: number) => {
    programmatic.current = true;
    onChange(values[i]);
    ref.current?.scrollTo({ top: i * 44 });
  };
  return (
    <div
      style={{ flex: 1, minWidth: 70, fontFamily: "inherit", color: c.text }}
    >
      <div style={{ marginBottom: 8 }}>{label}</div>
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        aria-activedescendant={`${label}-${value}`}
        tabIndex={0}
        onKeyDown={(e) => {
          const index = values.indexOf(value);
          const key = {
            ArrowUp: Math.max(0, index - 1),
            ArrowDown: Math.min(values.length - 1, index + 1),
            Home: 0,
            End: values.length - 1,
          }[e.key];
          if (key !== undefined) {
            e.preventDefault();
            select(key);
          }
        }}
        onWheel={() => {
          programmatic.current = false;
        }}
        onTouchStart={() => {
          programmatic.current = false;
        }}
        onPointerDown={() => {
          programmatic.current = false;
        }}
        onScroll={(e) => {
          if (programmatic.current) return;
          const y = e.currentTarget.scrollTop;
          latest.current(
            values[
              Math.max(0, Math.min(values.length - 1, Math.round(y / 44)))
            ],
          );
        }}
        style={{
          height: 220,
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          borderRadius: 16,
          background: c.card,
          overscrollBehavior: "contain",
        }}
      >
        <div style={{ height: 88 }} />
        {values.map((v, i) => (
          <div
            id={`${label}-${v}`}
            key={displayValue(v)}
            role="option"
            aria-selected={v === value}
            onClick={() => select(i)}
            style={{
              height: 44,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              scrollSnapAlign: "center",
              fontSize: v === value ? 22 : 18,
              fontWeight: v === value ? 800 : 400,
              background: v === value ? c.soft : "transparent",
              cursor: "pointer",
            }}
          >
            {displayValue(v)}
          </div>
        ))}
        <div style={{ height: 88 }} />
      </div>
    </div>
  );
}
