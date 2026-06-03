type EventHandler<Data> = (data: Data) => void;

/** 依事件名稱分派的輕量型別安全事件匯流排
 *
 * 對外的 on/off/emit 都有型別保護；transport 層收到原始訊息時用 emitRaw 分派。
 */
export class TypedEmitter<EventMap> {
  private handlerMap = new Map<keyof EventMap, Set<EventHandler<unknown>>>();

  on<Event extends keyof EventMap>(event: Event, handler: EventHandler<EventMap[Event]>) {
    const handlerSet = this.handlerMap.get(event) ?? new Set<EventHandler<unknown>>();
    handlerSet.add(handler as EventHandler<unknown>);
    this.handlerMap.set(event, handlerSet);
  }

  off<Event extends keyof EventMap>(event: Event, handler: EventHandler<EventMap[Event]>) {
    this.handlerMap.get(event)?.delete(handler as EventHandler<unknown>);
  }

  emit<Event extends keyof EventMap>(event: Event, data: EventMap[Event]) {
    this.handlerMap.get(event)?.forEach((handler) => handler(data));
  }

  /** 供 transport 層分派的入口，事件名稱與資料皆為執行期得知 */
  emitRaw(event: string, data: unknown) {
    this.handlerMap.get(event as keyof EventMap)?.forEach((handler) => handler(data));
  }

  clear() {
    this.handlerMap.clear();
  }
}
