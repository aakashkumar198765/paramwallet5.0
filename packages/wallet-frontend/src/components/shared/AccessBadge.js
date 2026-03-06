import { jsx as _jsx } from "react/jsx-runtime";
import { Badge } from '@/components/ui/badge';
const variantMap = {
    RW: 'success',
    RO: 'info',
    'N/A': 'outline',
};
export function AccessBadge({ access }) {
    const variant = variantMap[access] ?? 'secondary';
    return _jsx(Badge, { variant: variant, children: access });
}
