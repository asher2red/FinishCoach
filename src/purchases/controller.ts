import { message as msg, LocalizedError, type AppMessage } from "../i18n/core";
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
  issue: AppMessage | null;
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
  message: AppMessage;
}
function errorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : "";
}
function errorText(error: unknown): AppMessage {
  if (error instanceof LocalizedError) return error.descriptor;
  const code = errorCode(error);
  if (code === "10" || code === "35")
    return msg(
      "purchases.unable.to.connect.your.last.verified.purchase.status.has",
    );
  if (code === "6")
    return msg("purchases.this.item.is.already.owned.in.the.store.restore");
  if (["11", "23", "5"].includes(code))
    return msg(
      "purchases.check.the.revenuecat.key.offering.product.and.store.test",
    );
  if (error instanceof Error && error.name === "PurchaseConfigurationError")
    return error.message;
  return msg(
    "purchases.unable.to.process.purchase.information.check.your.connection.and",
  );
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
      message:
        client.issue ??
        msg("purchases.loading.the.store.product.and.purchase.status"),
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
      message: msg("purchases.checking.the.store.product.and.purchase.status"),
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
                  ? msg("purchases.your.test.purchase.has.been.verified")
                  : msg("purchases.your.purchase.status.is.up.to.date"),
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
            ? msg(
                "purchases.your.purchase.has.been.verified.existing.app.features.are",
              )
            : this.state.pending
              ? msg(
                  "purchases.awaiting.payment.approval.the.purchase.will.not.be.marked",
                )
              : msg("purchases.you.can.test.a.purchase.at.the.price.returned"),
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
      message: msg("purchases.continue.in.the.store.payment.sheet"),
    });
    try {
      this.applyInfo(await this.client.info());
      if (this.state.ownership !== "owned")
        this.applyInfo(await this.client.purchase());
      if (this.state.ownership === "owned")
        this.update({
          status: "purchased",
          message: msg(
            "purchases.your.test.purchase.has.been.verified.existing.app.features",
          ),
        });
      else
        this.update({
          status: "pending",
          pending: true,
          message: msg(
            "purchases.the.transaction.was.received.but.access.is.awaiting.verification",
          ),
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
          ? msg("purchases.purchase.cancelled")
          : pending
            ? msg(
                "purchases.awaiting.payment.approval.check.your.purchase.status.after.approval",
              )
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
      message: msg("purchases.restoring.purchases.from.your.store.account"),
    });
    try {
      this.applyInfo(await this.client.restore());
      this.update({
        status: this.status(),
        message:
          this.state.ownership === "owned"
            ? msg("purchases.purchases.restored")
            : msg("purchases.no.test.purchase.was.found.to.restore.for.this"),
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
        message: cancelled
          ? msg("purchases.purchase.restoration.cancelled")
          : errorText(error),
      });
    } finally {
      this.locked = false;
    }
  };
}
