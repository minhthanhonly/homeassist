import { db } from "@/lib/firebase";
import { AppConfig } from "@/types/firestore";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const APP_CONFIG_PATH = "appConfig/global";

export const defaultAppConfig: AppConfig = {
  nextMemberIndex: 0,
  memberOrder: [],
};

export function appConfigRef() {
  return doc(db, APP_CONFIG_PATH);
}

export async function ensureAppConfigInitialized(): Promise<void> {
  await setDoc(appConfigRef(), defaultAppConfig, { merge: true });
}

export function subscribeAppConfig(onData: (value: AppConfig) => void): () => void {
  return onSnapshot(appConfigRef(), (snapshot) => {
    if (!snapshot.exists()) {
      onData(defaultAppConfig);
      return;
    }

    const data = snapshot.data() as Partial<AppConfig>;
    onData({
      nextMemberIndex: data.nextMemberIndex ?? 0,
      memberOrder: data.memberOrder ?? [],
    });
  });
}
