# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0da9c39f-4b9d-4b99-ad81-d66bc89fd7b9

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0da9c39f-4b9d-4b99-ad81-d66bc89fd7b9) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment notes

- Use [`/.env.example`](/Users/srinivasp/Downloads/ssinfoverse-final-srini2006orcl/ss-infoverse-group-quiz-with-viewers-websockets/.env.example) as the safe frontend template.
- Only put public browser-safe values in frontend `VITE_*` variables:
  - backend base URLs
  - host product key
  - GA measurement ID
  - brand defaults
- Do not place secrets in frontend `VITE_*` vars.
- Keep private credentials only in the backend orchestrator env:
  - YouTube API keys
  - Google OAuth client secret
  - Telegram bot token
  - Mongo/Redis credentials
  - connector bearer/api-key secrets

## Deployment Notes

### Localhost development frontend

Recommended frontend `.env.development` shape:

```env
VITE_HOST_PRODUCT_KEY=quiz-app
VITE_BACKEND_BASE_URL=http://localhost:50510
VITE_AUTH_BASE_URL=http://localhost:50508
VITE_AUTH_TENANT_ID=default-org
VITE_AUTH_AUDIENCE=orchestrator-host
```

Behavior:
- frontend talks directly to local orchestrator
- no backend target selector is used

### Cloud / production frontend

Recommended frontend `.env.production` shape:

```env
VITE_HOST_PRODUCT_KEY=quiz-app
VITE_BACKEND_BASE_URL=https://orchastrator.quizchampindia.in
VITE_AUTH_BASE_URL=https://auth.quizchampindia.in
VITE_AUTH_TENANT_ID=default-org
VITE_AUTH_AUDIENCE=orchestrator-host
```

Behavior:
- frontend uses one backend origin and one auth origin

### Sample production frontend env

```env
VITE_HOST_PRODUCT_KEY=quiz-app

VITE_BACKEND_BASE_URL=https://orchastrator.quizchampindia.in
VITE_AUTH_BASE_URL=https://auth.quizchampindia.in
VITE_AUTH_TENANT_ID=default-org
VITE_AUTH_AUDIENCE=orchestrator-host

VITE_DEFAULT_BRAND_NAME=YT Live Quiz
VITE_GA_MEASUREMENT_ID=
```

Suggested production browser flow:
- user opens `https://ytlivequiz.thinmonk.co.in`
- frontend talks to `https://orchastrator.quizchampindia.in`
- SSE stays on `https://orchastrator.quizchampindia.in/sse`

### Example domain split

One clean hosted setup is:

```text
https://ytlivequiz.thinmonk.co.in         -> frontend app
https://debatesduck.thinmonk.co.in        -> frontend app
https://orchastrator.quizchampindia.in    -> backend public gateway/Kong edge
```

This keeps:
- apps on their own domains
- backend on one shared domain
- browser CORS policy simple and explicit

### Recommended hosting model

For your current setup, the intended production path is:

```text
Frontend domains -> browser -> https://orchastrator.quizchampindia.in
CloudPanel -> reverse proxy -> http://127.0.0.1:3200
GatewayService -> internal backend services
```

Kong is not required for this deployment model.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0da9c39f-4b9d-4b99-ad81-d66bc89fd7b9) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
