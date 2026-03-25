# Database Migration Procedure: Neon to Hostinger VPS

This guide outlines the steps to migrate your PostgreSQL database from Neon (Serverless) to a Hostinger VPS (Self-hosted).

## 1. Prerequisites
- SSH access to your Hostinger VPS.
- PostgreSQL installed on the VPS.
- `pg_dump` installed on your local machine (part of postgresql-client).
- Connection details for both Neon and Hostinger databases.

## 2. Infrastructure Setup (Hostinger VPS)
If PostgreSQL is not yet installed or configured on your Hostinger VPS:

1. **Install PostgreSQL**:
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   ```
2. **Start & Enable Service**:
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```
3. **Configure Remote Access** (Optional, for direct Prisma connection):
   - Edit `/etc/postgresql/XX/main/postgresql.conf`:
     - Change `listen_addresses = 'localhost'` to `listen_addresses = '*'`
   - Edit `/etc/postgresql/XX/main/pg_hba.conf`:
     - Add `host all all 0.0.0.0/0 md5` (or restrict to your application IP).
   - Reload: `sudo systemctl restart postgresql`.

## 3. Creating the New Database
Connect to your VPS database:
```bash
sudo -u postgres psql
```
Execute the following commands:
```sql
CREATE DATABASE your_real_db;
CREATE USER your_real_user WITH PASSWORD 'Tectra@123';
GRANT ALL PRIVILEGES ON DATABASE your_real_db TO your_real_user;
ALTER DATABASE your_real_db OWNER TO your_real_user;
```

## 4. Data Migration (Optional: Existing Data)
If you want to move existing data from Neon:
1. **Export from Neon**:
   ```bash
   pg_dump "NEON_DATABASE_URL" > neon_backup.sql
   ```
2. **Import to Hostinger**:
   ```bash
   psql "postgresql://your_real_user:Tectra%40123@HOSTINGER_IP:5432/your_real_db" < neon_backup.sql
   ```

## 5. Application Configuration
Update your `.env` file in the backend:

```env
DATABASE_URL="postgresql://your_real_user:Tectra%40123@127.0.0.1:5432/your_real_db"
```
*(Note: Use 127.0.0.1 if the application is running on the same VPS, otherwise use the VPS IP or an SSH tunnel).*

## 6. Prisma Migration & Seeding
1. **Initialize Migration**:
   ```bash
   npx prisma migrate dev --name init_on_hostinger
   ```
2. **Seed the Database**:
   ```bash
   npm run seed
   ```

## 7. Troubleshooting
- **Connection Refused**: Check if PostgreSQL is listening on port 5432 and if the VPS firewall allows it.
- **Authentication Failed**: Verify the user/password/dbname in the connection string.
- **Prisma Schema Drift**: Ensure your local `schema.prisma` matches the database state.
