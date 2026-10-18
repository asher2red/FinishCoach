import { addDays, dateAt, localDate } from "./model";
export function toClock(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return { period: hour < 12 ? "오전" : "오후", hour: hour % 12 || 12, minute };
}
export function fromClock(period: string, hour: number, minute: number) {
  return `${String((hour % 12) + (period === "오후" ? 12 : 0)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export function displayTime(time: string) {
  const c = toClock(time);
  return `${c.period} ${c.hour}시 ${String(c.minute).padStart(2, "0")}분`;
}
export function shiftMonth(day: string, amount: number) {
  const d = dateAt(day),
    wanted = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + amount);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(wanted, last));
  return localDate(d);
}
export function shiftPeriod(date: string, period: string, amount: number) {
  return period === "월"
    ? shiftMonth(date, amount)
    : period === "년"
      ? shiftMonth(date, 12 * amount)
      : addDays(date, amount * (period === "주" ? 7 : 1));
}
export function calendarDays(month: string) {
  const first = month.slice(0, 7) + "-01",
    start = addDays(first, -((dateAt(first).getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}
