"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
    Search, ChevronRight, Loader2, Download, Target
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type PlatformFilter = 'ALL' | 'META' | 'GOOGLE_ADS' | 'LINKED_IN' | 'INSTAGRAM_DM';
type StatusFilter = 'ALL' | 'ACTIVE' | 'PAUSED';
type MainTab = 'dashboard' | 'all' | 'unassigned' | 'sources' | 'assignments';
type SectionTab = 'direct' | 'campaigns';

interface CampaignMetrics {
    leadCount: number;
    converted: number;
    confirmed: number;
    conversionPct: number;
    confirmedPct: number;
}

interface CampaignCard {
    id: string;
    name: string;
    platform: string;
    platformLabel: string;
    status: 'ACTIVE' | 'PAUSED';
    description: string;
    spend: number;
    assignedLabel: string | null;
    metrics: CampaignMetrics;
}

interface DashboardSummary {
    activeCampaigns: number;
    pausedCampaigns: number;
    totalCampaigns: number;
    totalLeads: number;
    totalConverted: number;
    totalConfirmed: number;
    totalSpend: number;
    totalConversionPct: number;
}

const MAIN_TABS: { id: MainTab; label: string; width?: string }[] = [
    { id: 'dashboard', label: 'Leads dashboard', width: 'w-36' },
    { id: 'all', label: 'View All Leads', width: 'w-28' },
    { id: 'unassigned', label: 'Unassigned', width: 'w-28' },
    { id: 'sources', label: 'Sources', width: 'w-28' },
    { id: 'assignments', label: 'Assignments', width: 'w-28' }
];

const PLATFORM_TABS: { id: PlatformFilter; label: string; width: string }[] = [
    { id: 'ALL', label: 'All', width: 'w-16' },
    { id: 'META', label: 'Meta', width: 'w-16' },
    { id: 'GOOGLE_ADS', label: 'Google Ads', width: 'w-28' },
    { id: 'LINKED_IN', label: 'Linked In', width: 'w-28' },
    { id: 'INSTAGRAM_DM', label: 'Instagram DMs', width: 'w-28' }
];

const LEADS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HR'];

function SegmentedButton({
    active,
    children,
    className = '',
    onClick
}: {
    active: boolean;
    children: React.ReactNode;
    className?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-2.5 text-sm font-medium leading-6 transition-colors outline outline-1 outline-offset-[-1px] outline-[#E6E8EC] ${active
                ? 'bg-[#101828] text-white'
                : 'bg-neutral-50 text-[#344054] hover:bg-slate-100'
                } ${className}`}
        >
            {children}
        </button>
    );
}

function RangeField({
    label,
    min,
    max,
    onMinChange,
    onMaxChange
}: {
    label: string;
    min: string;
    max: string;
    onMinChange: (v: string) => void;
    onMaxChange: (v: string) => void;
}) {
    return (
        <div className="flex flex-col gap-2 min-w-[14rem]">
            <span className="text-[#344054] text-base font-semibold leading-6">{label}</span>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    placeholder="Min"
                    value={min}
                    onChange={(e) => onMinChange(e.target.value)}
                    className="w-20 p-2.5 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-[#E6E8EC] text-sm font-medium text-[#475467] text-center"
                />
                <span className="text-[#344054] text-base font-semibold">-</span>
                <input
                    type="number"
                    placeholder="Max"
                    value={max}
                    onChange={(e) => onMaxChange(e.target.value)}
                    className="w-20 p-2.5 bg-neutral-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-[#E6E8EC] text-sm font-medium text-[#475467] text-center"
                />
            </div>
        </div>
    );
}

function CampaignCardView({ campaign }: { campaign: CampaignCard }) {
    const isPaused = campaign.status === 'PAUSED';

    return (
        <article className="w-full sm:w-80 p-5 bg-white rounded-xl outline outline-[0.60px] outline-offset-[-0.60px] outline-[#D0D5DD] flex flex-col gap-6">
            <div className="flex justify-between items-center gap-2">
                <span className={`px-2.5 py-1 rounded text-xs font-normal leading-4 outline outline-[0.60px] outline-offset-[-0.60px] ${isPaused
                    ? 'bg-orange-100 text-amber-700 outline-amber-400'
                    : 'bg-green-50 text-emerald-700 outline-emerald-500'
                    }`}>
                    {isPaused ? 'Paused' : 'Active'}
                </span>
                {campaign.assignedLabel && (
                    <span className="text-[#475467] text-xs leading-5 tracking-wide text-right">
                        {campaign.assignedLabel}
                    </span>
                )}
            </div>

            <div className="flex flex-col gap-3.5">
                <h3 className="text-black text-sm font-medium leading-5">{campaign.name}</h3>
                {campaign.description ? (
                    <div className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-[#98A2B3] rounded-full shrink-0" />
                        <span className="text-[#667085] text-sm leading-5">{campaign.description}</span>
                    </div>
                ) : (
                    <span className="text-[#98A2B3] text-sm">No description</span>
                )}
            </div>

            <div className="flex gap-2">
                <div className="flex-1 p-2 bg-blue-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-blue-100 text-center">
                    <p className="text-[#1d4ed8] text-base font-bold leading-6">{campaign.metrics.leadCount}</p>
                    <p className="text-[#1d4ed8] text-xs leading-4">Leads</p>
                </div>
                <div className="flex-1 p-2 bg-green-50 rounded-lg outline outline-1 outline-offset-[-1px] outline-green-100 text-center">
                    <p className="text-emerald-700 text-base font-bold leading-6">
                        {campaign.metrics.conversionPct.toFixed(2)}%
                    </p>
                    <p className="text-emerald-700 text-xs leading-4">Conv %</p>
                </div>
            </div>

            <button
                type="button"
                className="flex justify-between items-center text-[#344054] text-sm hover:text-[#101828] transition-colors"
            >
                <span>View Details</span>
                <ChevronRight size={16} className="text-[#344054]" />
            </button>
        </article>
    );
}

export default function LeadsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [mainTab, setMainTab] = useState<MainTab>('dashboard');
    const [sectionTab, setSectionTab] = useState<SectionTab>('direct');
    const [platform, setPlatform] = useState<PlatformFilter>('ALL');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const [convMin, setConvMin] = useState('');
    const [convMax, setConvMax] = useState('');
    const [spendMin, setSpendMin] = useState('');
    const [spendMax, setSpendMax] = useState('');
    const [leadsMin, setLeadsMin] = useState('');
    const [leadsMax, setLeadsMax] = useState('');

    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [summary, setSummary] = useState<DashboardSummary | null>(null);
    const [campaigns, setCampaigns] = useState<CampaignCard[]>([]);

    const hasAccess = user?.role && LEADS_ROLES.includes(user.role);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        if (!authLoading && user && !hasAccess) {
            router.replace('/dashboard');
        }
    }, [authLoading, user, hasAccess, router]);

    const queryParams = useMemo(() => {
        const params: Record<string, string> = {
            platform,
            status: statusFilter
        };
        if (debouncedSearch) params.search = debouncedSearch;
        if (convMin) params.convMin = convMin;
        if (convMax) params.convMax = convMax;
        if (spendMin) params.spendMin = spendMin;
        if (spendMax) params.spendMax = spendMax;
        if (leadsMin) params.leadsMin = leadsMin;
        if (leadsMax) params.leadsMax = leadsMax;
        return params;
    }, [platform, statusFilter, debouncedSearch, convMin, convMax, spendMin, spendMax, leadsMin, leadsMax]);

    const fetchDashboard = useCallback(async () => {
        if (!hasAccess) return;
        setLoading(true);
        try {
            const { data } = await api.get('/leads/dashboard', { params: queryParams });
            setSummary(data.summary);
            setCampaigns(data.campaigns || []);
        } catch {
            toast.error('Failed to load leads dashboard');
        } finally {
            setLoading(false);
        }
    }, [hasAccess, queryParams]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    const handleExport = async () => {
        setExporting(true);
        try {
            const { data } = await api.get('/leads/export', { params: queryParams });
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `leads-report-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Report exported');
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const activeCount = summary?.activeCampaigns ?? 0;
    const pausedCount = summary?.pausedCampaigns ?? 0;
    const totalCampaigns = summary?.totalCampaigns ?? 0;

    if (authLoading || !hasAccess) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
            </div>
        );
    }

    return (
        <div className="p-6 flex flex-col gap-5 max-w-[1200px] mx-auto w-full">
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 min-h-12">
                    <div>
                        <h1 className="text-neutral-900 text-xl font-semibold leading-8">Leads</h1>
                        <p className="text-[#475467] text-xs leading-5">
                            Analyze and compare lead source effectiveness
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleExport}
                        disabled={exporting}
                        className="self-start sm:self-center flex items-center gap-2 p-2.5 bg-[#101828] text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-60"
                    >
                        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        Export Report
                    </button>
                </div>

                <div className="flex flex-wrap">
                    {MAIN_TABS.map((tab, index) => {
                        const isFirst = index === 0;
                        const isLast = index === MAIN_TABS.length - 1;
                        const active = mainTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setMainTab(tab.id)}
                                className={`${tab.width || ''} p-2.5 text-sm font-medium leading-6 outline outline-1 outline-offset-[-1px] outline-[#E6E8EC] ${active ? 'bg-[#101828] text-white' : 'bg-neutral-50 text-[#344054]'} ${isFirst ? 'rounded-tl-lg rounded-bl-lg' : ''} ${isLast ? 'rounded-tr-lg rounded-br-lg' : !isFirst ? 'border-r border-t border-b border-[#E6E8EC]' : ''}`}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {mainTab !== 'dashboard' ? (
                <div className="bg-white rounded-xl border border-[#E6E8EC] p-12 text-center">
                    <Target className="w-10 h-10 text-[#98A2B3] mx-auto mb-3" />
                    <p className="text-[#101828] font-semibold">Coming soon</p>
                    <p className="text-[#667085] text-sm mt-1">
                        This section will be available in a future update.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="bg-white rounded-xl flex flex-col gap-6 pb-4">
                        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:justify-between gap-4">
                            <div className="flex flex-col gap-2">
                                <h2 className="text-neutral-800 text-base font-semibold leading-6">Leads</h2>
                                <p className="text-[#475467] text-xs leading-4">
                                    {totalCampaigns} {totalCampaigns === 1 ? 'Campaign' : 'Campaigns'}
                                    {summary && summary.totalLeads > 0 ? ` · ${summary.totalLeads} total leads` : ''}
                                </p>
                                <div className="flex gap-4 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setSectionTab('direct')}
                                        className={`h-9 px-2.5 rounded-lg text-sm font-medium ${sectionTab === 'direct'
                                            ? 'bg-[#101828] text-white'
                                            : 'bg-neutral-50 text-[#475467] outline outline-1 outline-offset-[-1px] outline-[#E6E8EC]'
                                            }`}
                                    >
                                        Direct Leads
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSectionTab('campaigns')}
                                        className={`h-9 px-2.5 rounded-lg text-sm font-medium ${sectionTab === 'campaigns'
                                            ? 'bg-[#101828] text-white'
                                            : 'bg-neutral-50 text-[#475467] outline outline-1 outline-offset-[-1px] outline-[#E6E8EC]'
                                            }`}
                                    >
                                        Campaigns
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="relative flex-1 max-w-sm">
                                <Search size={16} className="absolute left-[18px] top-1/2 -translate-y-1/2 text-[#667085]" />
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search campaigns, leads name or type..."
                                    className="w-full h-11 pl-10 pr-4 py-2 bg-white rounded-md outline outline-[0.50px] outline-offset-[-0.50px] outline-[#D0D5DD] text-sm text-[#101828] placeholder:text-[#667085]"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex flex-wrap">
                                    {PLATFORM_TABS.map((tab, index) => {
                                        const isFirst = index === 0;
                                        const isLast = index === PLATFORM_TABS.length - 1;
                                        return (
                                            <SegmentedButton
                                                key={tab.id}
                                                active={platform === tab.id}
                                                onClick={() => setPlatform(tab.id)}
                                                className={`${tab.width} h-11 ${isFirst ? 'rounded-tl-lg rounded-bl-lg' : ''} ${isLast ? 'rounded-tr-lg rounded-br-lg' : ''}`}
                                            >
                                                {tab.label}
                                            </SegmentedButton>
                                        );
                                    })}
                                </div>
                                <div className="h-11 px-4 py-2 bg-neutral-50 rounded-md outline outline-1 outline-offset-[-1px] outline-[#D0D5DD] flex items-center gap-2 text-sm font-medium text-[#667085]">
                                    All Time
                                </div>
                            </div>
                        </div>

                        <div className="px-4 flex flex-wrap gap-6">
                            <RangeField label="Conversion %" min={convMin} max={convMax} onMinChange={setConvMin} onMaxChange={setConvMax} />
                            <RangeField label="Total Spend" min={spendMin} max={spendMax} onMinChange={setSpendMin} onMaxChange={setSpendMax} />
                            <RangeField label="Total Leads" min={leadsMin} max={leadsMax} onMinChange={setLeadsMin} onMaxChange={setLeadsMax} />
                        </div>
                    </div>

                    <div className="flex gap-4 px-1">
                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}
                            className={`h-9 px-2.5 rounded-lg text-sm font-medium outline outline-[0.60px] outline-offset-[-0.60px] ${statusFilter === 'ACTIVE'
                                ? 'bg-green-50 text-emerald-700 outline-emerald-500'
                                : 'bg-green-50/60 text-emerald-700 outline-emerald-300'
                                }`}
                        >
                            Active ( {activeCount} )
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter(statusFilter === 'PAUSED' ? 'ALL' : 'PAUSED')}
                            className={`h-9 px-2.5 rounded-lg text-sm font-medium outline outline-[0.60px] outline-offset-[-0.60px] ${statusFilter === 'PAUSED'
                                ? 'bg-neutral-200 text-[#475467] outline-[#98A2B3]'
                                : 'bg-neutral-100 text-[#475467] outline-neutral-300'
                                }`}
                        >
                            Paused ( {pausedCount} )
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-[#101828]" />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="bg-white rounded-xl border border-dashed border-[#D0D5DD] p-12 text-center">
                            <p className="text-[#101828] font-semibold">No campaigns yet</p>
                            <p className="text-[#667085] text-sm mt-2 max-w-md mx-auto">
                                Add lead campaigns in the database to see metrics here. Filters apply to real data only — no placeholder cards.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-5">
                            {campaigns.map((campaign) => (
                                <CampaignCardView key={campaign.id} campaign={campaign} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
