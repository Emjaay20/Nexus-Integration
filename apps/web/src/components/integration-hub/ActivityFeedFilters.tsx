'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';

export function ActivityFeedFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentStatus = searchParams.get('status') || 'all';

    const handleFilter = (status: string) => {
        const params = new URLSearchParams(searchParams);
        if (status === 'all') {
            params.delete('status');
        } else {
            params.set('status', status);
        }
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="flex items-center gap-2 mb-4">
            <FilterButton
                active={currentStatus === 'all'}
                onClick={() => handleFilter('all')}
                label="All Activity"
            />
            <FilterButton
                active={currentStatus === 'failure'}
                onClick={() => handleFilter('failure')}
                label="Failed"
                color="red"
            />
            <FilterButton
                active={currentStatus === 'success'}
                onClick={() => handleFilter('success')}
                label="Success"
                color="green"
            />
        </div>
    );
}

function FilterButton({ active, onClick, label, color = 'blue' }: { active: boolean, onClick: () => void, label: string, color?: 'blue' | 'red' | 'green' }) {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-colors border",
                active
                    ? color === 'red' ? "bg-red-100 text-red-700 border-red-200"
                        : color === 'green' ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-blue-100 text-blue-700 border-blue-200"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            )}
        >
            {label}
        </button>
    );
}
