# Remove bad env vars
npx vercel env rm NEXT_PUBLIC_API_URL production --yes || true
npx vercel env rm NEXT_PUBLIC_SOCKET_URL production --yes || true

# Add with correct format
printf 'https://backend-delta-eight-49.vercel.app/api' | npx vercel env add NEXT_PUBLIC_API_URL production || true
printf 'https://backend-delta-eight-49.vercel.app' | npx vercel env add NEXT_PUBLIC_SOCKET_URL production || true

# Commit to trigger Git action
git commit --allow-empty -m "fix: correct malformed NEXT_PUBLIC_API_URL in production env" || true
git push origin main || true

# Also deploy directly using vercel
VERCEL_ORG_ID=team_X2f8zsWjkKOsLwvLhc2NSHsw VERCEL_PROJECT_ID=prj_N9v2T1v3U0UHTc6N7I5S9z6z0M2f npx vercel deploy --prod --yes || true
