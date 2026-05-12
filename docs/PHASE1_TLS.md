# Phase 1 — TLS + custom domain

Phase 1 takes the Phase 0 EC2 deploy and puts it on `https://your-domain`,
which is the hard prerequisite for WebRTC `getUserMedia` to work in browsers
outside `localhost`.

## What this phase wires up

- **Stable IP.** `infra/ec2/main.tf` allocates an `aws_eip` and associates it
  with the instance. The Elastic IP survives instance replacement, so DNS
  doesn't need to change every time.
- **TLS via Caddy + Let's Encrypt.** `infra/ec2/Caddyfile` uses `{$DOMAIN}`
  as the site host. Caddy obtains and renews certs automatically via
  ACME HTTP-01.
- **Build-time hostname for the web app.** `apps/web/Dockerfile` accepts
  `VITE_API_URL` / `VITE_SIGNALING_URL` as build args; the deploy workflow
  passes `https://${DOMAIN}/api` and `wss://${DOMAIN}/signaling`.
- **CORS allowlist.** `apps/api/src/app.ts` reads `CORS_ORIGINS` (comma-list)
  and rejects everything else.

## One-time setup

### 1. Pick a domain and register it

Cloudflare is the assumed registrar (cheap TLDs, free DNS, free TLS edge,
WAF). Any registrar works as long as you can manage A-records.

### 2. Point DNS at the Elastic IP

```sh
cd infra/ec2
terraform apply
EIP=$(terraform output -raw public_ip)
echo "Set an A-record for your domain to $EIP"
```

In Cloudflare → DNS → Records:

- Type: `A`
- Name: `@` (apex) or whatever subdomain you chose
- IPv4: the EIP
- **Proxy status: Proxied (orange cloud) is fine** — Cloudflare passes ACME
  HTTP-01 challenges through to the origin so Caddy can still get a real
  Let's Encrypt cert.
- TTL: Auto

### 3. Cloudflare SSL settings

Under SSL/TLS → Overview:

- Encryption mode: **Full (strict)**. Cloudflare presents its own cert to
  visitors and connects to the origin over HTTPS using the Let's Encrypt cert
  Caddy issued.

Under SSL/TLS → Edge Certificates:

- Always Use HTTPS: **On**
- Minimum TLS Version: **1.2**

Under Network:

- WebSockets: **On** (required for the signaling service).

> **Cloudflare WebSocket timeout.** On the free plan WebSocket connections
> are held open for up to ~100 seconds of idle time. The signaling protocol
> exchanges messages frequently enough that this is rarely a problem, but if
> beta users report dropped connections add a periodic ping in
> `apps/signaling/src/server.ts` or move signaling to a separate hostname
> with the orange-cloud proxy off.

### 4. Add the new repo secrets

```sh
gh secret set DOMAIN              --body "your-domain.example.com"
gh secret set LETSENCRYPT_EMAIL   --body "you@example.com"   # optional but recommended
```

`LETSENCRYPT_EMAIL` is optional — without it Caddy uses an anonymous Let's
Encrypt account (still works, but you won't get expiry notifications).

### 5. Deploy

Push to `main` (or run the workflow manually). The deploy workflow will:

1. Refuse to start if `DOMAIN` (or any other required secret) is missing.
2. Bake `VITE_API_URL=https://${DOMAIN}/api` and
   `VITE_SIGNALING_URL=wss://${DOMAIN}/signaling` into the web image.
3. Render the Caddyfile against `DOMAIN` on the host.
4. Smoke-test `https://${DOMAIN}/healthz` and `https://${DOMAIN}/api/health`
   (allowing up to 2 minutes for the first cert issuance).

## Verification

After deploy:

1. `curl https://${DOMAIN}/healthz` → `ok`
2. `curl https://${DOMAIN}/api/health` → `{"ok":true}`
3. SSL Labs scan: <https://www.ssllabs.com/ssltest/analyze.html?d=$DOMAIN> — expect grade A.
4. Open the app in two browsers (different networks) → grant camera/mic →
   join the same room → confirm video flows.
5. Check Caddy logs for cert issuance: `sudo docker logs $(sudo docker ps -q -f name=caddy)`.

## Common issues

- **Cert never issues.** Cloudflare proxy is on but the origin isn't
  reachable on port 80. Confirm `infra/ec2/main.tf` SG has 80 open and
  Cloudflare's firewall isn't blocking ACME.
- **Mixed content errors in the browser console.** The web build still has
  an `http://` URL hardcoded somewhere. Search `apps/web/src/` for
  `http://localhost` and replace with the `VITE_API_URL` / `VITE_SIGNALING_URL`
  imports.
- **CORS errors in the browser console.** `CORS_ORIGINS` on the api doesn't
  include the actual origin the browser is sending. Confirm the env var on
  the host: `sudo docker exec $(sudo docker ps -q -f name=api) env | grep CORS`.
- **WebSocket fails to connect.** Cloudflare's "WebSockets" toggle is off, or
  the signaling URL is wrong. Test directly:
  `wscat -c wss://${DOMAIN}/signaling`.
