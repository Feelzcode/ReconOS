# Deployment

## Render

`render.yaml` defines two Docker services:

| Service | Root directory |
|---------|----------------|
| `reconos-api` | `ReconOs_Backend2/reconos-backend` |
| `reconos-web` | `ReconOs_Frontend2/reconos-frontend` |

### Steps

1. Push repo to GitHub
2. Render → **New Blueprint** → connect repo
3. Set secret env vars in Render dashboard
4. `FRONTEND_URL` → web service URL
5. `NEXT_PUBLIC_API_URL` → `https://<api-host>/api`
6. Nomba webhook: `https://<api-host>/api/webhooks/nomba`

### Production flags

- `USE_MOCK_NOMBA=false`
- `DEMO_MODE_ENABLED=false`

Never commit `.env` files.
