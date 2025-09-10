# DataFlow - Natural Language Data Processing

## Overview

DataFlow is a full-stack web application that enables users to upload Excel/CSV files and perform data transformations using natural language instructions. The system converts natural language commands into executable Python pandas code, executes the transformations, and allows users to download the processed results. It features a playbook system for saving and reusing transformation workflows, complete with parameter mapping and audit logging.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **File Upload**: React Dropzone for drag-and-drop file uploads with progress tracking

### Backend Architecture
- **Runtime**: Node.js with TypeScript using ESM modules
- **Framework**: Express.js for REST API endpoints
- **File Processing**: SheetJS (XLSX) for parsing Excel files and CSV processing
- **Code Generation**: OpenAI API integration for natural language to pandas code translation
- **Code Execution**: Sandboxed Python execution using child processes for running generated pandas code
- **Development**: Vite middleware integration for hot module replacement in development

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless driver
- **ORM**: Drizzle ORM with type-safe schema definitions
- **File Storage**: Temporary file storage with configurable TTL for uploaded files
- **Session Management**: Connect-pg-simple for PostgreSQL-backed session storage

### Database Schema Design
- **Users**: Basic user management with username/password authentication
- **Uploads**: File metadata with sheet information, column inference, and data previews
- **Playbooks**: Saved transformation workflows with parameters and reusable code templates
- **Runs**: Audit trail for transformation executions with status tracking and error logging

### Natural Language Processing Pipeline
- **Code Generation**: OpenAI GPT models convert natural language instructions to pandas code
- **Parameter Extraction**: Automatic identification of configurable parameters from generated code
- **Confidence Scoring**: AI-driven confidence assessment for generated transformations
- **Code Safety**: Sandboxed execution environment with restricted imports and operations

### File Processing Workflow
- **Upload Validation**: File type and size restrictions (XLSX, CSV up to 10MB)
- **Sheet Detection**: Automatic workbook parsing and sheet enumeration
- **Column Inference**: Smart data type detection (text, number, date, currency, boolean, category)
- **Preview Generation**: First 100 rows displayed with column type indicators
- **Temporary Storage**: Secure file handling with automatic cleanup

### Security and Safety Measures
- **Code Sandboxing**: Restricted Python execution environment preventing file system and network access
- **Input Validation**: Comprehensive file type and content validation
- **SQL Injection Prevention**: Parameterized queries through Drizzle ORM
- **Session Security**: Secure session management with PostgreSQL storage
- **File Cleanup**: Automatic deletion of temporary files based on configurable TTL

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database for persistent data storage
- **AI Service**: OpenAI API for natural language to code translation capabilities

### Development and Build Tools
- **Package Manager**: npm with lockfile for dependency management
- **Build System**: Vite for frontend bundling and development server
- **TypeScript**: Full-stack type safety with shared schema definitions
- **Code Quality**: ESBuild for production backend bundling

### Runtime Dependencies
- **File Processing**: SheetJS for Excel file parsing and manipulation
- **Python Integration**: Child process execution for pandas code execution
- **Authentication**: Express sessions with PostgreSQL storage backend
- **File Upload**: Multer middleware for multipart form handling

### UI and Frontend Libraries
- **Component Library**: Radix UI primitives with shadcn/ui styling
- **State Management**: TanStack Query for server state synchronization
- **Form Handling**: React Hook Form with Zod validation schemas
- **Date Utilities**: date-fns for date formatting and manipulation
- **Styling**: Tailwind CSS with PostCSS processing