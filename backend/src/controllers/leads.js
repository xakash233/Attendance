import prisma from '../config/prisma.js';

const PLATFORM_LABELS = {
    META: 'Meta',
    GOOGLE_ADS: 'Google Ads',
    LINKED_IN: 'Linked In',
    INSTAGRAM_DM: 'Instagram DMs',
    OTHER: 'Other'
};

const parseNumber = (value) => {
    if (value === undefined || value === null || value === '') return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
};

const formatAssignedLabel = (assignedAt) => {
    if (!assignedAt) return null;
    return `Assigned ${assignedAt.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    })}`;
};

const buildCampaignMetrics = (campaign, leads) => {
    const leadCount = leads.length;
    const converted = leads.filter((l) => ['CONVERTED', 'CONFIRMED'].includes(l.status)).length;
    const confirmed = leads.filter((l) => l.status === 'CONFIRMED').length;
    const conversionPct = leadCount > 0 ? (converted / leadCount) * 100 : 0;
    const confirmedPct = leadCount > 0 ? (confirmed / leadCount) * 100 : 0;

    return {
        leadCount,
        converted,
        confirmed,
        conversionPct: Number(conversionPct.toFixed(2)),
        confirmedPct: Number(confirmedPct.toFixed(2))
    };
};

const campaignPassesFilters = (metrics, spend, filters) => {
    if (filters.convMin !== null && metrics.conversionPct < filters.convMin) return false;
    if (filters.convMax !== null && metrics.conversionPct > filters.convMax) return false;
    if (filters.spendMin !== null && spend < filters.spendMin) return false;
    if (filters.spendMax !== null && spend > filters.spendMax) return false;
    if (filters.leadsMin !== null && metrics.leadCount < filters.leadsMin) return false;
    if (filters.leadsMax !== null && metrics.leadCount > filters.leadsMax) return false;
    return true;
};

const fetchLeadsDashboardData = async (query) => {
        const {
            search = '',
            platform = 'ALL',
            status = 'ALL',
            convMin,
            convMax,
            spendMin,
            spendMax,
            leadsMin,
            leadsMax
        } = query;

        const filters = {
            convMin: parseNumber(convMin),
            convMax: parseNumber(convMax),
            spendMin: parseNumber(spendMin),
            spendMax: parseNumber(spendMax),
            leadsMin: parseNumber(leadsMin),
            leadsMax: parseNumber(leadsMax)
        };

        const searchTerm = String(search).trim().toLowerCase();

        const campaigns = await prisma.leadCampaign.findMany({
            include: {
                leads: true
            },
            orderBy: { updatedAt: 'desc' }
        });

        const enrichedAll = campaigns.map((campaign) => {
            const metrics = buildCampaignMetrics(campaign, campaign.leads);
            const spend = Number(campaign.spend || 0);

            return {
                id: campaign.id,
                name: campaign.name,
                platform: campaign.platform,
                platformLabel: PLATFORM_LABELS[campaign.platform] || campaign.platform,
                status: campaign.status,
                description: campaign.description || '',
                spend,
                assignedLabel: formatAssignedLabel(campaign.assignedAt),
                metrics
            };
        });

        const activeCount = enrichedAll.filter((c) => c.status === 'ACTIVE').length;
        const pausedCount = enrichedAll.filter((c) => c.status === 'PAUSED').length;

        const enriched = enrichedAll.filter((campaign) => {
            if (platform !== 'ALL' && campaign.platform !== platform) return false;
            if (status !== 'ALL' && campaign.status !== status) return false;

            if (searchTerm) {
                const haystack = [campaign.name, campaign.platformLabel, campaign.description]
                    .join(' ')
                    .toLowerCase();
                if (!haystack.includes(searchTerm)) return false;
            }

            return campaignPassesFilters(campaign.metrics, campaign.spend, filters);
        });

        const totals = enriched.reduce(
            (acc, campaign) => {
                acc.leads += campaign.metrics.leadCount;
                acc.converted += campaign.metrics.converted;
                acc.confirmed += campaign.metrics.confirmed;
                acc.spend += campaign.spend;
                return acc;
            },
            { leads: 0, converted: 0, confirmed: 0, spend: 0 }
        );

        const totalConversionPct =
            totals.leads > 0 ? Number(((totals.converted / totals.leads) * 100).toFixed(2)) : 0;

        return {
            summary: {
                activeCampaigns: activeCount,
                pausedCampaigns: pausedCount,
                totalCampaigns: enrichedAll.length,
                totalLeads: totals.leads,
                totalConverted: totals.converted,
                totalConfirmed: totals.confirmed,
                totalSpend: totals.spend,
                totalConversionPct
            },
            campaigns: enriched
        };
};

export const getLeadsDashboard = async (req, res, next) => {
    try {
        const data = await fetchLeadsDashboardData(req.query);
        res.json(data);
    } catch (error) {
        next(error);
    }
};

export const exportLeadsReport = async (req, res, next) => {
    try {
        const data = await fetchLeadsDashboardData(req.query);
        res.json({
            exportedAt: new Date().toISOString(),
            ...data
        });
    } catch (error) {
        next(error);
    }
};
