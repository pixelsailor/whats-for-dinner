# What's For Dinner (WFD) API Service Layer

## Overview

The WFD API service layer provides a comprehensive, module architecture for managing all backend interactions within the WFD application.
This service layer is organized into functional domains, each handling specific business capabilities with well-defined responsibilities and clear separation of concerns.

## Architectural Principles

- **Modular Design**: Each API slice is self-contained with its own services, models, and utilities
- **Separation of Concerns**: Clear boundaries between functional domains
- **Type Safety**: Full TypeScript integration with comprehensive type definitions
- **Consistent Patterns**: Standardized service patterns across all modules. Both **remote** and **local** requests should conform to standard **Fetch API** models
- **Monitoring Ready**: Built-in health checks and metrics collection for observability

## API Service Domains

### Authentication
**Core authentication and user management workflows**

Handles login, password reset, registration, and MFA. Provides secure session management with Supabase authentication.
Refer to Supabase [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction) documentation for **auth** guidance.

**Key Services**
- Login authentication
- Password reset and recovery workflows
- User registration and account setup
- Multi-factor authentication

---

### Account Management
**User account administration**

Comprehensive account management for application users including subscription options, recipe preferences, theme settings, notifications and SSO configuration.

**Key Services**
- Personal preferences for recipe restrictions
- Subscription options for AI assisted recipes and suggestions
- Security settings for changing email and password

---

### Recipe Management
End-to-end recipe management consists of three key areas: local, remote/cloud, AI assisted.

#### Local Recipe Management
**Local/Offline recipe workflow and storage with Dexie/IndexedDB**

Primary recipe management including recipe CRUD workflows and recommendations using local IndexedDB data suitable for offline, unauthorized users without cloud or AI assisted recipe permissions.

**Key Services**
- **Dexie** integration for facilitating offline IndexedDB management and mutations
- Recipe lifecycle management (create, update, delete)
- Recipe search based on title, tags, and usage (recently added, most popular, haven't made in 2 months, etc)

#### Remote/Cloud Recipe Management
**Recipe workflows for sharing and cloud storage with Supabase**

Provides subscribed users with support for syncing local recipe data with the Supabase cloud for backup, retrieval and recipe sharing via public URLs. Refer to Supabase [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction) documentation for **database** guidance.

**Key Services**
- Backup recipes with cloud storage and sync across devices/browsers
- Share online recipes with public URLs
- Free local storage with archived recipes that can be stored in the cloud and downloaded later

#### AI Assisted Recipes
**AI generated recipes and recipe modifications**

Allows subscribed users to ask AI for recipe suggestions and generate complete recipes based on summary data as well as ask questions or make changes to full recipes.

**Key Services**
- AI suggested recipe summaries based on user prompts
- AI generated recipes based on AI recipe summaries
- AI assistance for making recipe modifications or asking for general help