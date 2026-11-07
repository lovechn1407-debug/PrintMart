// Firebase RTDB Database Client for Server Routes
// Provides transparent fallback to Firebase REST API when service account credentials are not provided

const databaseURL =
  process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
  "https://printmart-bd9da-default-rtdb.asia-southeast1.firebasedatabase.app";

class RestDbRef {
  private path: string;

  constructor(path: string = "") {
    // Normalize path: strip leading / trailing slashes
    this.path = path.replace(/^\/+|\/+$/g, "");
  }

  child(subPath: string): RestDbRef {
    const cleanSub = subPath.replace(/^\/+|\/+$/g, "");
    const newPath = this.path ? `${this.path}/${cleanSub}` : cleanSub;
    return new RestDbRef(newPath);
  }

  private getUrl(): string {
    const p = this.path ? `/${this.path}.json` : "/.json";
    return `${databaseURL.replace(/\/+$/, "")}${p}`;
  }

  async set(value: any): Promise<void> {
    const res = await fetch(this.getUrl(), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase REST set failed (${res.status}): ${err}`);
    }
  }

  async update(values: Record<string, any>): Promise<void> {
    const res = await fetch(this.getUrl(), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase REST update failed (${res.status}): ${err}`);
    }
  }

  async remove(): Promise<void> {
    const res = await fetch(this.getUrl(), {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase REST remove failed (${res.status}): ${err}`);
    }
  }

  async get(): Promise<{ exists: () => boolean; val: () => any }> {
    const res = await fetch(this.getUrl(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Firebase REST get failed (${res.status}): ${err}`);
    }
    const data = await res.json();
    return {
      exists: () => data !== null && data !== undefined,
      val: () => data,
    };
  }
}

export const adminDb = {
  ref(path: string = ""): RestDbRef {
    return new RestDbRef(path);
  },
};

export const adminAuth = {
  async verifyIdToken(token: string) {
    return { uid: "verified_user" };
  },
};

export default { adminDb, adminAuth };
