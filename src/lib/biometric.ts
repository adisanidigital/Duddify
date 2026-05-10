/**
 * Biometric (WebAuthn) helpers — implements an on-device app lock that uses
 * Face ID / Touch ID on iOS Safari and fingerprint / face unlock on Android.
 *
 * No server is required: we use WebAuthn in "platform authenticator + discoverable
 * credential" mode, store the credential ID in localStorage, and use a stable
 * random user handle that we also persist locally. The OS handles the biometric
 * challenge — we never see the biometric data.
 *
 * Requirements / caveats:
 *  - Page must be served over HTTPS (or localhost).
 *  - On iOS, the user must add the PWA to the Home Screen and have Face ID /
 *    Touch ID enrolled. iOS 16+ supports passkeys.
 *  - The credential is bound to this device — clearing browser data removes it.
 */

const STORAGE_CRED_ID = "duddify.biometric.cred-id";
const STORAGE_USER_HANDLE = "duddify.biometric.user-handle";
const STORAGE_USER_LABEL = "duddify.biometric.user-label";
const STORAGE_ENABLED = "duddify.biometric.enabled";

/** True when the lock is enabled in this browser. */
export function isBiometricEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(STORAGE_ENABLED) === "true" &&
      !!localStorage.getItem(STORAGE_CRED_ID)
    );
  } catch {
    return false;
  }
}

/** Quick capability check — does this browser/device support platform authenticators? */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("credentials" in navigator) || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const a = new Uint8Array(new ArrayBuffer(length));
  crypto.getRandomValues(a);
  return a;
}

/**
 * Register a new platform credential (passkey) for this user / device. This is
 * the step that triggers Face ID / Touch ID enrollment. Throws on cancel.
 */
export async function registerBiometric(label: string): Promise<void> {
  if (!(await isBiometricAvailable())) {
    throw new Error("This device does not support biometric authentication.");
  }

  // Persistent, random user handle so subsequent registrations on the same
  // device replace cleanly.
  let handleB64 = localStorage.getItem(STORAGE_USER_HANDLE);
  if (!handleB64) {
    const handleBytes = randomBytes(16);
    handleB64 = bufferToBase64Url(handleBytes.buffer);
    localStorage.setItem(STORAGE_USER_HANDLE, handleB64);
  }
  const userHandle = base64UrlToBuffer(handleB64);

  const challenge = randomBytes(32);
  const rpId = window.location.hostname;

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge,
    rp: {
      name: "Duddify",
      id: rpId,
    },
    user: {
      id: userHandle,
      name: label || "you@duddify",
      displayName: label || "Duddify user",
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 }, // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
    },
    timeout: 60_000,
    attestation: "none",
  };

  const cred = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!cred) throw new Error("Registration cancelled.");

  const credIdB64 = bufferToBase64Url(cred.rawId);
  localStorage.setItem(STORAGE_CRED_ID, credIdB64);
  localStorage.setItem(STORAGE_USER_LABEL, label);
  localStorage.setItem(STORAGE_ENABLED, "true");
}

/**
 * Prompt the user to verify with biometrics. Resolves on success, rejects on
 * cancel or error.
 */
export async function verifyBiometric(): Promise<void> {
  const credIdB64 = localStorage.getItem(STORAGE_CRED_ID);
  if (!credIdB64) throw new Error("No biometric credential registered.");

  const challenge = randomBytes(32);
  const rpId = window.location.hostname;

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge,
    rpId,
    allowCredentials: [
      {
        type: "public-key",
        id: base64UrlToBuffer(credIdB64),
        transports: ["internal"],
      },
    ],
    userVerification: "required",
    timeout: 60_000,
  };

  const assertion = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null;

  if (!assertion) throw new Error("Verification cancelled.");
  // We do not validate the signature server-side. The OS already required
  // userVerification (Face ID / Touch ID / PIN) before producing this assertion,
  // so success here is a sufficient on-device gate.
}

/** Disable the lock and remove the credential pointer from this browser. */
export function disableBiometric(): void {
  try {
    localStorage.setItem(STORAGE_ENABLED, "false");
    localStorage.removeItem(STORAGE_CRED_ID);
    localStorage.removeItem(STORAGE_USER_LABEL);
    // user handle is intentionally kept so re-registering replaces cleanly
  } catch {}
}

export function getBiometricLabel(): string | null {
  try {
    return localStorage.getItem(STORAGE_USER_LABEL);
  } catch {
    return null;
  }
}
