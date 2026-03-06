import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from '@/components/ui/badge';
import { capitalize } from '@/lib/utils';
const stateColorMap = {
    active: 'success',
    approved: 'success',
    completed: 'success',
    pending: 'warning',
    review: 'warning',
    draft: 'secondary',
    rejected: 'destructive',
    cancelled: 'destructive',
    processing: 'info',
};
function getVariant(state) {
    return stateColorMap[state.toLowerCase()] ?? 'secondary';
}
export function StateBadge({ state, subState, microState }) {
    const label = [state, subState, microState].filter((s) => !!s).map(capitalize).join(' › ');
    return _jsx(Badge, { variant: getVariant(state), children: label });
}
