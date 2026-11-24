// What the shared web code expects but React Native's Hermes engine lacks.
// buildDataset / datasetFromPreview give every imported file an id from
// crypto.randomUUID().
import { randomUUID } from 'expo-crypto';

type CryptoLike = { randomUUID?: () => string };
const globalScope = globalThis as { crypto?: CryptoLike };

if (typeof globalScope.crypto?.randomUUID !== 'function') {
  if (globalScope.crypto) {
    Object.defineProperty(globalScope.crypto, 'randomUUID', { value: randomUUID, configurable: true, writable: true });
  } else {
    globalScope.crypto = { randomUUID };
  }
}
