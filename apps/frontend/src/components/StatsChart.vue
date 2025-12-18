<script setup lang="ts">

import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js';
import { Bar } from 'vue-chartjs';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  activityData: { date: string, hours: string }[]
}>();

const chartData = {
  labels: props.activityData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString(undefined, { weekday: 'short' });
  }),
  datasets: [{
    label: 'Heures de jeu',
    data: props.activityData.map(d => parseFloat(d.hours)),
    backgroundColor: 'rgba(5, 217, 232, 0.6)',
    borderColor: '#05d9e8',
    borderWidth: 1
  }]
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#fff' }
    },
    title: {
      display: true,
      text: 'Activité des 7 derniers jours',
      color: '#fff'
    }
  },
  scales: {
    y: {
      ticks: { color: '#888' },
      grid: { color: 'rgba(255,255,255,0.1)' }
    },
    x: {
      ticks: { color: '#888' },
      grid: { display: false }
    }
  }
};
</script>

<template>
  <div class="chart-container">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
.chart-container {
  height: 300px;
  width: 100%;
}
</style>
