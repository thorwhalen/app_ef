/**
 * The user's OpenAI API key — shared storage location and request header.
 *
 * app_ef is **bring-your-own-key**: the deployed backend holds no OpenAI key.
 * The user pastes their own key into the assistant panel; it lives only in this
 * browser's `localStorage`. The assistant engine uses it for the chat model,
 * and the API client sends it — opt-in, as the `X-OpenAI-Key` request header on
 * `createCorpus` — so the backend can build an OpenAI embedder for that corpus.
 *
 * These two constants live here, apart from both the assistant engine and the
 * API client, so the two modules share one source of truth without importing
 * each other.
 */

/** The `localStorage` key under which the user's OpenAI API key is stored. */
export const OPENAI_KEY_STORAGE = 'app_ef.openai_api_key';

/**
 * The HTTP request header carrying the user's OpenAI key to the backend.
 * Mirrors `OPENAI_KEY_HEADER` in `backend/app/main.py`; being header-mapped,
 * the key never enters a JSON request body or the OpenAPI schema.
 */
export const OPENAI_KEY_HEADER = 'X-OpenAI-Key';
