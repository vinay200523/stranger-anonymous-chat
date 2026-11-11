# Stranger — anonymous text and video chat

A small, experimental one-to-one stranger chat MVP built with React, Vite, Express, Socket.IO and WebRTC.

## Features
- Random one-to-one text or video matching
- Real-time text messages
- WebRTC video/audio signaling
- Next stranger and report/disconnect controls
- Responsive dark interface

## Run locally
Requirements: Node.js 18+

```bash
npm install
npm run dev
```

Open the Vite URL printed by the client (usually http://localhost:5173). The signaling server runs on port 3001.

## Deployment
Deploy the Node server and frontend together on a Node host that supports WebSockets. Set `PORT` as provided by the host. If frontend and server are deployed separately, set `VITE_SERVER_URL` to the signaling server's HTTPS origin and configure CORS appropriately.

## Important limitations before public launch
This is an MVP, not a production-ready public service. The included STUN-only WebRTC setup may fail on restrictive networks; production video chat should use a TURN service. Before opening it to the public, add stronger abuse prevention, report review/moderation, rate limits, age-appropriate safeguards, privacy/retention policies, and operational monitoring. Do not treat the in-app report button as a complete moderation system.
