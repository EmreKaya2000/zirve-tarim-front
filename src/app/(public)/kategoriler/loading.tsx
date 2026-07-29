import { Skeleton } from '@zirve/ui';

import { TileGridSkeleton } from '@/components/public/states';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-4 h-10 w-56" />

      <div className="mt-8">
        <TileGridSkeleton />
      </div>
    </div>
  );
}
