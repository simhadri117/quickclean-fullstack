import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const gridColor = 'rgba(255,255,255,0.05)';
const textColor = '#64748b';

// ── Revenue Line Chart ─────────────────────────────────
export function RevenueChart({ data }: { data: { label: string; revenue: number }[] }) {
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{
      label: 'Revenue (₹)',
      data: data.map(d => d.revenue),
      fill: true,
      borderColor: '#6366f1',
      backgroundColor: 'rgba(99,102,241,0.1)',
      tension: 0.4,
      pointBackgroundColor: '#6366f1',
      pointRadius: 4,
      pointHoverRadius: 7,
    }],
  };
  return (
    <Line data={chartData} options={{
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, callback: (v) => `₹${v}` } },
      },
    }} />
  );
}

// ── Daily Bookings Bar Chart ───────────────────────────
export function BookingsBarChart({ data }: { data: { label: string; bookings: number }[] }) {
  const maxVal = Math.max(...data.map(d => d.bookings));
  const chartData = {
    labels: data.map(d => d.label),
    datasets: [{
      label: 'Bookings',
      data: data.map(d => d.bookings),
      backgroundColor: data.map(d =>
        d.bookings === maxVal ? 'rgba(99,102,241,0.9)' : 'rgba(99,102,241,0.35)'
      ),
      borderRadius: 8,
      borderSkipped: false,
    }],
  };
  return (
    <Bar data={chartData} options={{
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 } },
      scales: {
        x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 } } },
      },
    }} />
  );
}

// ── Service Doughnut Chart ─────────────────────────────
export function ServiceDonutChart({ data }: { data: { name: string; count: number }[] }) {
  const colors = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
  const chartData = {
    labels: data.map(d => d.name),
    datasets: [{
      data: data.map(d => d.count),
      backgroundColor: colors.slice(0, data.length),
      borderColor: '#131929',
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };
  return (
    <Doughnut data={chartData} options={{
      responsive: true, maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 12, boxWidth: 10, borderRadius: 4 } },
        tooltip: { backgroundColor: '#1a2235', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: '#334155', borderWidth: 1 },
      },
    }} />
  );
}

// ── Mini Sparkline ─────────────────────────────────────
export function Sparkline({ values, color = '#6366f1' }: { values: number[]; color?: string }) {
  const data = {
    labels: values.map((_, i) => i.toString()),
    datasets: [{ data: values, borderColor: color, backgroundColor: 'transparent', tension: 0.4, pointRadius: 0, borderWidth: 2 }],
  };
  return (
    <Line data={data} options={{
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: { x: { display: false }, y: { display: false } },
    }} />
  );
}
