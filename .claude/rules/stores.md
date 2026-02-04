---
description: Zustand store development rules
globs: src/stores/**/*
---

# Zustand Store Rules

## Naming Convention
- File: `camelCaseStore.ts` (e.g., `campaignStore.ts`)
- Hook: `useStoreName` (e.g., `useCampaignStore`)

## Structure Template
```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CampaignState {
  // State
  campaigns: Campaign[];
  selectedId: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  setCampaigns: (campaigns: Campaign[]) => void;
  selectCampaign: (id: string | null) => void;
  fetchCampaigns: () => Promise<void>;
  reset: () => void;
}

const initialState = {
  campaigns: [],
  selectedId: null,
  loading: false,
  error: null,
};

export const useCampaignStore = create<CampaignState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setCampaigns: (campaigns) => set({ campaigns }),

        selectCampaign: (id) => set({ selectedId: id }),

        fetchCampaigns: async () => {
          set({ loading: true, error: null });
          try {
            const campaigns = await campaignService.getAll();
            set({ campaigns, loading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Unknown error',
              loading: false
            });
          }
        },

        reset: () => set(initialState),
      }),
      {
        name: 'gimbal-campaign-store',
        partialize: (state) => ({ selectedId: state.selectedId }),
      }
    ),
    { name: 'CampaignStore' }
  )
);
```

## Selector Pattern
Create selectors for computed values:
```tsx
// In store file
export const selectActiveCampaigns = (state: CampaignState) =>
  state.campaigns.filter(c => c.status === 'active');

// Usage
const activeCampaigns = useCampaignStore(selectActiveCampaigns);
```

## Persistence
- Use `persist` middleware for user preferences
- Always use `gimbal-` prefix for storage key
- Use `partialize` to persist only necessary state
- Never persist sensitive data (tokens, passwords)

## DevTools
- Always wrap with `devtools` in development
- Provide descriptive store name

## Actions
- Actions should be async when calling services
- Set loading state before async operations
- Handle errors with try/catch
- Include reset action for cleanup

## Store Organization
```
src/stores/
├── authStore.ts        # Authentication state
├── campaignStore.ts    # Campaign management
├── uiStore.ts          # UI state (modals, toasts, theme)
└── instanceStore.ts    # Instance configuration (white-label)
```

## Cross-Store Communication
Avoid direct store-to-store calls. Use React components to orchestrate:
```tsx
function Container() {
  const { user } = useAuthStore();
  const { fetchCampaigns } = useCampaignStore();

  useEffect(() => {
    if (user) fetchCampaigns();
  }, [user]);
}
```
