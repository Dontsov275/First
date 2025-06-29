// Объект для хранения всех графиков
const charts = {};

// Конфигурация цветов
const colors = [
    "rgba(54, 162, 235, 0.7)",
    "rgba(255, 99, 132, 0.7)",
    "rgba(75, 192, 192, 0.7)",
    "rgba(255, 159, 64, 0.7)",
    "rgba(153, 102, 255, 0.7)"
];

// Основная функция загрузки данных
async function loadData() {
    try {
        showLoader(true);
        const response = await fetch('data.csv');
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const csvText = await response.text();
        const data = parseCSV(csvText);
        
        if (!data || data.length === 0) {
            throw new Error("CSV файл пустой или содержит ошибки");
        }
        
        processData(data);
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        alert(`Ошибка: ${error.message}`);
    } finally {
        showLoader(false);
    }
}

// Функция парсинга CSV
function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(h => h.trim());
        const requiredHeaders = ['Цех', 'Месяц', 'Выпуск', 'Брак', 'Простой'];
        
        // Проверка заголовков
        if (!requiredHeaders.every(h => headers.includes(h))) {
            throw new Error("Неверные заголовки в CSV файле");
        }
        
        return lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((obj, header, index) => {
                obj[header] = values[index] ? values[index].trim() : '';
                return obj;
            }, {});
        }).filter(row => row['Цех'] && row['Месяц']);
    } catch (error) {
        console.error("Ошибка парсинга CSV:", error);
        return [];
    }
}

// Обработка данных и подготовка к визуализации
function processData(csvData) {
    try {
        const workshops = [...new Set(csvData.map(row => row['Цех']))].sort();
        const months = [...new Set(csvData.map(row => row['Месяц']))].sort((a, b) => {
            const monthOrder = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
            return monthOrder.indexOf(a) - monthOrder.indexOf(b);
        });
        
        const metrics = {
            output: prepareDataset('Выпуск', workshops, months, csvData),
            defects: prepareDataset('Брак', workshops, months, csvData),
            downtime: prepareDataset('Простой', workshops, months, csvData)
        };
        
        renderCharts(metrics, months);
    } catch (error) {
        console.error("Ошибка обработки данных:", error);
        alert("Ошибка при обработке данных");
    }
}

// Подготовка данных для графиков
function prepareDataset(metric, workshops, months, csvData) {
    return workshops.map((workshop, index) => ({
        label: `Цех №${workshop}`,
        data: months.map(month => {
            const row = csvData.find(r => 
                r['Цех'] === workshop && r['Месяц'] === month
            );
            const value = row ? parseFloat(row[metric]) : 0;
            return isNaN(value) ? 0 : value;
        }),
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.7', '1'),
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
    try {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Элемент с ID ${canvasId} не найден`);
            return;
        }
        
        // Уничтожаем предыдущий график, если он существует
        if (charts[canvasId] && typeof charts[canvasId].destroy === 'function') {
            charts[canvasId].destroy();
        }
        
        const ctx = canvas.getContext('2d');
        charts[canvasId] = new Chart(ctx, {
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
                        position: 'top',
                        labels: {
                            boxWidth: 12
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: title.includes('(%)') ? '%' : 
                                  title.includes('(часы)') ? 'часы' : 'ед.'
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error(`Ошибка при отрисовке графика ${canvasId}:`, error);
    }
}

// Управление состоянием загрузки
function showLoader(show) {
    const btn = document.querySelector('button');
    if (btn) {
        btn.disabled = show;
        btn.innerHTML = show ? 
            '<span class="loader">⌛</span> Загрузка...' : 
            'Обновить данные';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что Chart.js загружен
    if (typeof Chart === 'undefined') {
        alert("Ошибка: Библиотека Chart.js не загружена!");
        return;
    }
    
    loadData();
    
    // Дополнительный стиль для лоадера
    const style = document.createElement('style');
    style.textContent = `
        .loader {
            display: inline-block;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
});
