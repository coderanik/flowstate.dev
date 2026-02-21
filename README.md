# FlowState.dev

**Development in progress**

## Code editor (Python, Java, C, C++)

JavaScript runs in the browser. Python, Java, C, and C++ are run via the [Judge0](https://judge0.com) API (default: [Judge0 CE](https://ce.judge0.com)).

- **Default:** No config needed; the server uses `https://ce.judge0.com`. If the public instance requires auth, get a token at [judge0.com/ce](https://judge0.com/ce) and set `JUDGE0_AUTH_TOKEN` in the server `.env`.
- **RapidAPI:** For the Judge0 CE plan on RapidAPI, set `JUDGE0_RAPIDAPI_KEY` and `JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com` (and optionally `JUDGE0_API_URL` to the RapidAPI base URL if different).
- **Self-hosted:** Set `JUDGE0_API_URL` to your Judge0 instance and `JUDGE0_AUTH_TOKEN` if required.
