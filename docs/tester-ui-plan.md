# Tester UI Application Plan

## Overview
React-based development harness for testing the CommonForms async job API. Built with modern tooling optimized for Bun monorepo setup, providing real-time visual feedback for PDF processing workflows.

**Location**: `apps/tester-ui/`
**Tech Stack**: Bun 1.3 + React 18 + TypeScript + Vite 7 + shadcn/ui + TanStack Query + ky
**Purpose**: Development testing tool + eventual production deployment capability

### Plan Status: Updated with Backend Testing Results ✅

This plan has been validated against real backend performance testing:
- ✅ **Performance metrics confirmed**: ~25s processing time with FAST_MODE (ONNX)
- ✅ **API endpoints tested**: POST /jobs, GET /jobs/{id}, GET /jobs/{id}/result
- ✅ **Detection quality verified**: 288 textboxes, 43 choice buttons detected (EPA.pdf)
- ✅ **All open questions resolved**: Polling strategy, cleanup timing, CORS config
- ⚠️ **Backend prerequisites identified**: /health endpoint needed, CORS configuration required

**Ready for implementation** once backend prerequisites are completed.

---

## Project Initialization

### Scaffolding with Bun React shadcn Preset

```bash
# From monorepo root
cd apps/
mkdir tester-ui && cd tester-ui
bun init --react=shadcn
```

**What this provides**:
- Vite 7 + React 18 + TypeScript pre-configured
- TailwindCSS integrated
- shadcn/ui component system initialized
- Optimized for Bun 1.3 runtime

### Monorepo Integration

**Workspace Discovery**:
- Auto-discovered via `bunfig.toml` workspace configuration
- No manual package.json workspace edits needed

**Turborepo Configuration** (`turbo.json`):
```json
{
  "pipeline": {
    "tester-ui#dev": {
      "cache": false,
      "persistent": true
    },
    "tester-ui#build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "tester-ui#lint": {
      "outputs": []
    }
  }
}
```

**Verification Commands**:
```bash
bun run dev --filter=tester-ui
bun run build --filter=tester-ui
bun run lint --filter=tester-ui
```

### Dependencies

**Core Runtime**:
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.62.0",
    "ky": "^1.7.0",
    "date-fns": "^3.0.0",
    "zustand": "^5.0.0",
    "react-dropzone": "^14.3.0",
    "sonner": "^1.7.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@tanstack/react-query-devtools": "^5.62.0"
  }
}
```

**Why Zod v4**:
- Runtime validation of API responses (defense against backend changes)
- Performance improvements over v3 (faster parsing)
- `/mini` package available for smaller bundles
- Type-safe schema definitions with `z.infer<>`

**shadcn/ui Components**:
```bash
bunx shadcn@latest add button card progress badge table input label select toast
```

**Linting Configuration**:
- Inherits Ultracite + Biome setup from monorepo root
- `biome.jsonc` applies automatically to `apps/tester-ui/**`
- No per-app configuration needed (monorepo-native approach)

---

## Project Structure

```
apps/tester-ui/
├── src/
│   ├── main.tsx                    # Application entry point
│   ├── App.tsx                     # Root component with QueryClientProvider
│   ├── constants/
│   │   ├── api.ts                  # API constants (poll intervals, timeouts, retry)
│   │   ├── validation.ts           # File validation (size limits, MIME types)
│   │   └── timing.ts               # Job timing (TTL, expected durations)
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts           # ky HTTP client configuration
│   │   │   ├── jobs.ts             # Job API methods (upload, poll, download)
│   │   │   ├── types.ts            # API response types from backend schema
│   │   │   └── schemas.ts          # Zod v4 schemas for runtime validation
│   │   ├── query/
│   │   │   ├── client.ts           # TanStack Query client setup
│   │   │   ├── hooks.ts            # useUploadJob, useJobStatus, useDownloadResult
│   │   │   └── keys.ts             # Query key factory pattern
│   │   └── store/
│   │       ├── settings.ts         # Zustand: backend URL, poll interval
│   │       └── history.ts          # Zustand: completed jobs persistence
│   ├── components/
│   │   ├── ui/                     # shadcn auto-generated components
│   │   ├── job/
│   │   │   ├── JobUploader.tsx     # File picker + drag-drop zone
│   │   │   ├── JobCard.tsx         # Single job status display
│   │   │   ├── JobList.tsx         # Active jobs container
│   │   │   ├── JobHistory.tsx      # Completed jobs table
│   │   │   └── JobProgress.tsx     # Progress bar + stage indicators
│   │   ├── settings/
│   │   │   └── SettingsPanel.tsx   # Backend URL, poll interval config
│   │   └── layout/
│   │       ├── Header.tsx          # App title, connection status
│   │       └── Container.tsx       # Main layout wrapper
│   ├── hooks/
│   │   ├── useJobPoller.ts         # Polling lifecycle management
│   │   ├── useJobMetrics.ts        # Duration calculations, stage timings
│   │   └── useLocalStorage.ts      # Generic localStorage persistence
│   ├── utils/
│   │   ├── format.ts               # Duration, file size, timestamp formatting
│   │   ├── stage-labels.ts         # JobStatus enum → human-readable labels
│   │   └── validation.ts           # File type/size validation helpers
│   └── types/
│       └── index.ts                # Shared TypeScript interfaces
├── public/
│   ├── epa.pdf                     # Test fixture (copied from docs/epa.pdf)
│   └── encrypted.pdf               # Error test fixture (from packages/commonforms-core/tests/resources/)
├── index.html
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Constants Organization

### Centralized Configuration (`src/constants/`)

**Why Constants**: Eliminates magic numbers, enables easy tuning, provides single source of truth for configuration values.

### API Constants (`src/constants/api.ts`)

```typescript
/**
 * API configuration and timing constants
 */

// Polling configuration
export const POLL_INTERVAL_MS = 2000 // 2s - adequate for ~25s jobs with fast mode
export const MAX_POLL_DURATION_MS = 600000 // 10 minutes max poll time
export const POLL_RETRY_LIMIT = 3 // Retry failed polls

// HTTP timeouts
export const UPLOAD_TIMEOUT_MS = 60000 // 60s for large PDF uploads
export const STATUS_TIMEOUT_MS = 10000 // 10s for status checks
export const DOWNLOAD_TIMEOUT_MS = 30000 // 30s for result downloads

// Retry configuration
export const HTTP_RETRY_COUNT = 3
export const HTTP_RETRY_DELAY_MS = 1000 // Initial delay, exponential backoff

// API defaults
export const DEFAULT_BACKEND_URL = 'http://localhost:8000'
```

### Validation Constants (`src/constants/validation.ts`)

```typescript
/**
 * File upload validation rules
 */

// File size limits
export const MAX_FILE_SIZE_BYTES = 52_428_800 // 50 MB
export const MAX_FILE_SIZE_MB = 50

// MIME types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
] as const

export const PDF_FILE_EXTENSION = '.pdf'

// Validation messages
export const VALIDATION_MESSAGES = {
  FILE_TOO_LARGE: `File size exceeds ${MAX_FILE_SIZE_MB}MB limit`,
  INVALID_FILE_TYPE: 'Only PDF files are supported',
  FILE_REQUIRED: 'Please select a PDF file to upload',
} as const
```

### Timing Constants (`src/constants/timing.ts`)

```typescript
/**
 * Job lifecycle timing expectations
 */

// Backend TTL (sync with COMMONFORMS_CLEANUP_TTL_SECONDS)
export const JOB_TTL_SECONDS = 3600 // 1 hour
export const JOB_TTL_MS = JOB_TTL_SECONDS * 1000

// Expected durations (based on EPA.pdf testing)
export const EXPECTED_DURATION = {
  FAST_MODE: 25000, // ~25s with ONNX
  REGULAR_MODE: 360000, // ~6min with PyTorch (not recommended)
  PER_PAGE_FAST: 1000, // ~1s per page
  PER_PAGE_REGULAR: 12000, // ~12s per page
} as const

// Stage transition expectations
export const STAGE_COUNT = 7 // queued → validating → rendering → detecting → writing → ready
export const MIN_STAGE_DURATION_MS = 100 // Minimum time to show each stage

// UI timing
export const DEBOUNCE_SETTINGS_MS = 500 // Debounce settings changes
export const TOAST_DURATION_MS = 5000 // Toast notification duration
export const PROGRESS_ANIMATION_MS = 300 // Progress bar transition
```

### Usage Example

**In API Client** (`src/lib/api/client.ts`):
```typescript
import {
  DEFAULT_BACKEND_URL,
  UPLOAD_TIMEOUT_MS,
  HTTP_RETRY_COUNT
} from '@/constants/api'

const api = ky.create({
  prefixUrl: DEFAULT_BACKEND_URL,
  timeout: UPLOAD_TIMEOUT_MS,
  retry: HTTP_RETRY_COUNT,
})
```

**In File Validation** (`src/components/job/JobUploader.tsx`):
```typescript
import {
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
  VALIDATION_MESSAGES
} from '@/constants/validation'

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return VALIDATION_MESSAGES.FILE_TOO_LARGE
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return VALIDATION_MESSAGES.INVALID_FILE_TYPE
  }
  return null
}
```

**In Polling Hook** (`src/hooks/useJobPoller.ts`):
```typescript
import { POLL_INTERVAL_MS, MAX_POLL_DURATION_MS } from '@/constants/api'

const { data } = useQuery({
  queryKey: ['job-status', jobId],
  queryFn: () => getJobStatus(jobId),
  refetchInterval: POLL_INTERVAL_MS,
  // Stop after max duration
  enabled: elapsedTime < MAX_POLL_DURATION_MS,
})
```

---

## API Layer Architecture

### HTTP Client (`src/lib/api/client.ts`)

**ky Configuration**:
- Base URL sourced from Zustand settings store
- Retry strategy: 3 attempts with exponential backoff
- Timeout: 30s for uploads, 10s for status polls
- Hooks for request/response logging in development mode
- Type-safe with TypeScript generics

**Key Features**:
- Automatic JSON parsing
- Error normalization to standard shape
- Request ID injection for tracing
- CORS credentials handling

### Job API Methods (`src/lib/api/jobs.ts`)

**Function Signatures**:

```typescript
// Upload PDF and create job
uploadJob(file: File, options?: JobOptions): Promise<JobCreateResponse>

// Poll job status and progress
getJobStatus(jobId: string): Promise<JobStatusResponse>

// Download completed fillable PDF
downloadResult(jobId: string): Promise<Blob>
```

**Type Safety**:
- All return types mirror backend Pydantic schemas exactly
- Branded types for `job_id` to prevent string confusion
- Runtime validation for critical fields

### API Types (`src/lib/api/types.ts`)

**Core Models** (aligned with backend):

```typescript
type JobStatus =
  | 'queued'
  | 'validating'
  | 'rendering'
  | 'detecting'
  | 'writing'
  | 'ready'
  | 'failed'

interface JobCreateResponse {
  job_id: string
  status: JobStatus
  progress: number
}

interface JobStatusResponse {
  job_id: string
  status: JobStatus
  progress: number
  message?: string
  download_url?: string
  error?: JobError
}

interface JobError {
  type: string        // e.g., "EncryptedPdfError"
  detail: string      // Human-readable error message
}

interface JobOptions {
  model?: 'FFDNet-S' | 'FFDNet-L'
  device?: 'cpu' | 'cuda'
  fast?: boolean
}
```

---

## API Validation with Zod v4

### Runtime Schema Validation (`src/lib/api/schemas.ts`)

**Why Zod v4**: Provides runtime type safety to catch API contract violations early. Zod v4 offers improved performance, better error messages, and the `/mini` package for smaller bundles.

**Schema Definitions**:
```typescript
import { z } from 'zod'

// Job Status Enum
export const JobStatusSchema = z.enum([
  'queued',
  'validating',
  'rendering',
  'detecting',
  'writing',
  'ready',
  'failed',
])

// Job Error
export const JobErrorSchema = z.object({
  type: z.string(),
  detail: z.string(),
})

// Job Create Response
export const JobCreateResponseSchema = z.object({
  job_id: z.string().length(32), // UUID hex format
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
})

// Job Status Response
export const JobStatusResponseSchema = z.object({
  job_id: z.string().length(32),
  status: JobStatusSchema,
  progress: z.number().min(0).max(1),
  message: z.string().optional(),
  download_url: z.string().url().optional(),
  error: JobErrorSchema.optional(),
})

// Job Options (for form submission)
export const JobOptionsSchema = z.object({
  model: z.enum(['FFDNet-S', 'FFDNet-L']).optional(),
  device: z.enum(['cpu', 'cuda']).optional(),
  fast: z.boolean().optional(),
})

// TypeScript types derived from schemas (single source of truth)
export type JobStatus = z.infer<typeof JobStatusSchema>
export type JobError = z.infer<typeof JobErrorSchema>
export type JobCreateResponse = z.infer<typeof JobCreateResponseSchema>
export type JobStatusResponse = z.infer<typeof JobStatusResponseSchema>
export type JobOptions = z.infer<typeof JobOptionsSchema>
```

### Integration with ky Client (`src/lib/api/client.ts`)

**Validation in API calls**:
```typescript
import ky from 'ky'
import { JobCreateResponseSchema, JobStatusResponseSchema } from './schemas'

const api = ky.create({
  prefixUrl: 'http://localhost:8000',
  timeout: 60000,
})

// Create job with runtime validation
export async function createJob(file: File, options?: JobOptions): Promise<JobCreateResponse> {
  const formData = new FormData()
  formData.append('file', file)
  if (options) {
    formData.append('options', JSON.stringify(options))
  }

  const response = await api.post('jobs', { body: formData }).json()

  // Runtime validation - throws ZodError if API contract violated
  return JobCreateResponseSchema.parse(response)
}

// Get job status with runtime validation
export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const response = await api.get(`jobs/${jobId}`).json()

  // Catches unexpected API changes immediately
  return JobStatusResponseSchema.parse(response)
}
```

**Benefits**:
1. **Type Safety at Runtime**: Catches API changes that TypeScript can't detect
2. **Detailed Error Messages**: Zod v4 provides clear validation errors with paths
3. **Single Source of Truth**: Types derived from schemas eliminate drift
4. **Development Experience**: Fails fast in development when API contract changes

**Example Error Catching**:
```typescript
// Backend adds new required field "created_at" without updating frontend
// Without Zod: Silent bug, UI displays undefined
// With Zod: Immediate ZodError with message:
// "Expected string at path 'created_at', received undefined"
```

**Bundle Size Optimization** (Optional):
```typescript
// Use Zod v4 mini for 40% smaller bundle size
import { z } from 'zod/mini'
// Loses: Custom error messages, transforms
// Keeps: Core validation, type inference
```

---

## TanStack Query Integration

### Query Client Configuration (`src/lib/query/client.ts`)

**Settings**:
```typescript
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                    // Always fetch fresh status
      gcTime: 5 * 60 * 1000,           // Cache for 5 minutes
      retry: false,                     // Don't retry failed polls
      refetchOnWindowFocus: false,      // Manual control only
    },
    mutations: {
      retry: 1,                         // Retry uploads once
    },
  },
})
```

### Query Key Factory (`src/lib/query/keys.ts`)

**Pattern**:
```typescript
export const jobKeys = {
  all: ['jobs'] as const,
  lists: () => [...jobKeys.all, 'list'] as const,
  status: (jobId: string) => [...jobKeys.all, 'status', jobId] as const,
  result: (jobId: string) => [...jobKeys.all, 'result', jobId] as const,
}
```

**Benefits**:
- Type-safe query key construction
- Easy cache invalidation
- Hierarchical organization

### Custom Hooks (`src/lib/query/hooks.ts`)

#### useUploadJob Hook

**Purpose**: Handle file upload mutation with job creation

**Features**:
- Accepts File object and optional JobOptions
- onSuccess: Automatically starts polling via query invalidation
- onError: Triggers toast notification with error details
- Returns mutation state (isLoading, error, data)

**Usage Pattern**:
```typescript
const upload = useUploadJob({
  onSuccess: (response) => {
    // Job created, polling begins automatically
  },
  onError: (error) => {
    // Show error toast
  }
})

upload.mutate(pdfFile)
```

#### useJobStatus Hook

**Purpose**: Poll job status until completion

**Dynamic Polling Logic**:
```typescript
useQuery({
  queryKey: jobKeys.status(jobId),
  queryFn: () => getJobStatus(jobId),
  enabled: isPolling,
  refetchInterval: (query) => {
    const status = query.state.data?.status
    // Stop polling on terminal states
    return status === 'ready' || status === 'failed' ? false : settings.pollInterval
  }
})
```

**Simplified approach**: Uses query state directly instead of checking data parameter.

**Features**:
- Conditional polling based on job status
- Automatic termination when job completes
- Configurable poll interval from settings store
- Progress tracking across stage transitions

#### useDownloadResult Hook

**Purpose**: Fetch and trigger browser download of PDF

**Implementation**:
- Fetches Blob via `downloadResult(jobId)`
- Creates object URL and triggers download via `<a>` element
- Cleans up object URL after download
- Only enabled when status === 'ready'

---

## State Management

### Settings Store (`src/lib/store/settings.ts`)

**Zustand Slice with Persistence**:

```typescript
interface SettingsState {
  backendUrl: string              // Default: 'http://localhost:8000'
  pollInterval: number            // Default: 2000ms (adequate for ~25s jobs with fast mode)
  maxConcurrent: number | null    // Read-only, fetched from /health endpoint
  fastMode: boolean | null        // Read-only, backend fast mode status from /health

  setBackendUrl: (url: string) => void
  setPollInterval: (ms: number) => void
}

// Persisted to localStorage with 'tester-ui-settings' key
```

**Validation**:
- `backendUrl` validated on change (URL format check)
- `pollInterval` constrained to 500ms - 10s range
- Settings changes trigger query client reset

### History Store (`src/lib/store/history.ts`)

**Completed Jobs Tracking**:

```typescript
interface CompletedJob {
  job_id: string
  filename: string
  duration: number        // Total milliseconds
  timestamp: number       // Unix timestamp
  status: 'ready' | 'failed'
  stageBreakdown?: Record<JobStatus, number>
}

interface HistoryState {
  jobs: CompletedJob[]

  addJob: (job: CompletedJob) => void
  clearHistory: () => void
  exportToCsv: () => void
}
```

**Features**:
- LRU eviction (max 50 entries)
- localStorage persistence
- CSV export functionality
- Filter and sort helpers

---

## Component Specifications

### JobUploader Component

**Responsibilities**:
- File selection via button or drag-drop
- File validation (PDF MIME type, max size)
- Upload trigger with loading state
- Quick test with pre-loaded EPA.pdf

**UI Elements**:
- shadcn Card container
- react-dropzone zone with dashed border
- File preview showing name and size
- Upload button (disabled during upload)
- "Test with EPA.pdf" quick action button

**Error Handling**:
- Invalid file type → toast notification
- Oversized file → toast with size limit
- Upload failure → display error + retry option

### JobCard Component

**Props**:
```typescript
interface JobCardProps {
  job_id: string
  status: JobStatus
  progress: number
  message?: string
  startTime: number
}
```

**Display Components**:
- **Header**: Truncated job_id with copy-to-clipboard button
- **Status Badge**: Color-coded by status (gray/blue/green/red)
- **Progress Section**: JobProgress component
- **Timer**: Elapsed time updating every second
- **Actions**: Download button (visible when ready)
- **Details**: Expandable popover with stage timing breakdown

**Visual States**:
- Queued: Gray border, pulsing animation
- Processing: Blue border, progress animation
- Ready: Green border, download button prominent
- Failed: Red border, error message displayed

### JobList Component

**Layout**:
- CSS Grid: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
- Auto-scroll to newest job on upload
- Empty state with illustration and CTA

**Features**:
- Sort: Newest first (upload timestamp)
- Filter: Show active jobs only (excludes ready/failed)
- Batch actions: Cancel all button (future enhancement)

### JobProgress Component

**Visual Design**:
- Horizontal progress bar (0-100%)
- Stage indicator: 7 dots representing each JobStatus
- Current stage highlighted, completed stages filled
- Smooth transitions between stages (CSS animations)

**Additional Info**:
- Stage name label below progress bar
- Tooltips on hover showing stage descriptions
- Estimated time remaining (calculated from history averages)

### JobHistory Component

**Table Structure** (shadcn Table):

| Filename | Job ID | Duration | Status | Timestamp | Actions |
|----------|--------|----------|--------|-----------|---------|
| epa.pdf | abc-123 | 14.6s | ✓ Ready | Jan 14, 3:42 PM | Download, Details |

**Features**:
- Filter by status dropdown (All, Success, Failed)
- Sort by timestamp (descending default)
- Pagination (10 items per page)
- Export all to CSV (top-right action)
- Clear history (with confirmation dialog)

**Actions per Row**:
- Re-download button (if backend still has file)
- View metrics button (opens dialog with stage breakdown chart)
- Delete from history (local only)

### SettingsPanel Component

**Form Layout**:
```
┌─────────────────────────────────┐
│ Settings                   [×]  │
├─────────────────────────────────┤
│ Backend URL                     │
│ [http://localhost:8000    ]     │
│ [Test Connection]               │
│                                 │
│ Backend Configuration           │
│ • Fast Mode: ✓ Enabled          │
│ • Max Concurrent: 2             │
│ • Status: Connected             │
│                                 │
│ Poll Interval: 2000ms           │
│ [━━●━━━━━━━] 500ms ─── 10s     │
│                                 │
│ [Save Settings]                 │
└─────────────────────────────────┘
```

**Fields**:
- **Backend URL**: Text input with URL validation on blur
- **Poll Interval**: Slider (500ms - 10s) with live value display
- **Test Connection**: Button pings `/health` endpoint and shows result
- **Backend Configuration** (read-only display):
  - Fast Mode status (from /health response)
  - Max concurrent jobs (from /health response)
  - Connection status indicator

**Behavior**:
- Collapsible Card (starts collapsed)
- Changes auto-save to Zustand store + localStorage
- Invalid URL shows validation error inline

---

## Custom Hooks

### useJobPoller Hook

**Purpose**: Encapsulate full polling lifecycle for a single job

**Interface**:
```typescript
function useJobPoller(jobId: string): {
  status: JobStatusResponse | undefined
  isPolling: boolean
  error: Error | null
  metrics: JobMetrics
  stop: () => void
}
```

**Internal Logic**:
- Uses `useJobStatus` hook with conditional refetchInterval
- Tracks stage transition timestamps
- Calculates stage durations on transition
- Auto-stops polling on terminal status
- Auto-adds completed job to history store

### useJobMetrics Hook

**Purpose**: Calculate derived metrics from status update stream

**Input**: Array of status snapshots with timestamps

**Output**:
```typescript
interface JobMetrics {
  totalDuration: number
  stageBreakdown: Partial<Record<JobStatus, number>>
  averageProgressRate: number      // progress units per second
  estimatedTimeRemaining: number   // milliseconds
}
```

**Calculation Strategy**:
- Duration: `Date.now() - startTime`
- Stage breakdown: Track timestamp on each status change
- Progress rate: Linear regression on progress over time
- Remaining time: `(1 - progress) / progressRate`

---

## Utility Functions

### Format Utils (`src/utils/format.ts`)

**Functions**:

```typescript
// 8234 → "8.2s", 94567 → "1m 34s", 7923456 → "2h 15m"
formatDuration(ms: number): string

// 0.6 → "60%"
formatProgress(value: number): string

// 166912 → "166.9 KB", 1234567 → "1.2 MB"
formatFileSize(bytes: number): string

// Date → "Jan 14, 3:42 PM" (using date-fns)
formatTimestamp(date: Date): string
```

### Stage Labels (`src/utils/stage-labels.ts`)

**Mappings**:

```typescript
export const stageLabels: Record<JobStatus, string> = {
  queued: 'Queued',
  validating: 'Validating PDF',
  rendering: 'Rendering Pages',
  detecting: 'Detecting Fields',
  writing: 'Creating Form',
  ready: 'Ready',
  failed: 'Failed',
}

export const stageColors: Record<JobStatus, string> = {
  queued: 'gray',
  validating: 'blue',
  rendering: 'blue',
  detecting: 'blue',
  writing: 'blue',
  ready: 'green',
  failed: 'destructive',
}

// For stepper component: ordered array
export const stageSequence: JobStatus[] = [
  'queued', 'validating', 'rendering', 'detecting', 'writing', 'ready'
]
```

### Validation Utils (`src/utils/validation.ts`)

**Functions**:

```typescript
// Check MIME type === 'application/pdf' AND extension === '.pdf'
isPdfFile(file: File): boolean

// Verify file.size <= maxMB * 1024 * 1024
isFileSizeValid(file: File, maxMB: number): boolean

// URL format validation using URL constructor
validateBackendUrl(url: string): boolean
```

---

## UI/UX Patterns

### Loading States

**Skeleton Components**:
- JobCard skeleton while job uploads
- Table skeleton in JobHistory during load
- Shimmer effect on progress bar during polling

**Spinners**:
- Upload button during mutation
- Download button during blob fetch
- Settings test connection button

**Optimistic Updates**:
- Add job to list immediately on upload (before response)
- Update to actual job_id on response

### Error Handling Strategy

**Toast Notifications** (sonner):
- **Upload success**: "Job created: abc-123" (5s duration)
- **Upload error**: "Invalid PDF: {error.detail}" (persistent until dismissed)
- **Download ready**: "PDF ready for download" (3s duration)
- **Network error**: "Connection lost. Retrying..." (auto-dismiss on reconnect)

**Inline Error Display**:
- JobCard shows error.detail message in red box
- Retry button below error message
- Link to troubleshooting docs if available

**Global Error Boundary**:
- Catches React component errors
- Displays fallback UI with "Reset" button
- Logs stack trace to console

### Accessibility Features

**ARIA Attributes**:
- All buttons have `aria-label` describing action
- Progress bars have `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Status badges have `aria-live="polite"` for screen reader updates
- File input has proper label association

**Keyboard Navigation**:
- Tab order: Upload → Settings → Active Jobs → History
- Enter key triggers upload/download actions
- Escape key closes dialogs and popovers
- Focus trap in modal dialogs

**Focus Management**:
- Focus moves to new JobCard on upload
- Focus returns to trigger button on dialog close
- Skip links for keyboard-only users

### Responsive Design

**Breakpoints**:
- Mobile (<640px): Single column, full-width cards
- Tablet (640px-1024px): 2-column grid
- Desktop (>1024px): 3-column grid

**Touch Optimizations**:
- Minimum 44px tap targets
- Swipe gestures for JobCard actions (future)
- Pull-to-refresh for job list (future)

**Layout Adaptations**:
- Settings panel: Slides in from right on mobile (Sheet component)
- Job history table: Horizontal scroll on mobile
- Progress bar: Vertical orientation on narrow screens (optional)

### Dark Mode

**Implementation**:
- shadcn dark mode utilities (built-in)
- Theme toggle button in header (sun/moon icon)
- System preference detection on first load
- Persisted to localStorage

**Color Tokens**:
- All colors use CSS variables from shadcn theme
- Automatic contrast adjustment in dark mode
- Status badge colors optimized for both themes

---

## Test Scenarios

### 1. Happy Path: EPA.pdf Processing

**Steps**:
1. Click "Test with EPA.pdf" button
2. Observe job appears in JobList with "queued" status
3. Watch progress bar animate through all 7 stages
4. Verify stage labels update correctly
5. Download button appears when status becomes "ready"
6. Click download → browser saves `epa_fillable.pdf`
7. Job moves to JobHistory table

**Expected Metrics** (based on real backend testing):
- Total duration: ~25s with FAST_MODE (ONNX), ~5-6min without (not recommended)
- Stage transitions: All 7 stages visited (queued → validating → rendering → detecting → writing → ready)
- Fields detected: ~288 textboxes, ~43 choice buttons (FAST_MODE gives better results)
- Per-page inference: ~1s with ONNX, ~12s with PyTorch+augmentation

**Validation**:
- Open downloaded PDF in Adobe Acrobat
- Verify form fields are fillable and focusable
- Check tab order follows reading order

### 2. Error Case: Encrypted PDF

**Steps**:
1. Upload `public/encrypted.pdf` (copy from `packages/commonforms-core/tests/resources/`)
2. Observe job progresses to "validating" stage
3. Status changes to "failed"
4. JobCard displays red error state

**Expected Error**:
```json
{
  "error": {
    "type": "EncryptedPdfError",
    "detail": "Password-protected PDFs are not supported"
  }
}
```

**UI Behavior**:
- Error message displayed in JobCard
- Toast notification with error details
- Job added to history with failed status
- Retry button allows re-upload

### 3. Invalid File Upload

**Steps**:
1. Attempt to upload `.txt` file
2. Attempt to upload empty file
3. Attempt to upload 100MB PDF (exceeds limit)

**Expected Behavior**:
- Validation error before upload mutation
- Toast notification: "Invalid file type. PDF only."
- Toast notification: "File too large. Max 50MB."
- Upload button remains disabled

### 4. Concurrency Testing

**Steps**:
1. Add "Batch Upload" test button (uploads 5× EPA.pdf)
2. Click batch upload
3. Observe 5 JobCards appear simultaneously

**Expected Behavior**:
- Some jobs show "queued" (waiting for capacity)
- Others show "validating" or "rendering" (processing)
- Queue depth indicator updates: "2 processing, 3 queued"
- All jobs eventually complete successfully

**Validation**:
- Max concurrent jobs matches backend semaphore limit
- No job failures due to resource contention
- Total time < 5× single job time (parallelism working)

### 5. Persistence and Recovery

**Steps**:
1. Upload job and wait until "rendering" stage
2. Close browser tab
3. Reopen app in new tab

**Expected Behavior**:
- Active jobs resume polling from localStorage
- Progress continues from where it left off
- History persists across sessions

**Implementation**:
- useEffect on mount checks localStorage for active jobs
- Rehydrate polling for incomplete jobs
- Clear stale jobs older than 1 hour

### 6. Settings Configuration

**Steps**:
1. Open SettingsPanel
2. Change backend URL to staging environment
3. Adjust poll interval to 5000ms
4. Click "Test Connection"

**Expected Behavior**:
- Settings save to localStorage immediately
- Test connection shows success/failure status
- New uploads use updated backend URL
- Polling interval changes take effect on next refetch

### 7. Network Failure Handling

**Steps**:
1. Upload job successfully
2. Disable network (Chrome DevTools → Offline)
3. Observe polling behavior
4. Re-enable network

**Expected Behavior**:
- Header shows "Offline" badge
- Polling requests fail gracefully (no error toasts)
- Status remains unchanged (stale data displayed)
- Auto-resume polling when network returns
- Toast notification: "Connection restored"

---

## Performance Optimization

### Bundle Size

**Target**: <500KB gzipped

**Strategies**:
- Tree-shake unused shadcn components
- Code-split JobHistory component (lazy load)
- Externalize large dependencies (date-fns, etc.)
- Use Vite's rollup config for optimization

**Measurement**:
```bash
bun run build
# Analyze dist/assets/*.js sizes
```

### Rendering Performance

**Optimizations**:
- React.memo for JobCard (prevent re-renders)
- useMemo for expensive calculations (metrics)
- useCallback for event handlers passed to children
- Virtual scrolling for JobHistory (if >100 items)

**Monitoring**:
- React DevTools Profiler
- Chrome Performance tab
- Lighthouse performance score >90

### Network Efficiency

**Polling Optimization**:
- Exponential backoff for failed polls (future)
- Batch status requests for multiple jobs (future)
- HTTP/2 multiplexing (backend support required)

**Caching**:
- TanStack Query cache prevents duplicate requests
- localStorage reduces initial load time

---

## Deployment

### Build Configuration

**Vite Config** (`vite.config.ts`):
```typescript
export default defineConfig({
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          query: ['@tanstack/react-query'],
          ui: ['sonner', 'react-dropzone']
        }
      }
    }
  }
})
```

**Environment Variables**:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_DEFAULT_POLL_INTERVAL=2000
VITE_MAX_FILE_SIZE_MB=50
```

### Deployment Strategy

**Current Focus**: Local development only

**Development Setup**:
```bash
# Terminal 1: Start backend
cd apps/inference-api
COMMONFORMS_FAST_MODE=true \
COMMONFORMS_CORS_ORIGINS='["http://localhost:5173"]' \
uv run uvicorn app.main:app --reload --port 8000

# Terminal 2: Start frontend
cd apps/tester-ui
bun run dev
```

**Future Deployment Options** (Phase 2):

1. **Static Hosting** (Vercel, Netlify, Cloudflare Pages)
   - Build: `bun run build --filter=tester-ui`
   - Deploy: `dist/` folder
   - Requires: Backend API accessible from deployed frontend

2. **FastAPI Static Hosting** (Single deployment unit)
   ```python
   # In apps/inference-api/app/main.py
   from fastapi.staticfiles import StaticFiles

   app.mount("/tester", StaticFiles(
       directory="../tester-ui/dist",
       html=True
   ), name="tester")
   ```
   - Pros: Single deployment, no CORS complexity
   - Cons: Frontend changes require backend rebuild

3. **Docker Compose** (Development/staging)
   - Backend + Frontend in separate containers
   - Nginx reverse proxy for routing
   - Shared network for internal communication

**Deployment deferred**: Focus on core functionality first. Deployment strategy depends on:
- Backend hosting requirements (GPU access, scaling needs)
- Security requirements (authentication, rate limiting)
- User access patterns (internal tool vs public service)

---

## Code Quality

### Linting and Formatting

**Ultracite Integration**:
- Monorepo root `biome.jsonc` applies to all TypeScript files
- No app-specific configuration needed
- Same rules as chrome-extension and other apps

**Pre-commit Hook**:
```yaml
# .pre-commit-config.yaml (root)
- id: ultracite-format
  name: Format TypeScript/JavaScript
  entry: bun run format
  language: system
  files: \.(ts|tsx|js|jsx)$
```

**Commands**:
```bash
# Format tester-ui files
bun run format --filter=tester-ui

# Check without fixing
bun run format:check --filter=tester-ui

# Full validation
bun run validate --filter=tester-ui
```

### Type Safety

**Strict TypeScript**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

**Type Coverage Goal**: 100% (no `any` types)

**Branded Types**:
```typescript
// Prevent job_id string confusion
type JobId = string & { __brand: 'JobId' }
```

### Testing Strategy

**Unit Tests** (future):
- Vitest for utility functions
- React Testing Library for components
- Mock API responses with MSW

**E2E Tests** (future):
- Playwright for critical user flows
- Test against real backend in CI

**Manual Testing Checklist**:
- [ ] All test scenarios pass (see Test Scenarios section)
- [ ] No console errors in production build
- [ ] Lighthouse score >90
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Mobile responsive (375px, 768px, 1024px)

---

## Documentation

### README.md (`apps/tester-ui/README.md`)

**Sections**:
1. **Purpose**: Development tool for testing job API
2. **Features**: Upload, poll, download, history, settings
3. **Setup**: `bun install`, copy `epa.pdf` to public/
4. **Development**: `bun run dev`
5. **Build**: `bun run build`
6. **Environment Variables**: Document all `VITE_*` vars
7. **Deployment**: Vercel instructions
8. **Troubleshooting**: CORS, connection errors, file size limits

### Inline Documentation

**JSDoc Standards**:
```typescript
/**
 * Uploads a PDF file and creates a new processing job.
 *
 * @param file - PDF file to process
 * @param options - Optional model/device configuration
 * @returns Promise resolving to job creation response
 * @throws {Error} If file is invalid or upload fails
 *
 * @example
 * const response = await uploadJob(pdfFile, { fast: true })
 * console.log(response.job_id)
 */
export async function uploadJob(
  file: File,
  options?: JobOptions
): Promise<JobCreateResponse>
```

**Component Documentation**:
- Props interfaces with TSDoc comments
- Usage examples in component file header
- Accessibility notes for complex interactions

---

## Future Enhancements

### Phase 2 Features (Post-MVP)

**Advanced Functionality**:
- **Job cancellation**: DELETE /jobs/{job_id} endpoint + Cancel button in JobCard
- **Timing breakdown visualization**: Per-stage duration chart using recharts to identify bottlenecks
- Webhook support (register callback URL instead of polling)
- Batch folder upload (process multiple PDFs)
- PDF preview with before/after comparison (pdf.js integration)
- Field inspection view (visualize bounding boxes overlaid on PDF)
- Performance charts (recharts - graph job durations over time)

**Developer Tools**:
- Export metrics as JSON for analysis
- Mock mode (test UI without backend)
- Storybook for component documentation
- Playwright E2E tests

**Integration**:
- Extract reusable components to `packages/job-ui`
- Import into `apps/chrome-extension`
- Shared API client and types package

### Multi-Environment Support

**Environment Switcher**:
- Dropdown in settings: Local | Staging | Production
- Pre-configured URLs for each environment
- Health check indicators per environment

### Collaboration Features

**Potential Additions**:
- Share job_id link (public access with token)
- Job history sync across devices (backend storage)
- Team dashboard (view all jobs from organization)

---

## Success Criteria

### Functional Requirements
- [ ] `bun run dev --filter=tester-ui` starts dev server on port 5173
- [ ] Upload EPA.pdf → observe all 7 stage transitions → download result
- [ ] Upload encrypted.pdf → status becomes "failed" with clear error message
- [ ] Upload 3 PDFs concurrently → all complete successfully
- [ ] Settings persist across page reloads (localStorage)
- [ ] Dark mode toggle works, preference persisted
- [ ] JobHistory table displays completed jobs with correct metrics

### Quality Requirements
- [ ] No console errors/warnings in production build
- [ ] TypeScript compiles with zero errors
- [ ] Ultracite linting passes (no format issues)
- [ ] Lighthouse performance score >90
- [ ] Bundle size <500KB gzipped
- [ ] Mobile responsive (tested on 375px, 768px, 1024px viewports)

### Development Requirements
- [ ] Local development setup documented
- [ ] Backend starts with correct CORS configuration
- [ ] Frontend connects to backend successfully
- [ ] Environment variables properly configured for localhost

### User Experience
- [ ] Upload flow intuitive (drag-drop works)
- [ ] Progress updates feel responsive (<2s lag perception)
- [ ] Error messages actionable (user knows what to fix)
- [ ] Loading states prevent confusion
- [ ] Keyboard navigation functional
- [ ] Dark mode color contrast meets WCAG AA standards

---

## Implementation Timeline

### MVP Scope (1 Week)

**Day 1: Foundation**
- Scaffold with `bun init --react=shadcn`
- Install dependencies (TanStack Query, ky, Zustand, etc.)
- Configure Turborepo pipeline
- Set up directory structure
- **Copy test fixtures**: `cp docs/epa.pdf public/` and `cp packages/commonforms-core/tests/resources/encrypted.pdf public/`

**Day 2: API Layer**
- Implement ky HTTP client (`client.ts`)
- Create job API methods (`jobs.ts`)
- Define TypeScript types (`types.ts`)
- Configure TanStack Query client

**Day 3: Core Components**
- JobUploader with drag-drop
- JobCard with progress display
- JobList container
- Basic layout (Header, Container)

**Day 4: State & Hooks**
- Settings Zustand store
- History Zustand store
- useJobPoller custom hook
- useJobMetrics custom hook

**Day 5: Polish & Testing**
- JobHistory table component
- SettingsPanel form
- Error handling and toasts
- Manual test all scenarios
- Documentation (README)

### Full Implementation (3 Weeks)

**Week 1**: Foundation + API + Basic Components (as above)

**Week 2**: Enhanced UX
- JobProgress stepper component
- Responsive design refinements
- Dark mode implementation
- Accessibility audit and fixes
- Performance optimization

**Week 3**: Advanced Features
- JobHistory filters and pagination
- Metrics export to CSV
- Network error recovery
- Local development optimization
- E2E testing with Playwright (optional)
- Comprehensive documentation

---

## Resolved Questions (from Backend Testing)

### Technical Decisions
1. **Polling strategy**: ✅ **Fixed 2s interval** - Adequate for ~25s jobs with fast mode. Exponential backoff unnecessary since fast mode completes quickly.
2. **Job cleanup**: ✅ **Purge after 1 hour** - Sync with backend TTL (3600s default via `CLEANUP_TTL_SECONDS`).
3. **Download behavior**: ✅ **Browser download dialog** - Manual click triggers `<a download>` element. No auto-download.
4. **Metrics granularity**: ✅ **Stage-level for MVP** - Backend doesn't expose per-page progress yet. Add later if valuable.

### Backend Integration
5. **CORS configuration**: ✅ **`["http://localhost:5173"]`** - Localhost only for development. Custom validator prevents accidental exposure.
6. **Health endpoint**: ⚠️ **Needs implementation** - Add `GET /health` → `{"status": "ok", "max_concurrent": 2, "fast_mode": true}`
7. **Job expiration**: ✅ **3600s (1 hour)** - After cleanup, endpoint returns 410 Gone (already implemented).
8. **Rate limiting**: ✅ **No rate limiting currently** - Max 2 concurrent jobs via semaphore. Add later if needed.

### Product Decisions
9. **Primary users**: ✅ **Developers initially** - Can evolve to non-technical users. UI simple enough for both.
10. **Deployment priority**: ✅ **Local development focus** - Deployment strategy deferred to Phase 2.
11. **Analytics**: ⏳ **Deferred to Phase 2** - Focus on core functionality first.

### Backend Requirements (To Implement)
- [ ] Add `GET /health` endpoint returning `{"status": "ok", "max_concurrent": int, "fast_mode": bool}`
- [ ] Configure CORS for localhost development (see implementation below)
- [ ] Ensure `COMMONFORMS_FAST_MODE=true` is default/recommended in docs (✅ already updated in CLAUDE.md)

### Backend CORS Implementation

**Location**: `apps/inference-api/app/main.py`

**Development Setup** (localhost only):
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings

app = FastAPI(
    title="CommonForms Inference API",
    lifespan=lifespan,
)

# CORS Configuration for local development
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,        # ["http://localhost:5173"]
        allow_methods=["*"],                        # GET, POST, OPTIONS
        allow_headers=["*"],                        # Content-Type, etc.
        allow_credentials=True,
    )
```

**Configuration** (`apps/inference-api/app/config.py`):
```python
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # ... existing settings ...

    cors_origins: List[str] = Field(default_factory=list)

    @field_validator('cors_origins')
    @classmethod
    def validate_origins(cls, v: List[str]) -> List[str]:
        """Validate that origins are localhost or explicitly approved domains."""
        allowed_patterns = [
            'http://localhost',
            'https://localhost',
        ]

        for origin in v:
            if not any(origin.startswith(pattern) for pattern in allowed_patterns):
                raise ValueError(
                    f"Origin {origin} not allowed. Only localhost origins permitted in development."
                )

        return v
```

**Environment Variable**:
```bash
# .env or export command
COMMONFORMS_CORS_ORIGINS='["http://localhost:5173"]'
```

**Why Custom Validation**:
1. **Security**: Prevents accidental exposure to public origins
2. **Explicitness**: Forces intentional configuration for non-localhost origins
3. **Extensibility**: Easy to add patterns for staging/production later
4. **Development Focus**: Enforces localhost-only development workflow

**Testing CORS**:
```bash
# Preflight request
curl -X OPTIONS http://localhost:8000/jobs \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected headers in response:
# Access-Control-Allow-Origin: http://localhost:5173
# Access-Control-Allow-Methods: GET, POST, OPTIONS
# Access-Control-Allow-Credentials: true
```

---

## Backend Performance Insights (from Testing)

### Fast Mode (ONNX) vs Regular Mode (PyTorch)

**Test Results with EPA.pdf (15 pages)**:

| Metric | Fast Mode (ONNX) | Regular Mode (PyTorch) |
|--------|------------------|------------------------|
| **Total Time** | ~25 seconds | ~5-6 minutes |
| **Per-Page Inference** | ~1 second | ~12 seconds |
| **Resolution** | 1216×1216 | 1600×1600 |
| **Augmentation** | No | Yes (multiple passes) |
| **Text Fields Detected** | 288 | 37 |
| **Choice Buttons Detected** | ~43 | ~11 |
| **Detection Quality** | ✅ Excellent | ❌ Poor (87% missed) |
| **Speed Factor** | ✅ Baseline | ❌ 15x slower |

### Recommendation

**Always use `COMMONFORMS_FAST_MODE=true`**:
- ✅ **15x faster** processing
- ✅ **Better detection quality** (288 vs 37 fields)
- ✅ **Lower resource usage** (no augmentation overhead)
- ✅ **Simpler processing** (one pass per page)

Regular mode's augmentation + higher resolution **degrade quality** while being much slower. Fast mode is superior for production use.

### UI Design Implications

**Expected Job Duration**:
- With fast mode: ~25s for 15-page document (~1.7s per page)
- Poll interval of 2000ms (2s) provides good user experience
- Progress updates feel responsive without overwhelming backend

**User Feedback Strategy**:
- Show stage name + progress bar (users see activity within 2s)
- Estimated time remaining based on average (display "~25s remaining")
- No need for "this is taking a while" messaging with fast mode

---

## Recommended Next Steps

### Before Implementation

1. **Add backend /health endpoint**: Implement in `apps/inference-api/app/api.py`
2. **Configure CORS**: Update `apps/inference-api/app/config.py` to allow `http://localhost:5173`
3. **Verify fast mode**: Ensure backend starts with `COMMONFORMS_FAST_MODE=true`

### Frontend Scaffolding (Day 1)

1. **Scaffold app**: `cd apps && mkdir tester-ui && cd tester-ui && bun init --react=shadcn`
2. **Copy test fixtures**:
   - `cp ../../docs/epa.pdf public/`
   - `cp ../../packages/commonforms-core/tests/resources/encrypted.pdf public/`
3. **Install dependencies**: Add TanStack Query, ky, Zustand, react-dropzone, sonner, date-fns
4. **Configure Turborepo**: Add tester-ui tasks to `turbo.json`

### Implementation (Day 2-5)

5. **Follow MVP timeline**: API layer → Components → State → Polish
6. **Test all scenarios**: Happy path, error cases, concurrency
7. **Validate metrics**: Confirm ~25s processing time with EPA.pdf

### Testing & Iteration

8. **Test with real PDFs**: Validate with EPA.pdf and other test files
9. **Monitor performance**: Collect timing data, error rates, detection quality
10. **Iterate**: Add Phase 2 features based on real-world needs

**Recommendation**: Start with **MVP scope (1 week)** to validate architecture and UX patterns. Backend testing confirms performance expectations are realistic. Ready to implement when backend prerequisites are completed.
