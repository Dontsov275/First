// Конфигурация цветов
const colors = [
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 99, 132, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(153, 102, 255, 0.7)"
];

// Загрузка данных
async function loadData() {
    try {
        showLoader(true);
        const response = await fetch('data.csv');
        if (!response.ok) throw new Error("Ошибка загрузки CSV");
        
        const csvText = await response.text();
        const data = parseCSV(csvText);
        processData(data);
    } catch (error) {
        console.error("Ошибка:", error);
        alert("Ошибка загрузки данных: " + error.message);
    } finally {
        showLoader(false);
    }
}

// Парсинг CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index] ? values[index].trim() : '';
            return obj;
        }, {});
    });
}

// Обработка данных
function processData(csvData) {
    const workshops = [...new Set(csvData.map(row => row['Цех']))].sort();
    const months = [...new Set(csvData.map(row => row['Месяц']))].sort();
    
    const metrics = {
        output: prepareDataset('Выпуск', workshops, months, csvData),
        defects: prepareDataset('Брак', workshops, months, csvData),
        downtime: prepareDataset('Простой', workshops, months, csvData)
    };
    
    renderCharts(metrics, months);
}

function prepareDataset(metric, workshops, months, csvData) {
    return workshops.map((workshop, index) => ({
        label: `Цех №${workshop}`,
        data: months.map(month => {
            const row = csvData.find(r => r['Цех'] === workshop && r['Месяц'] === month);
            return row ? parseFloat(row[metric]) || 0 : 0;
        }),
        backgroundColor: colors[index],
        borderColor: colors[index].replace('0.7', '1'),
        borderWidth: 1
    }));
}

// Отрисовка графиков
function renderCharts(metrics, labels) {
    renderChart('outputChart', 'Объем выпуска продукции (ед.)', metrics.output, labels);
    renderChart('defectsChart', 'Уровень брака (%)', metrics.defects, labels);
    renderChart('downtimeChart', 'Время простоя (часы)', metrics.downtime, labels);
}

function renderChart(canvasId, title, datasets, labels) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (window[canvasId]) window[canvasId].destroy();
    
    window[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { size: 16 }
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Показать/скрыть загрузчик
function showLoader(show) {
    const btn = document.querySelector('button');
    btn.disabled = show;
    btn.textContent = show ? 'Загрузка...' : 'Обновить данные';
}

// Автозагрузка при открытии
document.addEventListener('DOMContentLoaded', loadData);
