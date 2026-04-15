
function SkeletonBar({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ChainSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonBar className="h-5 w-1/3" />
      <SkeletonBar className="h-4 w-full" />
      <SkeletonBar className="h-4 w-5/6" />
      <SkeletonBar className="h-4 w-4/6" />
    </div>
  );
}

export function EncumbranceSkeleton() {
  return (
    <div className="p-4 space-y-4">
      <SkeletonBar className="h-5 w-1/4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded p-3 space-y-2">
          <SkeletonBar className="h-4 w-1/2" />
          <SkeletonBar className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function MapSkeleton() {
  return (
    <div className="animate-pulse bg-gray-200 rounded-lg w-full h-48" />
  );
}

export function PipelineSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <SkeletonBar className="h-4 w-2/5" />
      <SkeletonBar className="h-3 w-full" />
    </div>
  );
}

export function WizardStepSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <SkeletonBar className="h-5 w-1/3" />
      <SkeletonBar className="h-10 w-full" />
      <SkeletonBar className="h-10 w-full" />
    </div>
  );
}
