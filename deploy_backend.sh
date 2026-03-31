cd backend
npx vercel env rm SMTP_HOST production --yes || true
printf 'smtp.gmail.com' | npx vercel env add SMTP_HOST production || true

npx vercel env rm SMTP_PORT production --yes || true
printf '587' | npx vercel env add SMTP_PORT production || true

npx vercel env rm SMTP_USER production --yes || true
printf 'personalakash23@gmail.com' | npx vercel env add SMTP_USER production || true

npx vercel env rm SMTP_PASS production --yes || true
printf 'cxyu kaih mpdx ricq' | npx vercel env add SMTP_PASS production || true

npx vercel env rm SMTP_FROM production --yes || true
printf 'noreply@tectratech.com' | npx vercel env add SMTP_FROM production || true

npx vercel env rm JWT_SECRET production --yes || true
printf 'tectra-attendance-super-secret-key' | npx vercel env add JWT_SECRET production || true

npx vercel env rm JWT_REFRESH_SECRET production --yes || true
printf 'tectra-attendance-refresh-token-super-secret' | npx vercel env add JWT_REFRESH_SECRET production || true

npx vercel env rm FRONTEND_URL production --yes || true
printf 'https://hrms.tectratechnologies.com' | npx vercel env add FRONTEND_URL production || true

cd ..
VERCEL_ORG_ID=team_X2f8zsWjkKOsLwvLhc2NSHsw VERCEL_PROJECT_ID=prj_2BCZVNEXtsq5iMBRWEdJfsLRfS8T npx vercel deploy --prod --yes
