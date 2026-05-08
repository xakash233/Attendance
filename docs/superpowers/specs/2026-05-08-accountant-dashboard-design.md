# Accountant Role and Dashboard Design

## Goal

Introduce a production-grade `ACCOUNTANT` role and dedicated accountant module for the existing HRMS, including:

- enterprise dashboard UI
- attendance and payroll analytics
- salary processing workflows
- statutory deductions
- exports and payslip downloads
- strict permission boundaries

This design assumes:

- dedicated frontend route: `dashboard/accountant`
- real backend API integration
- full payroll schema expansion with Prisma migration

## Scope

### In Scope

- Add `ACCOUNTANT` role across backend and frontend auth/guards
- Dedicated accountant dashboard route and sidebar module
- Attendance + payroll KPI analytics
- Salary run processing pipeline
- Advances, loans, reimbursements, incentives
- PF/ESI/Tax computation snapshots
- Payslip generation metadata and download endpoints
- Attendance/payroll export APIs (Excel/PDF)
- Permission controls:
  - accountant can process payroll and financial HR ops
  - accountant cannot modify HR admin settings
  - accountant cannot delete employee records

### Out of Scope

- Deep bank API integration (only transfer lifecycle and status tracking in this phase)
- Replacing existing HR/Admin dashboards
- Historical backfill for all past months beyond migration baseline

## Architecture Decision

Selected approach: **Domain-Driven Accountant Module**.

Reason:

- clean bounded context for payroll and finance logic
- avoids overloading attendance or generic HR controllers
- supports scaling to enterprise-level payroll workflows
- improves testability and role-based hardening

## Data Model Design (Prisma)

## Existing Role Update

- Extend `Role` enum:
  - add `ACCOUNTANT`

## New Models

### PayrollRun

Represents one monthly payroll cycle.

Core fields:

- `id`
- `month`
- `year`
- `status` (`DRAFT`, `PROCESSING`, `PENDING_APPROVAL`, `APPROVED`, `DISBURSED`)
- totals (`grossTotal`, `deductionTotal`, `netTotal`)
- `createdById`
- `approvedById`
- `createdAt`, `updatedAt`, `processedAt`, `approvedAt`, `disbursedAt`

Constraints/Indexes:

- unique `(month, year)`
- index on `status`

### PayrollItem

Per-employee payroll snapshot for one run.

Core fields:

- `id`
- `payrollRunId`
- `userId`
- `departmentId` (snapshot/reference)
- attendance snapshots:
  - `payableDays`
  - `presentDays`
  - `absentDays`
  - `leaveDays`
  - `lateCount`
  - `halfDays`
  - `overtimeHours`
- salary computation snapshots:
  - `baseSalary`
  - `attendanceAdjustedSalary`
  - `overtimePay`
  - `bonusAmount`
  - `reimbursementAmount`
  - `advanceDeduction`
  - `loanDeduction`
  - `statutoryDeduction`
  - `otherDeduction`
  - `grossPay`
  - `netPay`
- `salaryStatus` (`PENDING`, `PROCESSED`, `APPROVED`, `PAID`)

Constraints/Indexes:

- unique `(payrollRunId, userId)`
- index on `departmentId`
- index on `salaryStatus`

### StatutoryDeduction

Breakdown for statutory components linked to `PayrollItem`.

Core fields:

- `id`
- `payrollItemId` (unique)
- `pfEmployee`
- `pfEmployer`
- `esiEmployee`
- `esiEmployer`
- `professionalTax`
- `tds`
- `totalStatutory`

### EmployeeAdvance

Tracks employee advances and repayment state.

Core fields:

- `id`
- `userId`
- `principalAmount`
- `outstandingAmount`
- `monthlyDeduction`
- `status` (`ACTIVE`, `CLOSED`, `ON_HOLD`)
- `startMonth`, `startYear`

Indexes:

- `(userId, status)`

### LoanDeduction

Tracks structured loan installment deductions.

Core fields:

- `id`
- `userId`
- `loanAmount`
- `installmentAmount`
- `remainingInstallments`
- `outstandingAmount`
- `status` (`ACTIVE`, `CLOSED`, `DEFAULTED`)

Indexes:

- `(userId, status)`

### ReimbursementClaim

Expense and reimbursement workflow entity.

Core fields:

- `id`
- `userId`
- `category`
- `amount`
- `description`
- `proofUrl`
- `status` (`PENDING`, `APPROVED`, `REJECTED`, `PAID`)
- `approvedById`
- `approvedAt`
- `paidAt`

Indexes:

- `(status, createdAt)`
- `(userId, status)`

### BonusIncentive

Additional earnings outside base salary.

Core fields:

- `id`
- `userId`
- `payrollRunId` (nullable until linked)
- `type` (`BONUS`, `INCENTIVE`, `ADJUSTMENT`)
- `amount`
- `reason`
- `effectiveMonth`, `effectiveYear`
- `status` (`PENDING`, `APPLIED`, `REJECTED`)

### PayrollApproval

Approval audit history for payroll run transitions.

Core fields:

- `id`
- `payrollRunId`
- `action` (`SUBMITTED`, `APPROVED`, `REJECTED`, `ROLLED_BACK`)
- `actorUserId`
- `comments`
- `createdAt`

Indexes:

- `(payrollRunId, createdAt)`

### BankTransferBatch

Disbursement batch tracking for payroll transfers.

Core fields:

- `id`
- `payrollRunId`
- `batchReference`
- `status` (`INITIATED`, `IN_PROGRESS`, `PARTIAL_FAILED`, `SUCCESS`, `FAILED`)
- `processedCount`
- `failedCount`
- `failureReason`
- `initiatedById`
- `initiatedAt`
- `completedAt`

Indexes:

- `(payrollRunId, status)`

### Payslip

Immutable payslip artifact metadata.

Core fields:

- `id`
- `payrollItemId`
- `userId`
- `month`
- `year`
- `fileUrl`
- `generatedAt`
- `downloadCount`

Constraints/Indexes:

- unique `(userId, month, year)`
- index `(payrollItemId)`

## Relationships

- `User (1) -> PayrollItem (N)`
- `PayrollRun (1) -> PayrollItem (N)`
- `PayrollItem (1) -> StatutoryDeduction (1)`
- `User (1) -> EmployeeAdvance (N)`
- `User (1) -> LoanDeduction (N)`
- `User (1) -> ReimbursementClaim (N)`
- `User (1) -> BonusIncentive (N)`
- `PayrollRun (1) -> PayrollApproval (N)`
- `PayrollRun (1) -> BankTransferBatch (N)`
- `PayrollItem (1) -> Payslip (1)`

## Backend API Contract

Base prefix: `/accountant`

### Dashboard and Analytics

- `GET /accountant/dashboard`
  - KPIs and chart-ready series

### Attendance Tables and Reports

- `GET /accountant/attendance/table`
- `GET /accountant/attendance/reports/daily`
- `GET /accountant/attendance/reports/monthly`
- `GET /accountant/attendance/reports/department-wise`

### Payroll Processing

- `GET /accountant/payroll/runs`
- `POST /accountant/payroll/runs/:runId/process`
- `POST /accountant/payroll/runs/:runId/submit-approval`
- `POST /accountant/payroll/runs/:runId/approve`
- `GET /accountant/payroll/pending`

### Payslips

- `GET /accountant/payslips`
- `POST /accountant/payslips/generate`
- `GET /accountant/payslips/:id/download`

### Advances, Loans, Statutory

- `GET /accountant/advances-loans`
- `POST /accountant/advances-loans`
- `PATCH /accountant/advances-loans/:id`
- `GET /accountant/statutory`
- `PATCH /accountant/statutory/:userId`

### Incentives and Reimbursements

- `GET /accountant/bonus-incentives`
- `POST /accountant/bonus-incentives`
- `GET /accountant/reimbursements`
- `GET /accountant/expenses`
- `POST /accountant/expenses/:id/approve`
- `POST /accountant/expenses/:id/reject`

### Transfers and Exports

- `POST /accountant/bank-transfer/:runId/initiate`
- `GET /accountant/bank-transfer/:runId/status`
- `GET /accountant/export/attendance?format=excel|pdf`
- `GET /accountant/export/payroll?format=excel|pdf`

## Permission Matrix

### Accountant Allowed

- view all employee attendance
- view payroll details
- process salaries
- generate payslips
- export reports
- view leave details
- manage overtime calculations
- access financial summaries

### Accountant Denied

- modify HR admin/system settings
- delete employee records

### Enforcement Layers

- route middleware role checks
- service-layer permission guard for destructive actions
- frontend action visibility restrictions

## Salary Calculation Engine

## Inputs

- attendance (`present`, `absent`, `late`, `half-day`, `overtime`)
- approved leave data
- user monthly salary
- advances and loan installment deductions
- statutory configs (PF/ESI/Tax)
- bonuses and incentives
- approved reimbursements

## Processing Sequence

1. Resolve payable days from attendance and approved leaves.
2. Compute attendance-adjusted base salary.
3. Compute overtime pay based on configured multiplier.
4. Apply additions: bonus, incentives, reimbursements.
5. Apply deductions: advance, loan, statutory, others.
6. Compute gross and net pay.
7. Persist immutable payroll snapshots (`PayrollItem`, `StatutoryDeduction`).
8. Generate payslip metadata and set payroll status transition.

## Reliability and Safety

- transaction-wrapped processing for run chunks
- idempotency key on process endpoint
- strict status transition validation
- no mutation of approved/disbursed payroll without explicit rollback flow

## Frontend Module Design

## Route and Files

- `frontend/src/app/dashboard/accountant/page.tsx`
- `frontend/src/components/accountant/AccountantKpiCards.tsx`
- `frontend/src/components/accountant/AccountantCharts.tsx`
- `frontend/src/components/accountant/AccountantAttendanceTable.tsx`
- `frontend/src/components/accountant/AccountantPayrollActions.tsx`
- `frontend/src/components/accountant/AccountantFilters.tsx`
- `frontend/src/lib/accountantApi.ts`
- `frontend/src/types/accountant.ts`

## UX and Visual Direction

- professional SaaS enterprise style
- white/light background
- clean analytics cards and modern dashboard hierarchy
- responsive layout
- clean, dense but readable table design
- sidebar module entry for accountant role

## Required Dashboard Coverage

- Total Employees
- Present Employees Today
- Absent Employees Today
- Late Employees
- Employees On Leave
- Shift Details
- Overtime Employees
- Monthly Payroll Summary
- Pending Salary Processing
- Employee Advances and Loan Deductions
- PF / ESI / Tax Details
- Attendance-based Salary Calculation
- Daily Attendance Reports
- Monthly Attendance Reports
- Department-wise Attendance
- Employee Check-in and Check-out Timing
- Working Hours Calculation
- Attendance Correction Requests
- Payroll Approval Status
- Bonus and Incentive Management
- Expense Tracking
- Reimbursement Management
- Bank Transfer Status
- Download Payslips
- Export Attendance and Payroll Reports (Excel/PDF)

## Attendance Table Specification

Columns:

- Employee ID
- Employee Name
- Department
- Designation
- Shift
- Check-in Time
- Check-out Time
- Total Hours
- Overtime Hours
- Present/Absent Status
- Leave Status
- Salary Status

Status badge colors:

- Present -> Green
- Absent -> Red
- Late -> Orange
- Leave -> Blue
- Half Day -> Yellow

## Implementation Sequence

1. Add role plumbing (`ACCOUNTANT`) in schema and auth typing.
2. Add Prisma models, enums, relations, and indexes.
3. Create migration and regenerate Prisma client.
4. Implement accountant route/controller/service.
5. Implement salary processing and approval lifecycle.
6. Add export and payslip endpoints.
7. Implement frontend accountant page and components.
8. Add sidebar/nav permissions and portal labeling.
9. Validate role-based restrictions across settings and delete flows.
10. Run lint and targeted route validation.

## Migration Strategy

1. Deploy enum role addition and new tables.
2. Backfill baseline payroll snapshots from current monthly salary and attendance aggregates.
3. Validate backfill integrity (count reconciliation by month and user).
4. Enable accountant endpoints.
5. Enable accountant frontend route and role navigation.

## Testing Strategy

### Backend

- unit tests for salary calculator edge cases:
  - full attendance
  - high overtime
  - half-day heavy months
  - leave overlap
  - zero salary and negative-net prevention
- integration tests for:
  - process payroll idempotency
  - role access control
  - export endpoint authorization

### Frontend

- component tests for KPI/charts/table rendering states
- role-based route guard checks
- status badge rendering contract tests
- loading, empty, and error state checks

## Risk Register and Mitigation

- Risk: duplicated payroll processing under concurrent triggers.
  - Mitigation: idempotency key and transaction lock per run.
- Risk: mismatch between attendance corrections and payroll snapshots.
  - Mitigation: freeze snapshot at run processing time and require explicit rerun.
- Risk: export performance degradation with large datasets.
  - Mitigation: streaming export and constrained date ranges.
- Risk: unauthorized access drift due to mixed role checks.
  - Mitigation: centralized permission utility and route middleware enforcement.

## Success Criteria

- Accountant can complete monthly payroll processing end-to-end.
- Dashboard displays all required attendance/payroll widgets.
- Attendance table and badge semantics match requested specification.
- Exports and payslip downloads function by role.
- Accountant cannot access restricted HR admin settings or employee delete operations.
