import { getFirebaseAdminApp } from "./firebaseAdmin";
import { FirebaseSdkNotInstalledError, isMissingModuleError } from "./firebase";
import {
  buildDocumentStoragePath,
  type DocumentStorageProvider,
  type DocumentUploadRequest,
  type StoredDocument,
} from "./storage";
import type { RepositoryActor } from "./repositories";

const firebaseAdminStorageModuleName = "firebase-admin/storage";
const signedUrlDurationMs = 10 * 60 * 1000;

type FirebaseStorageFile = {
  delete: () => Promise<unknown>;
  getMetadata: () => Promise<[Record<string, unknown>]>;
  getSignedUrl: (config: {
    action: "read" | "write";
    contentType?: string;
    expires: number;
    version: "v4";
  }) => Promise<[string]>;
  save: (
    data: Buffer,
    options?: {
      metadata?: {
        contentType?: string;
        metadata?: Record<string, string>;
      };
      resumable?: boolean;
    },
  ) => Promise<unknown>;
};

type FirebaseStorageBucket = {
  file: (path: string) => FirebaseStorageFile;
};

type FirebaseStorageService = {
  bucket: () => FirebaseStorageBucket;
};

type FirebaseAdminStorageModule = {
  getStorage: (app: unknown) => FirebaseStorageService;
};

async function loadFirebaseAdminStorageModule() {
  try {
    return (await import(
      firebaseAdminStorageModuleName
    )) as FirebaseAdminStorageModule;
  } catch (error) {
    if (isMissingModuleError(error)) {
      return null;
    }

    throw error;
  }
}

async function getStorageBucket() {
  const app = await getFirebaseAdminApp();
  const firebaseStorage = await loadFirebaseAdminStorageModule();

  if (!app || !firebaseStorage) {
    return null;
  }

  return firebaseStorage.getStorage(app).bucket();
}

function getStringMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  return typeof value === "string" ? value : undefined;
}

function getNumberMetadataValue(
  metadata: Record<string, unknown>,
  key: string,
) {
  const value = metadata[key];

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return 0;
}

export class FirebaseDocumentStorageAdapter implements DocumentStorageProvider {
  async createUploadUrl(request: DocumentUploadRequest, actor: RepositoryActor) {
    void actor;
    const bucket = await getStorageBucket();

    if (!bucket) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    const storagePath = buildDocumentStoragePath(
      request.target,
      request.originalFileName,
    );
    const expiresAt = Date.now() + signedUrlDurationMs;
    const [uploadUrl] = await bucket.file(storagePath).getSignedUrl({
      action: "write",
      contentType: request.contentType,
      expires: expiresAt,
      version: "v4",
    });

    return {
      expiresAt: new Date(expiresAt).toISOString(),
      headers: {
        "Content-Type": request.contentType,
      },
      storagePath,
      uploadUrl,
    };
  }

  async confirmUpload(
    storagePath: string,
    actor: RepositoryActor,
  ): Promise<StoredDocument> {
    void actor;
    const bucket = await getStorageBucket();

    if (!bucket) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    const [metadata] = await bucket.file(storagePath).getMetadata();

    return {
      contentLength: getNumberMetadataValue(metadata, "size"),
      contentType:
        getStringMetadataValue(metadata, "contentType") ??
        "application/octet-stream",
      originalFileName:
        getStringMetadataValue(metadata, "name") ?? storagePath.split("/").at(-1) ?? "",
      storagePath,
      uploadedAt:
        getStringMetadataValue(metadata, "timeCreated") ??
        new Date().toISOString(),
    };
  }

  async createDownloadUrl(storagePath: string, actor: RepositoryActor) {
    void actor;
    const bucket = await getStorageBucket();

    if (!bucket) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    const expiresAt = Date.now() + signedUrlDurationMs;
    const [downloadUrl] = await bucket.file(storagePath).getSignedUrl({
      action: "read",
      expires: expiresAt,
      version: "v4",
    });

    return downloadUrl;
  }

  async deleteDocument(storagePath: string, actor: RepositoryActor) {
    void actor;
    const bucket = await getStorageBucket();

    if (!bucket) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    await bucket.file(storagePath).delete();
  }

  async uploadDocument(
    request: DocumentUploadRequest & { data: Buffer },
    actor: RepositoryActor,
  ): Promise<StoredDocument> {
    void actor;
    const bucket = await getStorageBucket();

    if (!bucket) {
      throw new FirebaseSdkNotInstalledError("firebase-admin");
    }

    const storagePath = buildDocumentStoragePath(
      request.target,
      request.originalFileName,
    );
    const uploadedAt = new Date().toISOString();

    await bucket.file(storagePath).save(request.data, {
      metadata: {
        contentType: request.contentType,
        metadata: {
          originalFileName: request.originalFileName,
          uploadedAt,
        },
      },
      resumable: false,
    });

    return {
      contentLength: request.contentLength,
      contentType: request.contentType,
      originalFileName: request.originalFileName,
      storagePath,
      uploadedAt,
    };
  }
}
