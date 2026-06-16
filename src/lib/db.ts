import type {
  CollectionReference,
  DocumentData,
  Query,
} from "firebase-admin/firestore";
import { adminDb } from "./firebase-admin";

type WhereConstraint = {
  type: "where";
  fieldPath: string;
  opStr: FirebaseFirestore.WhereFilterOp;
  value: unknown;
};

type OrderByConstraint = {
  type: "orderBy";
  fieldPath: string;
  directionStr?: FirebaseFirestore.OrderByDirection;
};

type LimitConstraint = {
  type: "limit";
  limit: number;
};

type QueryConstraint = WhereConstraint | OrderByConstraint | LimitConstraint;

export function where(
  fieldPath: string,
  opStr: FirebaseFirestore.WhereFilterOp,
  value: unknown
): QueryConstraint {
  return { type: "where", fieldPath, opStr, value };
}

export function orderBy(
  fieldPath: string,
  directionStr?: FirebaseFirestore.OrderByDirection
): QueryConstraint {
  return { type: "orderBy", fieldPath, directionStr };
}

export function limit(limitValue: number): QueryConstraint {
  return { type: "limit", limit: limitValue };
}

function applyConstraints(
  ref: CollectionReference<DocumentData>,
  constraints: QueryConstraint[]
): Query<DocumentData> {
  return constraints.reduce<Query<DocumentData>>((queryRef, constraint) => {
    if (constraint.type === "where") {
      return queryRef.where(
        constraint.fieldPath,
        constraint.opStr,
        constraint.value
      );
    }
    if (constraint.type === "orderBy") {
      return queryRef.orderBy(
        constraint.fieldPath,
        constraint.directionStr
      );
    }
    return queryRef.limit(constraint.limit);
  }, ref);
}

export async function getCollection<T>(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const ref = adminDb.collection(collectionName);
  const snapshot = await applyConstraints(ref, constraints).get();
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as (T & { id: string })[];
}

export async function getDocument<T>(
  collectionName: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const snapshot = await adminDb.collection(collectionName).doc(docId).get();
  if (!snapshot.exists) return null;
  return { id: snapshot.id, ...snapshot.data() } as T & { id: string };
}

export async function createDocument<T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await adminDb.collection(collectionName).add({
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: Partial<DocumentData>
): Promise<void> {
  await adminDb
    .collection(collectionName)
    .doc(docId)
    .update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
}

export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  await adminDb.collection(collectionName).doc(docId).delete();
}
