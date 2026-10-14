# Ticket Frontend

React application for QA Software. Shared UI components are in `src/components`,
route-level pages are in `src/pages`, and shared application styles are in
`src/styles`.

## Development

```powershell
npm install
npm run dev
```

The frontend expects the Express API at `http://localhost:5000`. Start the API
from the sibling `ticket-backend` directory.

## Validation

```powershell
npm run lint
npm run build
```
