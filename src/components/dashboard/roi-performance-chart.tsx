"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { CampaignRoiDailyRow } from "@/services/roi-service";

type RoiPerformanceChartProps = {
  data: CampaignRoiDailyRow[];
};

type TooltipPayload = {
  color?: string;
  dataKey?: string | number;
  value?: number;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipPayload[];
};

export function RoiPerformanceChart({ data }: RoiPerformanceChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-3xl border border-dashed border-white/10 bg-slate-950/40 text-sm text-slate-500">
        Nenhum dado diário encontrado para o período selecionado.
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <LineChart
          data={data}
          margin={{ bottom: 0, left: 8, right: 8, top: 16 }}
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#ffffff12" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={24}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={formatShortDate}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value: string | number) =>
              compactCurrency(Number(value))
            }
            tickLine={false}
            yAxisId="profit"
          />
          <YAxis
            axisLine={false}
            orientation="right"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            tickFormatter={(value: string | number) =>
              `${Number(value).toFixed(0)}%`
            }
            tickLine={false}
            yAxisId="roi"
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#818cf8", strokeDasharray: "4 4" }}
          />
          <Line
            dataKey="profit"
            dot={false}
            name="Lucro"
            stroke="url(#profitGradient)"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
            yAxisId="profit"
          />
          <Line
            dataKey="roi"
            dot={false}
            name="ROI"
            stroke="#f59e0b"
            strokeLinecap="round"
            strokeWidth={3}
            type="monotone"
            yAxisId="roi"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ChartTooltip({ active, label, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur">
      <p className="text-xs font-medium text-slate-400">
        {formatLongDate(label ?? "")}
      </p>
      <div className="mt-2 space-y-1">
        {payload.map((item) => (
          <div
            className="flex items-center justify-between gap-6 text-sm"
            key={String(item.dataKey)}
          >
            <span className="flex items-center gap-2 text-slate-300">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.dataKey === "roi" ? "ROI" : "Lucro"}
            </span>
            <span className="font-semibold text-white">
              {item.dataKey === "roi"
                ? `${formatNumber(item.value ?? 0)}%`
                : formatCurrency(item.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function compactCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    compactDisplay: "short",
    currency: "BRL",
    notation: "compact",
    style: "currency",
  }).format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatLongDate(value: string) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
