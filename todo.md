Implementation Plan: Authentication Fix & Dashboard Modularization
This document outlines the step-by-step process to fix the broken authentication flow and refactor the monolithic dashboard into a modular, maintainable structure.

Phase 1: Authentication Repair
Goal: Ensure Users can Sign Up, Sign In, and Recover Passwords successfully.

1.1 Verify Supabase Configuration
 Check Credentials: Open 
js/auth.js
 and verify that SUPABASE_URL and SUPABASE_KEY are correct and valid.
 Console Debugging: Add console.log statements in 
js/auth.js
 inside the submit handlers for #signin-form and #signup-form to confirm the events are firing.
 Network Check: Use the browser developer tools (Network tab) to see if requests are being sent to Supabase when "Skrá inn" or "Stofna aðgang" is clicked.
Common Issue: Script deferred loading might delay listener attachment if not wrapped in DOMContentLoaded (it currently is, so check logic inside).
1.2 Fix Event Handlers
 Prevent Default: Ensure e.preventDefault() is actually stopping the form reload.
 Feedback Loops:
If 
error
 occurs, verify 
showAlert('error', ...)
 displays the error box physically on the screen (check css hidden class removal).
If success (Sign Up), ensure the success message is shown.
1.3 Routing
 Redirects: Confirm that upon successful session (!error && data.session), window.location.href = 'dashboard.html' is executed.
 Session Gate: Verify 
initSessionGate()
 correctly identifies an active session and redirects logged-in users away from 
auth.html
 to 
dashboard.html
.
Phase 2: Dashboard Modularization
Goal: Split 
dashboard.html
 and 
dashboard-logic.js
 into separate, focused files for Overview, Accounts, Calculator, and Settings.

2.1 Component Architecture
Create a new directory structure (or file naming convention) for the split:

New HTML Files:

dashboard.html
 (Retain as the "Overview" or "Main" entry point, or rename to dashboard-overview.html and have a landing redirect). Recommendation: Rename current 
dashboard.html
 to dashboard-overview.html.
dashboard-accounts.html
dashboard-calculator.html
dashboard-settings.html
New JS Directory: js/dashboard/

js/dashboard/shared.js (Auth check, Sidebar logic, Navigation state, Common Utils)
js/dashboard/overview.js (Overview specific charts & insights)
js/dashboard/accounts.js (Account CRUD)
js/dashboard/calculator.js (Loan calculator logic)
js/dashboard/settings.js (User profile settings)
2.2 Execution Steps
Step A: Extract Shared Logic
 Create js/dashboard/shared.js.
 Move the following from 
dashboard-logic.js
 to shared.js:
Supabase client initialization.
state object (base structure: user, userDetails).
Sidebar toggling (
openSidebar
, 
closeSidebar
).
Sidebar navigation highlighting (based on current URL/filename).
loadSession()
 and 
loadUserDetails()
 (Auth gating).
formatCurrency
, 
formatDate
 utilities.
Logout handler.
Step B: Create "Overview" (
dashboard.html
 / dashboard-overview.html)
 Strip out #section-accounts, #section-calculator, #section-settings (if exists) HTML from the main file.
 Link js/dashboard/shared.js and js/dashboard/overview.js.
 Move Overview-specific logic from 
dashboard-logic.js
 to js/dashboard/overview.js:
renderSummary()
, 
renderInsights()
, 
renderTransactions()
.
Chart initialization (spendingChart, cashflowChart).
reloadData()
 logic relevant to overview.
Step C: Create "Accounts" (dashboard-accounts.html)
 Duplicate the main dashboard HTML skeleton (Head, Sidebar, Mobile Nav).
 Replace the <main> content with the content of #section-accounts.
 Link js/dashboard/shared.js and js/dashboard/accounts.js.
 Move Accounts logic to js/dashboard/accounts.js:
loadAccounts()
, 
renderAccounts()
.
bindAccountForm()
 (Add/Edit/Delete logic).
Step D: Create "Calculator" (dashboard-calculator.html)
 Duplicate the dashboard skeleton.
 Replace <main> content with #section-calculator.
 Link js/dashboard/shared.js and js/dashboard/calculator.js.
 Integration: The user mentioned a "refactored" calculator.
Check loan-calculator-refactored/ or 
js/calculator-core.js
.
If 
js/calculator-core.js
 is the robust version, import/link it here.
Ensure the calculator UI inputs (IDs) match what calculator.js expects.
Step E: Create "Settings" (dashboard-settings.html)
 Duplicate the dashboard skeleton.
 Replace <main> content with the Settings form (currently data-nav="settings").
 Link js/dashboard/shared.js and js/dashboard/settings.js.
 Move Settings logic to js/dashboard/settings.js:
bindSettingsForm()
.
User details update logic.
Phase 3: Cleanup & Wiring
 Navigation Links: Update the Sidebar HTML in all files to point to the new HTML files (e.g., <a href="dashboard-accounts.html"> instead of data-nav="accounts"), OR keep the data-nav and handle it in shared.js to window.location.href = .... Recommendation: Use standard href links for Multi-Page Application robustness.
 Delete Old Files: Once verified, delete 
dashboard-logic.js
.
Verification Plan
Auth:
Open 
auth.html
.
Try to Sign Up with a new email. Verify success message.
Try to Sign In. Verify redirect to 
dashboard.html
.
Dashboard:
Open 
dashboard.html
. Verify Charts load and User Name appears.
Click "Reikningar" (Accounts). Verify it navigates to dashboard-accounts.html and loads the list.
Add a new account. Verify it saves and appears.
Click "Lánareiknir" (Calculator). Verify the calculator functionality works.
Click "Stillingar" (Settings). Change a setting (e.g. savings target) and Save. Verify it persists on reload.