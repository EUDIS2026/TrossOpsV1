# TrossOps Geospatial

A running, partial geospatial workstation based on [the implementation brief](docs/briefs/TROSSOPS_GEOSPATIAL_MASTER_IMPLEMENTATION_PROMPT.md). Operational assets, routes, areas, and service consequences are synthetic. County boundaries and weather forecasts are public Swedish data, labelled separately from the scenario.

## Local run

Requires Python 3.12 and Node.js. Start the API:

```powershell
python -m pip install -r backend\requirements.txt
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In another terminal, start the UI:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`. Switch between map, terrain, and globe views; turn on SCB county boundaries; inspect timestamped SMHI forecasts for four Swedish cities; and switch between the online dark map and local grid. Select an asset, record a fault, and observe the revision, condition, service consequence, and event history. Scrub revisions and record a repair to restore the service. The local SQLite event store survives API restarts at `backend/data/demo.sqlite` (ignored by Git). Set `TROSSOPS_DB_PATH` before starting the API to use another local path. See [data sources and attribution](docs/geospatial/styles.md).

## Checks

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm.cmd run build
node scripts/verify-local.mjs
```

The browser test uses installed Microsoft Edge and running API/UI servers. See [integration matrix](docs/geospatial/integration-matrix.md) and [verification log](docs/geospatial/verification.md) for exact limits. Hosted persistence and live telemetry are not connected.

## Optional scene analysis

The OpenAI Responses adapter is **adapter-only** until `TROSSOPS_ENABLE_LLM=1`, `OPENAI_API_KEY`, `TROSSOPS_LLM_MODEL`, and `TROSSOPS_LLM_ACCESS_TOKEN` are set on the API server. Enter the access token in the inspector to authorize each analysis request. The token remains in browser memory; the API key stays server-side. A request sends only the selected synthetic service facts at a chosen world revision, sets `store: false`, and labels output as model-generated. This path was tested with mocks and in its disabled state; no paid model call has been made. See [the environment template](.env.example).
