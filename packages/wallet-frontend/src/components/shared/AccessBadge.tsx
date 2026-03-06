import { Badge } from '@/components/ui/badge';

interface AccessBadgeProps {
  access: 'RW' | 'RO' | 'N/A' | string;
}

const variantMap: Record<string, 'success' | 'info' | 'outline' | 'secondary'> = {
  RW: 'success',
  RO: 'info',
  'N/A': 'outline',
};

export function AccessBadge({ access }: AccessBadgeProps) {
  const variant = variantMap[access] ?? 'secondary';
  return <Badge variant={variant}>{access}</Badge>;
}
