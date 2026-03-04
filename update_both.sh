# Check frontend
cd frontend
git add .
git commit -m "refactor: replace localstorage with secure httponly cookies" || true

# Check backend 
cd ../backend
git add .
git commit -m "feat: implement httponly cookie authentication" || true

cd ..
git push origin main || true

VERCEL_ORG_ID=team_X2f8zsWjkKOsLwvLhc2NSHsw VERCEL_PROJECT_ID=prj_2BCZVNEXtsq5iMBRWEdJfsLRfS8T npx vercel deploy --prod --yes --cwd backend || true
VERCEL_ORG_ID=team_X2f8zsWjkKOsLwvLhc2NSHsw VERCEL_PROJECT_ID=prj_N9v2T1v3U0UHTc6N7I5S9z6z0M2f npx vercel deploy --prod --yes --cwd frontend || true
