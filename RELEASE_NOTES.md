# Release notes

## 1.2.0

- Package selection now navigates to the enquiry page and preselects the chosen package.
- Removed the full enquiry form from the homepage.
- Increased homepage spacing and simplified the customer journey.
- Added a calm three-step process strip instead of the dense full process/form stack.
- Preserved Vodacom Business branding on each active package.

# BackyardConnect 1.0.0

This release implements the approved standalone BackyardConnect.co.za connectivity enquiry service.

## Public experience

- Backyard Finance black, white, charcoal and warm-grey design language
- Recreated desktop and mobile rental-neighbourhood imagery, not cropped from the mockup
- Current Vodacom Business partner panel
- Four current package guidance cards
- Short consented enquiry form
- Enquiry confirmation and reference number
- How it works, packages, FAQs, contact, privacy, terms and POPIA pages
- No account creation, document upload, coverage promise or installation-management journey

## Operations

- Authenticated enquiry dashboard
- Status and provider-reference tracking
- Commission status and operations notes
- Enquiry activity history and audit log
- CSV export
- Private partner catalogue designed for future approved providers

## Platform

- Node.js 22 standalone server with no third-party runtime packages
- SQLite WAL persistence with encrypted personal data
- Docker and Docker Compose deployment
- Optional signed enquiry webhook
- Security headers, CSRF protection, rate limiting and duplicate control
- Automated tests and deployment documentation
