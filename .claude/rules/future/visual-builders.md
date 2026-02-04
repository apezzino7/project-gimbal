# Visual Builder Rules (Future Feature)

> **Note**: These rules apply to Phase A development (post-MVP). The MVP focuses on Data Import and Campaign Management.

---

## Builder Types

| Builder | Purpose | Storage Table |
|---------|---------|---------------|
| Campaign Flow | Automation workflows | `campaign_flows` |
| Audience Segment | Dynamic audience rules | `audience_segments` |
| Dashboard | Custom metric layouts | `custom_dashboards` |

## Technology Stack

- **React Flow** - Node-based visual editor
- **Zustand** - Builder state management
- **Zod** - Configuration validation

## File Structure
```
src/
├── components/builders/
│   ├── flow/
│   │   ├── FlowBuilder.tsx
│   │   ├── FlowSidebar.tsx
│   │   ├── FlowToolbar.tsx
│   │   └── nodes/
│   │       ├── TriggerNode.tsx
│   │       ├── ConditionNode.tsx
│   │       ├── ActionNode.tsx
│   │       └── WaitNode.tsx
│   ├── segment/
│   │   ├── SegmentBuilder.tsx
│   │   ├── RuleGroup.tsx
│   │   ├── RuleCondition.tsx
│   │   └── SegmentPreview.tsx
│   └── dashboard/
│       ├── DashboardEditor.tsx
│       ├── WidgetLibrary.tsx
│       ├── WidgetConfig.tsx
│       └── widgets/
│           ├── MetricWidget.tsx
│           ├── ChartWidget.tsx
│           └── TableWidget.tsx
├── services/builders/
│   ├── flowService.ts
│   ├── flowExecutor.ts
│   ├── segmentService.ts
│   └── dashboardService.ts
└── stores/
    ├── flowBuilderStore.ts
    ├── segmentBuilderStore.ts
    └── dashboardBuilderStore.ts
```

## Campaign Flow Builder

### Node Types

**Triggers (entry points):**
- `manual` - Manual trigger by user
- `scheduled` - Time-based trigger
- `segment_entry` - When contact enters segment
- `event` - On custom event (form submit, page visit)

**Conditions (branching):**
- `if_else` - Binary branching on condition
- `split` - A/B testing split (percentage-based)
- `wait` - Delay for time period
- `segment_check` - Check segment membership

**Actions (outputs):**
- `send_sms` - Send SMS message
- `send_email` - Send email
- `send_social` - Publish social post
- `add_to_segment` - Add contact to segment
- `remove_from_segment` - Remove from segment
- `webhook` - Call external webhook
- `update_field` - Update contact field

### Node Data Structure
```typescript
interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  data: {
    nodeType: string;  // e.g., 'send_email', 'if_else'
    config: Record<string, unknown>;
    label: string;
  };
  position: { x: number; y: number };
}
```

### Edge Data Structure
```typescript
interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;  // For branching nodes
  label?: string;  // e.g., 'Yes', 'No' for if/else
}
```

### Flow Execution
```typescript
// Flow executor pattern
async function executeFlow(flowId: string, contactId: string) {
  const flow = await getFlow(flowId);
  const context = { contactId, variables: {} };

  let currentNodeId = findTriggerNode(flow.nodes).id;

  while (currentNodeId) {
    const node = flow.nodes.find(n => n.id === currentNodeId);
    const result = await executeNode(node, context);
    currentNodeId = getNextNode(flow.edges, currentNodeId, result);
  }
}
```

## Audience Segment Builder

### Rule Structure
```typescript
interface SegmentRule {
  id: string;
  type: 'condition' | 'group';
  // For condition:
  field?: string;
  operator?: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value?: unknown;
  // For group:
  logic?: 'AND' | 'OR';
  rules?: SegmentRule[];
}
```

### Supported Fields
- **Contact fields:** email, phone, first_name, last_name, created_at
- **Behavior:** last_email_opened, last_sms_clicked, last_purchase_date
- **Custom fields:** Any JSONB metadata field
- **Computed:** days_since_signup, total_purchases, engagement_score

### Operators by Field Type
| Field Type | Operators |
|------------|-----------|
| String | equals, not_equals, contains, starts_with, ends_with, is_empty |
| Number | equals, greater_than, less_than, between |
| Date | before, after, in_last_days, in_next_days |
| Boolean | is_true, is_false |
| Array | contains, not_contains, is_empty |

### Size Estimation
```typescript
// Real-time size estimation
async function estimateSegmentSize(rules: SegmentRule[]): Promise<number> {
  const query = buildSegmentQuery(rules);
  const { count } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .filter(query);
  return count;
}
```

## Dashboard Builder

### Widget Types
```typescript
type WidgetType =
  | 'metric'      // Single number with trend
  | 'line_chart'  // Time series
  | 'bar_chart'   // Comparison
  | 'pie_chart'   // Distribution
  | 'table'       // Data grid
  | 'text';       // Markdown content
```

### Widget Configuration
```typescript
interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  dataSource: {
    table: string;
    metrics: string[];
    dimensions?: string[];
    filters?: Filter[];
    dateRange?: 'last_7_days' | 'last_30_days' | 'custom';
  };
  layout: {
    x: number;  // Grid position
    y: number;
    w: number;  // Width in grid units
    h: number;  // Height in grid units
  };
  options: Record<string, unknown>;  // Widget-specific options
}
```

### Grid System
- 12-column grid
- Minimum widget size: 2x2
- Responsive breakpoints: mobile (1 col), tablet (6 col), desktop (12 col)

## State Management

### Flow Builder Store
```typescript
interface FlowBuilderState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
  isDirty: boolean;

  // Actions
  addNode: (node: FlowNode) => void;
  updateNode: (id: string, data: Partial<FlowNode['data']>) => void;
  removeNode: (id: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  save: () => Promise<void>;
  reset: () => void;
}
```

## Validation

### Flow Validation
- Every flow must have exactly one trigger node
- All nodes must be connected (no orphans)
- No circular references
- Action nodes must have valid configurations

### Segment Validation
- At least one condition required
- All conditions must have field, operator, and value
- Nested groups must have at least one rule

### Dashboard Validation
- At least one widget required
- No overlapping widgets
- All widgets must have valid data sources

## Accessibility

- Keyboard navigation for all builders
- ARIA labels on all interactive elements
- Focus management when adding/removing items
- Screen reader announcements for state changes

## Testing

### Unit Tests
```typescript
describe('FlowBuilder', () => {
  it('should add node to canvas', () => { ... });
  it('should connect nodes', () => { ... });
  it('should validate flow before save', () => { ... });
});
```

### E2E Tests
```typescript
describe('Campaign Flow Builder', () => {
  it('should create a complete automation flow', () => {
    cy.visit('/flows/new');
    cy.dragNode('trigger', { x: 100, y: 100 });
    cy.dragNode('send_email', { x: 100, y: 200 });
    cy.connectNodes('trigger-1', 'send_email-1');
    cy.get('[data-testid="save-flow"]').click();
  });
});
```
