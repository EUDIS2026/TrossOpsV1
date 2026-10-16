# TrossOps Geospatial

An early, runnable slice of the geospatial workstation described in [the implementation brief](docs/briefs/TROSSOPS_GEOSPATIAL_MASTER_IMPLEMENTATION_PROMPT.md). All scenario data is synthetic. Current status: **partial**.

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

Open `http://127.0.0.1:5173`. Select an asset, record a fault, and observe the revision, condition, service consequence, and event history. Select either service, reveal dependencies, scrub revisions, and switch between the online dark map and local grid. Record a repair to restore the service. Data resets when the API process restarts. See [basemap attribution](docs/geospatial/styles.md).

## Checks

```powershell
cd backend
python -m pytest -q
cd ..\frontend
npm.cmd run build
```

See [baseline](docs/geospatial/baseline.md) and [integration matrix](docs/geospatial/integration-matrix.md) for exact boundaries.
