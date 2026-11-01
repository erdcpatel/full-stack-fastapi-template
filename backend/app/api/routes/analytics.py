from datetime import datetime, timedelta
import io
import math
import random
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status
import plotly.express as px
import polars as pl

from app.api.deps import CurrentUser
from app.models import (
    AnalyticsFacets,
    AnalyticsGridResponse,
    AnalyticsMetrics,
    AnalyticsRecord,
    AuditRecord,
    FacetCount,
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

# Generate realistic sample data once in Polars
def _generate_dataset(n: int = 600) -> pl.DataFrame:
    random.seed(1337)
    categories = ["AI Inference", "Cloud Compute", "Managed DB", "Storage", "CDN & Network"]
    regions = ["US-East", "US-West", "EU-Central", "AP-South", "AP-East"]
    statuses = ["Completed", "Processing", "Failed", "Refunded"]
    tiers = ["Enterprise", "Growth", "Startup"]
    channels = ["Stripe API", "Wire Transfer", "ACH Direct", "Crypto / USDC", "Cloud Direct"]
    clients = [
        "Acme Corp", "TechNova", "Starlight AI", "Globex", "Initech",
        "CyberDyne", "Umbrella Bio", "Soylent", "Massive Dynamic", "Hooli",
    ]

    base_time = datetime(2026, 9, 1, 10, 0)
    data = []
    for i in range(n):
        hours_offset = int(i * 1.8)
        created = base_time + timedelta(hours=hours_offset)
        category = random.choice(categories)
        region = random.choice(regions)
        status_val = random.choices(statuses, weights=[0.75, 0.12, 0.08, 0.05])[0]
        tier = random.choices(tiers, weights=[0.40, 0.35, 0.25])[0]
        channel = random.choice(channels)
        cluster = f"{region.lower().replace('-', '')}-c{random.randint(1, 4)}"
        
        base_price = {
            "AI Inference": random.uniform(200, 3500),
            "Cloud Compute": random.uniform(150, 4800),
            "Managed DB": random.uniform(300, 2900),
            "Storage": random.uniform(40, 1200),
            "CDN & Network": random.uniform(30, 850),
        }[category]
        amount = round(base_price, 2)
        fee = round(amount * 0.025, 2)

        data.append({
            "id": f"TXN-{10000 + i}",
            "timestamp": created.strftime("%Y-%m-%d %H:%M"),
            "customer": f"{random.choice(clients)} #{random.randint(10, 99)}",
            "tier": tier,
            "category": category,
            "channel": channel,
            "cluster": cluster,
            "region": region,
            "status": status_val,
            "fee": fee,
            "amount": amount,
            "duration_ms": random.randint(35, 1200),
        })
    return pl.DataFrame(data)


_DF = _generate_dataset()


def _generate_timeseries_dataset(n: int = 20000) -> pl.DataFrame:
    random.seed(42)
    base = datetime(2026, 11, 1, 0, 0, 0)
    timestamps = [(base + timedelta(seconds=i * 5)).strftime("%Y-%m-%d %H:%M:%S") for i in range(n)]

    cpu = []
    memory = []
    network = []
    rps = []
    latency = []

    for i in range(n):
        wave = math.sin(i / 250.0) * 18.0
        c = max(8.0, min(99.0, 48.0 + wave + random.gauss(0, 6.0)))
        m = max(2048.0, min(16384.0, 8192.0 + wave * 95 + random.gauss(0, 200.0)))
        net = max(40.0, min(1200.0, 420.0 + wave * 15 + random.gauss(0, 40.0)))
        r = int(max(100, min(15000, 3200 + wave * 120 + random.gauss(0, 350.0))))
        lat = max(2.0, min(120.0, 16.0 + (c / 12.0) + random.gauss(0, 2.5)))

        cpu.append(round(c, 2))
        memory.append(round(m, 1))
        network.append(round(net, 2))
        rps.append(r)
        latency.append(round(lat, 2))

    return pl.DataFrame({
        "timestamp": timestamps,
        "cpu_usage": cpu,
        "memory_mb": memory,
        "network_mbps": network,
        "requests_per_sec": rps,
        "latency_p99": latency,
    })


_TS_DF = _generate_timeseries_dataset()


@router.get("/grid", response_model=AnalyticsGridResponse)
async def get_analytics_grid(
    current_user: CurrentUser,
    search: str | None = None,
    category: str | None = None,
    status: str | None = None,
    region: str | None = None,
    min_amount: float | None = None,
    max_amount: float | None = None,
    sort_by: str = "timestamp",
    sort_desc: bool = True,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=5, le=200)] = 25,
) -> AnalyticsGridResponse:
    """High-performance filtering and aggregation using Polars."""
    # Build lazy filter conditions
    lazy_df = _DF.lazy()

    if search:
        search_lower = search.strip().lower()
        lazy_df = lazy_df.filter(
            pl.col("id").str.to_lowercase().str.contains(search_lower)
            | pl.col("customer").str.to_lowercase().str.contains(search_lower)
            | pl.col("category").str.to_lowercase().str.contains(search_lower)
            | pl.col("region").str.to_lowercase().str.contains(search_lower)
        )

    if category and category != "all":
        lazy_df = lazy_df.filter(pl.col("category") == category)

    if status and status != "all":
        lazy_df = lazy_df.filter(pl.col("status") == status)

    if region and region != "all":
        lazy_df = lazy_df.filter(pl.col("region") == region)

    if min_amount is not None:
        lazy_df = lazy_df.filter(pl.col("amount") >= min_amount)

    if max_amount is not None:
        lazy_df = lazy_df.filter(pl.col("amount") <= max_amount)

    # Collect filtered dataset
    filtered = lazy_df.collect()
    total_count = filtered.height

    # Compute metrics using Polars aggregations
    if total_count > 0:
        agg = filtered.select([
            pl.col("amount").sum().alias("total_volume"),
            pl.col("amount").mean().alias("avg_amount"),
            (pl.col("status") == "Completed").mean().alias("success_rate"),
        ]).to_dicts()[0]

        metrics = AnalyticsMetrics(
            total_volume=round(agg["total_volume"] or 0.0, 2),
            avg_amount=round(agg["avg_amount"] or 0.0, 2),
            total_records=total_count,
            success_rate=round((agg["success_rate"] or 0.0) * 100, 1),
        )
    else:
        metrics = AnalyticsMetrics(
            total_volume=0.0,
            avg_amount=0.0,
            total_records=0,
            success_rate=0.0,
        )

    # Compute facet counts for dropdown filters
    cat_counts = (
        _DF.group_by("category")
        .len()
        .sort("len", descending=True)
        .to_dicts()
    )
    reg_counts = (
        _DF.group_by("region")
        .len()
        .sort("len", descending=True)
        .to_dicts()
    )
    stat_counts = (
        _DF.group_by("status")
        .len()
        .sort("len", descending=True)
        .to_dicts()
    )

    facets = AnalyticsFacets(
        categories=[FacetCount(name=c["category"], count=c["len"]) for c in cat_counts],
        regions=[FacetCount(name=r["region"], count=r["len"]) for r in reg_counts],
        statuses=[FacetCount(name=s["status"], count=s["len"]) for s in stat_counts],
    )

    # Sorting
    if sort_by in filtered.columns:
        filtered = filtered.sort(sort_by, descending=sort_desc)

    # Pagination slice
    start_idx = (page - 1) * page_size
    page_records = filtered.slice(start_idx, page_size).to_dicts()

    total_pages = max(1, math.ceil(total_count / page_size))

    return AnalyticsGridResponse(
        items=[AnalyticsRecord(**r) for r in page_records],
        total_count=total_count,
        page=page,
        total_pages=total_pages,
        facets=facets,
        metrics=metrics,
    )


@router.get("/charts")
async def get_analytics_charts(current_user: CurrentUser) -> dict[str, str]:
    """Generates responsive Plotly charts directly from Polars data."""
    # 1. Revenue by Category (Bar Chart)
    cat_df = (
        _DF.filter(pl.col("status") == "Completed")
        .group_by("category")
        .agg(pl.col("amount").sum().alias("revenue"))
        .sort("revenue", descending=True)
        .to_pandas()
    )
    fig_cat = px.bar(
        cat_df,
        x="category",
        y="revenue",
        color="category",
        template="plotly_dark",
        title="Completed Revenue by Category ($)",
    )
    fig_cat.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=10, r=10, t=40, b=10),
        showlegend=False,
    )

    # 2. Regional Volume Distribution (Donut Chart)
    reg_df = (
        _DF.group_by("region")
        .agg(pl.col("amount").sum().alias("volume"))
        .to_pandas()
    )
    fig_reg = px.pie(
        reg_df,
        names="region",
        values="volume",
        hole=0.45,
        template="plotly_dark",
        title="Transaction Volume by Region",
    )
    fig_reg.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=10, r=10, t=40, b=10),
    )

    # 3. Daily Volume Trend (Area/Line Chart)
    time_df = (
        _DF.with_columns(pl.col("timestamp").str.slice(0, 10).alias("date"))
        .group_by("date")
        .agg(pl.col("amount").sum().alias("daily_volume"))
        .sort("date")
        .to_pandas()
    )
    fig_trend = px.area(
        time_df,
        x="date",
        y="daily_volume",
        template="plotly_dark",
        title="Daily Transaction Trend ($)",
    )
    fig_trend.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        margin=dict(l=10, r=10, t=40, b=10),
    )

    def wrap_chart(fig) -> str:
        div = fig.to_html(include_plotlyjs=False, full_html=False)
        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'/>"
            "<script src='/plotly.min.js'></script>"
            "<style>body{margin:0;padding:0;background:transparent;overflow:hidden;}"
            ".plotly-graph-div{height:100% !important;width:100% !important;}</style>"
            f"</head><body>{div}</body></html>"
        )

    return {
        "category_chart": wrap_chart(fig_cat),
        "region_chart": wrap_chart(fig_reg),
        "trend_chart": wrap_chart(fig_trend),
    }


@router.get("/audit", response_model=list[AuditRecord])
async def get_audit_log(current_user: CurrentUser) -> list[AuditRecord]:
    """Sensitive executive audit table - restricted to Admin role."""
    if current_user.role != "admin" and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You need the 'admin' role to view Executive Audit Logs.",
        )

    return [
        AuditRecord(
            id="AUD-901",
            timestamp="2026-10-31 16:42",
            actor="admin@example.com",
            role="admin",
            severity="CRITICAL",
            action="API_KEY_ROTATED",
            target="Production Cloud Gateway",
            ip_address="192.168.1.101",
            user_agent="Chrome 130 / macOS 15.1",
            latency_ms=18,
            checksum="e3b0c44298fc",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-902",
            timestamp="2026-10-31 15:10",
            actor="analyst@example.com",
            role="analyst",
            severity="HIGH",
            action="LARGE_DATA_EXPORT",
            target="Q3 Transaction Polars Slice (50,000 rows)",
            ip_address="192.168.1.144",
            user_agent="Firefox 132 / Linux x86_64",
            latency_ms=412,
            checksum="8f434346648f",
            status="APPROVED",
        ),
        AuditRecord(
            id="AUD-903",
            timestamp="2026-10-31 11:22",
            actor="viewer@example.com",
            role="viewer",
            severity="HIGH",
            action="UNAUTHORIZED_WRITE_ATTEMPT",
            target="/api/v1/analytics/grid [POST]",
            ip_address="10.0.4.88",
            user_agent="Python-requests/2.32",
            latency_ms=4,
            checksum="d41d8cd98f00",
            status="BLOCKED",
        ),
        AuditRecord(
            id="AUD-904",
            timestamp="2026-10-30 09:15",
            actor="admin@example.com",
            role="admin",
            severity="CRITICAL",
            action="ROLE_POLICY_UPDATE",
            target="RBAC Permission Matrix (Analyst tier)",
            ip_address="192.168.1.101",
            user_agent="Chrome 130 / macOS 15.1",
            latency_ms=64,
            checksum="9b71d224bd62",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-905",
            timestamp="2026-10-30 08:02",
            actor="system-daemon@service",
            role="admin",
            severity="INFO",
            action="POLARS_IN_MEMORY_REINDEX",
            target="Dataset Partition [AP-South]",
            ip_address="127.0.0.1",
            user_agent="Antigravity Backend Service",
            latency_ms=8,
            checksum="2c26b46b68ff",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-906",
            timestamp="2026-10-29 23:45",
            actor="analyst@example.com",
            role="analyst",
            severity="MEDIUM",
            action="SAVED_QUERY_MUTATION",
            target="Regional Volume Share Donut Spec",
            ip_address="192.168.1.144",
            user_agent="Firefox 132 / Linux x86_64",
            latency_ms=29,
            checksum="4b227777d4dd",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-907",
            timestamp="2026-10-29 18:30",
            actor="admin@example.com",
            role="admin",
            severity="MEDIUM",
            action="SESSION_REVOCATION",
            target="User token sess_99a8b1",
            ip_address="192.168.1.101",
            user_agent="Chrome 130 / macOS 15.1",
            latency_ms=12,
            checksum="ef2d127de37b",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-908",
            timestamp="2026-10-29 14:15",
            actor="external-bot@untrusted",
            role="viewer",
            severity="CRITICAL",
            action="SQL_INJECTION_PROBE",
            target="/api/v1/analytics/grid?search=' OR 1=1--",
            ip_address="198.51.100.42",
            user_agent="sqlmap/1.8.11",
            latency_ms=2,
            checksum="01ba4719c80b",
            status="BLOCKED",
        ),
        AuditRecord(
            id="AUD-909",
            timestamp="2026-10-28 17:00",
            actor="admin@example.com",
            role="admin",
            severity="INFO",
            action="CONFIGURATION_BACKUP",
            target="S3 Bucket: corp-backup-vault",
            ip_address="192.168.1.101",
            user_agent="CLI v2.4 (darwin-arm64)",
            latency_ms=510,
            checksum="a6aca6a042fa",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-910",
            timestamp="2026-10-28 12:44",
            actor="analyst@example.com",
            role="analyst",
            severity="LOW",
            action="DASHBOARD_PRESET_SHARED",
            target="Executive Quarterly View",
            ip_address="192.168.1.144",
            user_agent="Firefox 132 / Linux x86_64",
            latency_ms=15,
            checksum="132801a39b4b",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-911",
            timestamp="2026-10-27 19:20",
            actor="admin@example.com",
            role="admin",
            severity="CRITICAL",
            action="MFA_DEVICE_ENROLLED",
            target="YubiKey 5C NFC (Serial: 849201)",
            ip_address="192.168.1.101",
            user_agent="Chrome 130 / macOS 15.1",
            latency_ms=75,
            checksum="7e226d70c401",
            status="SUCCESS",
        ),
        AuditRecord(
            id="AUD-912",
            timestamp="2026-10-27 10:11",
            actor="system-daemon@service",
            role="admin",
            severity="INFO",
            action="CACHE_WARMUP_TRIGGERED",
            target="Plotly Chart Pre-computations",
            ip_address="127.0.0.1",
            user_agent="Antigravity Backend Service",
            latency_ms=210,
            checksum="b8a9f6004b3a",
            status="SUCCESS",
        ),
    ]


@router.get("/arrow-metrics")
async def get_arrow_metrics(
    current_user: CurrentUser,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=100, le=10000)] = 2000,
) -> Response:
    """Streams high-volume Polars time-series data using native Apache Arrow IPC binary format."""
    total_count = _TS_DF.height
    total_pages = max(1, math.ceil(total_count / page_size))

    start_idx = (page - 1) * page_size
    sliced = _TS_DF.slice(start_idx, page_size)

    buf = io.BytesIO()
    sliced.write_ipc(buf)
    ipc_bytes = buf.getvalue()

    return Response(
        content=ipc_bytes,
        media_type="application/vnd.apache.arrow.file",
        headers={
            "X-Total-Count": str(total_count),
            "X-Page": str(page),
            "X-Page-Size": str(page_size),
            "X-Total-Pages": str(total_pages),
            "Access-Control-Expose-Headers": "X-Total-Count, X-Page, X-Page-Size, X-Total-Pages",
        },
    )
