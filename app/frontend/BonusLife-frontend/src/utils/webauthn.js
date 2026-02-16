/** Serialize PublicKeyCredential for sending to server (base64url encode ArrayBuffers). */
export function credentialToJson(credential) {
  const o = {
    id: credential.id,
    rawId: bufferToBase64Url(credential.rawId),
    type: credential.type,
    response: {},
  };
  const r = credential.response;
  o.response.clientDataJSON = bufferToBase64Url(r.clientDataJSON);
  if (r.authenticatorData) o.response.authenticatorData = bufferToBase64Url(r.authenticatorData);
  if (r.signature) o.response.signature = bufferToBase64Url(r.signature);
  if (r.userHandle) o.response.userHandle = bufferToBase64Url(r.userHandle);
  if (r.attestationObject) o.response.attestationObject = bufferToBase64Url(r.attestationObject);
  return o;
}

function bufferToBase64Url(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Parse server registration options (base64url) into form expected by credentials.create. */
export function parseCreationOptions(json) {
  if (typeof PublicKeyCredential !== 'undefined' && PublicKeyCredential.parseCreationOptionsFromJSON) {
    return PublicKeyCredential.parseCreationOptionsFromJSON(json);
  }
  return parseCreationOptionsFallback(json);
}

/** Turn bytes (array of 0–255) from backend into base64url string if needed. */
function toBase64UrlString(value) {
  if (value == null) return value;
  if (typeof value === 'string') return value;
  if (Array.isArray(value) || (typeof Uint8Array !== 'undefined' && value instanceof Uint8Array)) {
    const bytes = Array.isArray(value) ? new Uint8Array(value) : new Uint8Array(value);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return value;
}

/**
 * Backend (Python webauthn) may return snake_case and/or bytes as arrays. Normalize to a single
 * shape and always use our fallback (browser's parseRequestOptionsFromJSON is too strict).
 */
function normalizeRequestOptionsJSON(json) {
  if (!json || typeof json !== 'object') return json;
  const o = {};
  const rawChallenge = json.challenge;
  if (rawChallenge != null) o.challenge = toBase64UrlString(rawChallenge);
  const rpId = json.rpId ?? json.rp_id;
  if (rpId != null) o.rpId = rpId;
  if (json.timeout != null) o.timeout = json.timeout;
  const uv = json.userVerification ?? json.user_verification;
  if (uv != null) o.userVerification = uv;
  const allow = json.allowCredentials ?? json.allow_credentials;
  if (Array.isArray(allow) && allow.length > 0) {
    o.allowCredentials = allow.map((c) => {
      const id = c.id != null ? toBase64UrlString(c.id) : undefined;
      const cred = { type: c.type ?? 'public-key', id };
      if (c.transports != null) cred.transports = c.transports;
      return cred;
    });
  }
  return o;
}

/** Parse server auth options into form expected by credentials.get. Uses fallback only (browser native parser is strict). */
export function parseRequestOptions(json) {
  // Backend (Python webauthn options_to_json) may return options as a JSON string
  const parsed = typeof json === 'string' ? JSON.parse(json) : json;
  const normalized = normalizeRequestOptionsJSON(parsed);
  return parseRequestOptionsFallback(normalized);
}

function base64UrlToBuffer(s) {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function parseCreationOptionsFallback(json) {
  const o = { ...json };
  if (o.challenge) o.challenge = base64UrlToBuffer(o.challenge);
  if (o.user && o.user.id) o.user = { ...o.user, id: base64UrlToBuffer(o.user.id) };
  if (Array.isArray(o.excludeCredentials))
    o.excludeCredentials = o.excludeCredentials.map((c) => ({ ...c, id: base64UrlToBuffer(c.id) }));
  return o;
}

function parseRequestOptionsFallback(json) {
  const o = { ...json };
  if (o.challenge) o.challenge = base64UrlToBuffer(o.challenge);
  if (Array.isArray(o.allowCredentials))
    o.allowCredentials = o.allowCredentials.map((c) => ({ ...c, id: base64UrlToBuffer(c.id) }));
  return o;
}
