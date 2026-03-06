# Monroy QMS - Quality Management System

Enterprise-grade Quality Management System built with Next.js, React, and Supabase.

## Features

- 🔐 Role-Based Access Control (Super Admin, Admin, Inspector, Supervisor, Client)
- ⚙️ Equipment Register & Management
- 🔍 Inspection Management System
- 📊 Reports & Analytics
- 📜 Certificate Management
- ⚠️ Non-Conformance Reports (NCR) with CAPA
- 🏢 Multi-Client Support
- 📱 Fully Responsive Design

## Tech Stack

- **Frontend**: Next.js 14, React 18
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **Styling**: Tailwind CSS (Custom)
- **Deployment**: Render

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase Account
- GitHub Account

### Local Setup
```bash
# Clone repository
git clone https://github.com/Felixkale/Monroy-QMS.git
cd Monroy-QMS

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Add your Supabase credentials:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
# SUPABASE_SERVICE_ROLE_KEY=your_key

# Run development server
npm run dev

# Seed demo users
npm run seed

# Open browser
# http://localhost:3000
```

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | superadmin@monroy.com | superadmin123 |
| Admin | admin@monroy.com | admin123 |
| Inspector | inspector@monroy.com | inspector123 |
| Supervisor | supervisor@monroy.com | supervisor123 |
| Client | client@acme.com | client123 |

## Project Structure
```
Monroy-QMS/
├── apps/
│   └── web/
│       ├── src/
│       │   ├── app/          # Next.js pages
│       │   ├── components/   # Reusable components
│       │   └── lib/          # Utilities & config
│       ├── public/           # Static assets
│       └── jsconfig.json
├── scripts/
│   ├── seedUsers.js          # User seeding script
│   └── seedSampleData.js     # Sample data script
├── package.json
└── .env.local
```

## Database Schema

The system uses a comprehensive PostgreSQL schema with the following tables:

- **users** - System users with role-based access
- **clients** - Company information
- **sites** - Client site locations
- **assets** - Equipment/assets register
- **asset_nameplate** - Technical specifications
- **inspections** - Inspection records
- **inspection_responses** - Inspection details
- **ncrs** - Non-conformance reports
- **ncr_actions** - Corrective/preventive actions
- **certificates** - Equipment certificates
- **alerts** - System alerts
- **audit_log** - Activity tracking

## User Roles & Permissions

### Super Admin
- Full system access
- User management
- Module configuration
- System monitoring
- View audit logs

### Admin
- Client management
- Equipment management
- User management
- View reports
- Activity monitoring

### Inspector
- Create/view inspections
- Generate certificates
- Create NCRs
- View equipment details

### Supervisor
- Team oversight
- View reports
- Monitor inspections

### Client
- View own equipment
- Download certificates & reports
- Check license status
- View inspection history

## Features

### Equipment Management
- Register and manage equipment/assets
- Track technical specifications (nameplate data)
- Monitor license status
- Generate QR codes for easy access

### Inspection System
- Create inspection templates
- Record inspection results
- Upload photos and documents
- Track measurement data
- Generate inspection reports

### Certificate Management
- Issue equipment certificates
- Track expiry dates
- Download certificates (PDF/Word)
- Compliance tracking

### NCR Management
- Raise non-conformance reports
- Track corrective/preventive actions (CAPA)
- Assign actions to team members
- Monitor resolution status

### Reporting
- Equipment compliance reports
- License expiry reports
- Inspection summaries
- NCR analytics
- Custom report generation

## Deployment

### Render Deployment

1. Push code to GitHub
2. Connect GitHub repo to Render
3. Set environment variables in Render:
```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
```
4. Render auto-deploys on push

Live: [https://monroy-qms-3n2a.onrender.com](https://monroy-qms-3n2a.onrender.com)

## Database Setup

Run the database schema in Supabase SQL Editor:
```bash
# In Supabase → SQL Editor, paste the complete schema from:
# /docs/database-schema.sql
```

Then seed sample data:
```bash
npm run seed
```

## Environment Variables

Create `.env.local` in project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Legal Framework

The system ensures compliance with:
- Mines and Quarries Act CAP 4.4:02
- Factories Act 44.01
- Machinery and Related Industries Safety and Health Regulations

## Support

For issues and questions:
1. Check GitHub Issues
2. Review documentation
3. Contact development team

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## Changelog

### v1.0.0 (Current)
- Complete QMS system
- Role-based access control
- Equipment management
- Inspection system
- NCR management with CAPA
- Certificate management
- Reporting & analytics
- Responsive design

---

**Built with ❤️ by Monroy QMS Team**
```

5. Click **Commit new file**

---

### **2. Create LICENSE**

1. Click **Add file → Create new file**
2. Name: `LICENSE`
3. Choose a license type. Use **MIT License** (common for business apps):
```
MIT License

Copyright (c) 2026 Monroy QMS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
