import { notFound } from "next/navigation";

type PolicyConfig = {
    title: string;
    filePath: string;
};

const POLICY_MAP: Record<string, PolicyConfig> = {
    "company-policy": {
        title: "Company Policy",
        filePath: "/policies%20rulebook/Company%20Policy%20%20(1).pdf",
    },
    "leave-attendance-rulebook": {
        title: "Leave & Attendance Rulebook",
        filePath: "/policies%20rulebook/Leave%20%26%20Attendance%20Rulebook%20(1).pdf",
    },
};

type PageProps = {
    params: {
        policyId: string;
    };
};

const PdfPolicyViewerPage = ({ params }: PageProps) => {
    const policy = POLICY_MAP[params.policyId] ?? null;

    if (!policy) {
        notFound();
    }

    const embeddedPdfSrc = `${policy.filePath}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;

    return (
        <section className="min-h-screen pb-8">
            <header className="mb-5">
                <h1 className="text-2xl font-black text-[#101828] tracking-tight">{policy.title}</h1>
                <p className="text-[#64748b] font-medium mt-1">
                    View-only policy document inside the portal.
                </p>
            </header>

            <div className="w-full h-[80vh] rounded-2xl overflow-hidden border border-[#E2E8F0] bg-white shadow-sm">
                <iframe
                    src={embeddedPdfSrc}
                    title={policy.title}
                    className="w-full h-full"
                />
            </div>
        </section>
    );
};

export default PdfPolicyViewerPage;
