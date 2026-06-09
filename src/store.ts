import type { ConversationLink } from "./types.js";

/**
 * In-memory mapping between an Instagram user (IGSID) and a Direct Line conversation.
 *
 * IMPORTANT: this store lives in process memory, so the relay must run as a SINGLE
 * replica (the Bicep template pins min = max = 1). A restart drops active-conversation
 * context; the next inbound Instagram message simply starts a fresh conversation.
 *
 * To scale horizontally later, replace this class with a shared store
 * (Azure Cosmos DB, Table Storage, or Redis) behind the same interface.
 */
export class ConversationStore {
  private byIgsid = new Map<string, ConversationLink>();
  private byConversationId = new Map<string, ConversationLink>();

  get(igsid: string): ConversationLink | undefined {
    return this.byIgsid.get(igsid);
  }

  getByConversationId(conversationId: string): ConversationLink | undefined {
    return this.byConversationId.get(conversationId);
  }

  set(link: ConversationLink): void {
    this.byIgsid.set(link.igsid, link);
    this.byConversationId.set(link.conversationId, link);
  }

  all(): ConversationLink[] {
    return Array.from(this.byIgsid.values());
  }

  delete(igsid: string): void {
    const link = this.byIgsid.get(igsid);
    if (link) {
      this.byIgsid.delete(igsid);
      this.byConversationId.delete(link.conversationId);
    }
  }

  size(): number {
    return this.byIgsid.size;
  }
}
