# Visual Builder Suite (Future Feature)

> **Note**: This document describes Phase A functionality (post-MVP). The MVP focuses on Data Import and Campaign Management. See [10-future/README.md](./README.md) for implementation timeline.

---

# Visual Builder Suite

## Overview

The Visual Builder Suite provides drag-and-drop interfaces for creating campaign automation flows, audience segments, and custom dashboards without writing code. All builders use React Flow for consistent, intuitive visual editing.

## Builder Types

| Builder | Purpose | Output |
|---------|---------|--------|
| Campaign Flow Builder | Create automated marketing workflows | campaign_flows |
| Audience Segment Builder | Define dynamic audience rules | audience_segments |
| Dashboard Builder | Design custom analytics views | custom_dashboards |

## Campaign Flow Builder

### Overview
Create automated marketing workflows that trigger actions based on events, time, or audience membership.

### Node Types

#### Triggers (Entry Points)
| Node | Description | Configuration |
|------|-------------|---------------|
| Manual | User manually starts flow | None |
| Scheduled | Time-based trigger | Date/time, recurrence |
| Segment Entry | When contact enters segment | Segment selection |
| Event | On custom event | Event type, conditions |
| Form Submit | When form is submitted | Form selection |

#### Conditions (Branching)
| Node | Description | Configuration |
|------|-------------|---------------|
| If/Else | Binary branching | Condition expression |
| A/B Split | Percentage-based split | Split percentages |
| Wait | Delay execution | Duration |
| Segment Check | Check membership | Segment selection |

#### Actions (Outputs)
| Node | Description | Configuration |
|------|-------------|---------------|
| Send Email | Send email message | Template, personalization |
| Send SMS | Send SMS message | Template, personalization |
| Send Social | Publish social post | Platform, content |
| Add to Segment | Add contact to segment | Segment selection |
| Remove from Segment | Remove from segment | Segment selection |
| Webhook | Call external URL | URL, payload |
| Update Field | Update contact field | Field, value |

### User Interface

```
┌─────────────────────────────────────────────────────────┐
│  Flow Builder Toolbar                         [Save]    │
├────────────┬────────────────────────────────────────────┤
│            │                                            │
│  Node      │         Canvas (React Flow)                │
│  Palette   │                                            │
│            │    ┌──────────┐                            │
│  Triggers  │    │ Trigger  │                            │
│  ○ Manual  │    └────┬─────┘                            │
│  ○ Event   │         │                                  │
│            │    ┌────┴─────┐                            │
│  Conditions│    │ If/Else  │                            │
│  ○ If/Else │    └──┬───┬───┘                            │
│  ○ Wait    │       │   │                                │
│            │    ┌──┴┐ ┌┴──┐                             │
│  Actions   │    │SMS│ │Eml│                             │
│  ○ Email   │    └───┘ └───┘                             │
│  ○ SMS     │                                            │
│            │                                            │
└────────────┴────────────────────────────────────────────┘
```

### Flow Data Structure
```typescript
interface CampaignFlow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  is_active: boolean;
  trigger_type: 'manual' | 'scheduled' | 'event' | 'segment_entry';
  trigger_config: Record<string, unknown>;
}

interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  data: {
    nodeType: string;
    config: Record<string, unknown>;
    label: string;
  };
  position: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}
```

## Audience Segment Builder

### Overview
Define dynamic audience segments using a visual rule builder. Segments automatically update as contacts match or unmatch criteria.

### Rule Structure
```
Segment: "Engaged Email Subscribers"
├── AND
│   ├── email_subscribed = true
│   ├── last_email_opened < 7 days ago
│   └── OR
│       ├── total_purchases > 0
│       └── engagement_score > 50
```

### Supported Operators

#### String Fields
- equals, not_equals
- contains, not_contains
- starts_with, ends_with
- is_empty, is_not_empty

#### Number Fields
- equals, not_equals
- greater_than, less_than
- between

#### Date Fields
- before, after
- in_last_days, in_next_days
- between

#### Boolean Fields
- is_true, is_false

### Available Fields
| Category | Fields |
|----------|--------|
| Contact Info | email, phone, first_name, last_name |
| Engagement | last_email_opened, last_sms_clicked, last_purchase |
| Activity | signup_date, last_active, total_purchases |
| Custom | Any field in contact metadata |

### User Interface

```
┌─────────────────────────────────────────────────────────┐
│  Segment Builder                              [Save]    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Segment Name: [Engaged Email Subscribers          ]    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Match ALL of the following (AND)            [+] │   │
│  │                                                  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ email_subscribed  [equals ▼]  [true    ▼] │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │ last_email_opened [in last ▼]  [7 days  ] │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  │                                                  │   │
│  │  ┌─────────────────────────────────────────┐    │   │
│  │  │ Match ANY of the following (OR)     [+] │    │   │
│  │  │  • total_purchases > 0                  │    │   │
│  │  │  • engagement_score > 50                │    │   │
│  │  └─────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Estimated Size: ~2,450 contacts          [Preview]     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Segment Data Structure
```typescript
interface AudienceSegment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRule[];
  estimated_size?: number;
  is_dynamic: boolean;
}

interface SegmentRule {
  id: string;
  type: 'condition' | 'group';
  // For condition:
  field?: string;
  operator?: string;
  value?: unknown;
  // For group:
  logic?: 'AND' | 'OR';
  rules?: SegmentRule[];
}
```

## Dashboard Builder

### Overview
Create custom dashboards by arranging widgets on a grid layout. Widgets display real-time metrics, charts, and data tables.

### Widget Types

| Widget | Description | Configuration |
|--------|-------------|---------------|
| Metric | Single number with trend | Data source, comparison period |
| Line Chart | Time series visualization | Metrics, date range |
| Bar Chart | Comparison view | Metrics, grouping |
| Pie Chart | Distribution view | Metric, segments |
| Table | Data grid | Columns, sorting, filters |
| Text | Markdown content | Content |

### Grid System
- 12-column responsive grid
- Minimum widget size: 2 columns x 2 rows
- Drag to reposition, resize handles on corners

### User Interface

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard Editor                             [Save]    │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬───────────────────────────┐   │
│  │ Sessions │ Users    │                           │   │
│  │  12,450  │  8,234   │     [Line Chart]          │   │
│  │  ↑ 12%   │  ↑ 8%    │     Sessions over time    │   │
│  ├──────────┴──────────┤                           │   │
│  │                     │                           │   │
│  │   [Bar Chart]       ├───────────────────────────┤   │
│  │   Top Pages         │                           │   │
│  │                     │     [Pie Chart]           │   │
│  │                     │     Traffic Sources       │   │
│  │                     │                           │   │
│  ├─────────────────────┴───────────────────────────┤   │
│  │                                                  │   │
│  │              [Data Table]                        │   │
│  │              Recent Campaigns                    │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  Widget Library: [Metric] [Line] [Bar] [Pie] [Table]   │
└─────────────────────────────────────────────────────────┘
```

### Dashboard Data Structure
```typescript
interface CustomDashboard {
  id: string;
  name: string;
  description?: string;
  layout: DashboardWidget[];
  is_default: boolean;
  is_shared: boolean;
}

interface DashboardWidget {
  id: string;
  type: 'metric' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'table' | 'text';
  title: string;
  dataSource: WidgetDataSource;
  layout: { x: number; y: number; w: number; h: number };
  options: Record<string, unknown>;
}

interface WidgetDataSource {
  table: string;
  metrics: string[];
  dimensions?: string[];
  filters?: Filter[];
  dateRange: DateRange;
}
```

## State Management

Each builder uses a dedicated Zustand store for state management:

### Flow Builder Store
```typescript
const useFlowBuilderStore = create<FlowBuilderState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isDirty: false,

  addNode: (node) => { ... },
  updateNode: (id, data) => { ... },
  removeNode: (id) => { ... },
  onNodesChange: (changes) => { ... },
  onEdgesChange: (changes) => { ... },
  save: async () => { ... },
}));
```

## Validation

### Flow Validation Rules
- Exactly one trigger node required
- All nodes must be connected
- No circular references
- Action nodes must have valid configuration

### Segment Validation Rules
- At least one condition required
- All conditions must have field, operator, and value
- Nested groups must contain at least one rule

### Dashboard Validation Rules
- At least one widget required
- No overlapping widgets
- All widgets must have valid data sources

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save |
| Ctrl+Z | Undo |
| Ctrl+Y | Redo |
| Delete | Remove selected |
| Ctrl+D | Duplicate selected |
| Ctrl+A | Select all |

## Best Practices

1. **Name Clearly** - Use descriptive names for flows, segments, and dashboards
2. **Test First** - Use flow test runner before activating
3. **Start Simple** - Begin with basic flows, add complexity gradually
4. **Monitor Performance** - Check segment calculation times for complex rules
5. **Document** - Add descriptions explaining business logic
