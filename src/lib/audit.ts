import { db } from "@/db/client";
import { auditLog } from "@/db/schema";
import { newId } from "@/lib/api";

export function audit(
  user: { id: string; name: string },
  action: "create" | "update" | "delete",
  entity: string,
  entityId: string | null,
  summary: string,
) {
  db.insert(auditLog).values({ id: newId("aud"), userId: user.id, userName: user.name, action, entity, entityId, summary }).run();
}
