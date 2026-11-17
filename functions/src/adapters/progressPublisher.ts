// 진행률을 Firestore renderJobs/{jobId}에 복사한다. 브라우저가 이 문서를 구독한다.
// 작업 상태의 기준은 Supabase render_jobs이고, 여기에는 status와 progress만 둔다.
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { JobStatus } from "../types";

export interface ProgressPublisher {
  publish(jobId: string, status: JobStatus, progress: number): Promise<void>;
}

export class FirestoreProgressPublisher implements ProgressPublisher {
  async publish(jobId: string, status: JobStatus, progress: number): Promise<void> {
    if (getApps().length === 0) initializeApp();
    await getFirestore().doc(`renderJobs/${jobId}`).set({ status, progress }, { merge: true });
  }
}

export class FakeProgressPublisher implements ProgressPublisher {
  readonly published: Array<{ jobId: string; status: JobStatus; progress: number }> = [];

  async publish(jobId: string, status: JobStatus, progress: number): Promise<void> {
    this.published.push({ jobId, status, progress });
  }
}
