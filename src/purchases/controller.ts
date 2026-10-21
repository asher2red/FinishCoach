export interface Product {
  id: string;
  title: string;
  price: string;
}
export interface PurchaseInfo {
  owned: boolean;
  sandbox: boolean | null;
  requestDate: string;
}
export interface PurchaseClient {
  issue: string | null;
  initialize(): Promise<void>;
  info(): Promise<PurchaseInfo>;
  product(): Promise<Product>;
  purchase(): Promise<PurchaseInfo>;
  restore(): Promise<PurchaseInfo>;
  listen(listener: (info: PurchaseInfo) => void): () => void;
}
export type PurchaseStatus =
  | "disabled"
  | "loading"
  | "ready"
  | "purchasing"
  | "restoring"
  | "purchased"
  | "pending"
  | "cancelled"
  | "error";
export interface PurchaseState {
  status: PurchaseStatus;
  ownership: "unknown" | "owned" | "not_owned";
  product: Product | null;
  initialized: boolean;
  pending: boolean;
  sandbox: boolean | null;
  message: string;
}
function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
}
function errorText(error: unknown) {
  const code = errorCode(error);
  if (code === "10" || code === "35")
    return "네트워크에 연결할 수 없습니다. 구매 상태를 단정하지 않고 기존 확인 결과를 유지합니다.";
  if (code === "6")
    return "스토어에 이미 구매한 상품이 있습니다. 구매 복원을 실행해주세요.";
  if (["11", "23", "5"].includes(code))
    return "결제 상품 설정을 확인해주세요. RevenueCat 키·offering·상품과 스토어 테스트 계정 연결이 필요합니다.";
  if (error instanceof Error && error.name === "PurchaseConfigurationError")
    return error.message;
  return "결제 정보를 처리하지 못했습니다. 연결과 스토어 계정을 확인한 뒤 다시 시도해주세요.";
}
export class PurchaseController {
  private state: PurchaseState;
  private listeners = new Set<() => void>();
  private locked = false;
  private requestDate = -Infinity;
  constructor(private client: PurchaseClient) {
    this.state = {
      status: client.issue ? "disabled" : "loading",
      ownership: "unknown",
      product: null,
      initialized: false,
      pending: false,
      sandbox: null,
      message: client.issue ?? "스토어 상품과 구매 상태를 불러오는 중입니다.",
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(patch: Partial<PurchaseState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private applyInfo(info: PurchaseInfo) {
    const time = Date.parse(info.requestDate);
    if (Number.isFinite(time) && time < this.requestDate) return;
    if (Number.isFinite(time)) this.requestDate = time;
    this.update({
      ownership: info.owned ? "owned" : "not_owned",
      sandbox: info.sandbox,
      pending: info.owned ? false : this.state.pending,
    });
  }
  private status(): PurchaseStatus {
    return this.state.ownership === "owned"
      ? "purchased"
      : this.state.pending
        ? "pending"
        : this.state.product && this.state.ownership === "not_owned"
          ? "ready"
          : "error";
  }
  canPurchase = () =>
    !!this.state.product &&
    this.state.ownership === "not_owned" &&
    !this.state.pending &&
    ["ready", "cancelled"].includes(this.state.status);
  isBusy = () =>
    ["loading", "purchasing", "restoring"].includes(this.state.status);
  private connectionWanted = false;
  private stopListener: (() => void) | undefined;
  start() {
    this.connectionWanted = true;
    void this.refresh();
    return () => {
      this.connectionWanted = false;
      this.stopListener?.();
      this.stopListener = undefined;
    };
  }
  refresh = async () => {
    if (this.locked || this.client.issue) return;
    this.locked = true;
    this.update({
      status: "loading",
      message: "스토어 상품과 구매 상태를 확인하고 있습니다.",
    });
    try {
      await this.client.initialize();
      this.update({ initialized: true });
      if (this.connectionWanted && !this.stopListener)
        this.stopListener = this.client.listen((info) => {
          this.applyInfo(info);
          if (!this.locked)
            this.update({
              status: this.status(),
              message:
                this.state.ownership === "owned"
                  ? "테스트 구매가 확인되었습니다."
                  : "최신 구매 상태를 확인했습니다.",
            });
        });
      const [info, product] = await Promise.allSettled([
        this.client.info(),
        this.client.product(),
      ]);
      if (info.status === "fulfilled") this.applyInfo(info.value);
      if (product.status === "fulfilled")
        this.update({ product: product.value });
      else this.update({ product: null });
      const error =
        info.status === "rejected"
          ? info.reason
          : product.status === "rejected"
            ? product.reason
            : null;
      this.update({
        status: error ? "error" : this.status(),
        message: error
          ? errorText(error)
          : this.state.ownership === "owned"
            ? "구매 완료 상태를 확인했습니다. 기존 앱 기능은 변경되지 않습니다."
            : this.state.pending
              ? "결제 승인 대기 중입니다. 승인 전에는 구매 완료로 처리하지 않습니다."
              : "스토어에서 불러온 가격으로 테스트 구매할 수 있습니다.",
      });
    } catch (error) {
      this.update({ status: "error", message: errorText(error) });
    } finally {
      this.locked = false;
    }
  };
  purchase = async () => {
    if (this.locked || !this.canPurchase()) return;
    this.locked = true;
    this.update({
      status: "purchasing",
      message: "스토어 결제창에서 진행해주세요.",
    });
    try {
      this.applyInfo(await this.client.info());
      if (this.state.ownership !== "owned")
        this.applyInfo(await this.client.purchase());
      if (this.state.ownership === "owned")
        this.update({
          status: "purchased",
          message:
            "테스트 구매가 확인되었습니다. 기존 앱 기능은 변경되지 않습니다.",
        });
      else
        this.update({
          status: "pending",
          pending: true,
          message:
            "구매 결과를 받았지만 권한 확인 대기 중입니다. 구매 상태를 다시 확인해주세요.",
        });
    } catch (error) {
      const cancelled =
        errorCode(error) === "1" ||
        (!!error &&
          typeof error === "object" &&
          "userCancelled" in error &&
          error.userCancelled === true);
      const pending = errorCode(error) === "20";
      this.update({
        status:
          this.state.ownership === "owned"
            ? "purchased"
            : cancelled
              ? "cancelled"
              : pending
                ? "pending"
                : "error",
        pending: pending || this.state.pending,
        message: cancelled
          ? "구매를 취소했습니다."
          : pending
            ? "결제 승인 대기 중입니다. 승인 후 구매 상태를 확인해주세요."
            : errorText(error),
      });
    } finally {
      this.locked = false;
    }
  };
  restore = async () => {
    if (this.locked || !this.state.initialized || this.client.issue) return;
    this.locked = true;
    this.update({
      status: "restoring",
      message: "스토어 계정의 구매 내역을 복원하고 있습니다.",
    });
    try {
      this.applyInfo(await this.client.restore());
      this.update({
        status: this.status(),
        message:
          this.state.ownership === "owned"
            ? "구매 복원이 완료됐습니다."
            : "이 계정에서 복원할 테스트 구매를 찾지 못했습니다.",
      });
    } catch (error) {
      const cancelled =
        errorCode(error) === "1" ||
        (!!error &&
          typeof error === "object" &&
          "userCancelled" in error &&
          error.userCancelled === true);
      this.update({
        status: cancelled ? "cancelled" : "error",
        message: cancelled ? "구매 복원을 취소했습니다." : errorText(error),
      });
    } finally {
      this.locked = false;
    }
  };
}
