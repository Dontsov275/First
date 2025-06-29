// Конфигурация цехов
const workshops = [
    { id: 1, name: "Цех №1", color: "rgba(54, 162, 235, 0.7)" },
    { id: 2, name: "Цех №2", color: "rgba(255, 99, 132, 0.7)" },
    { id: 3, name: "Цех №3", color: "rgba(75, 192, 192, 0.7)" },
    { id: 4, name: "Цех №4", color: "rgba(255, 159, 64, 0.7)" },
    { id: 5, name: "Цех №5", color: "rgba(153, 102, 255, 0.7)" }
];

// Загрузка данных из Google Sheets
async function loadData() {
    const sheetId = document.getElementById('sheetIdInput').value.trim();
    if (!sheetId) return alert("Введите ID Google-таблицы");
    
    try {
        showLoader(true);
        const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`);
        if (!response.ok) throw new Error("Ошибка загрузки");
        
        const text = await response.text();
        const json = JSON.parse(text.substr(47).slice(0, -2));
        processData(json);
    } catch (error) {
        console.error("Ошибка:", error);
        alert("Ошибка загрузки: " + error.message);
    } finally {
        showLoader(false);
    }
}

// Обработка данных
function processData(jsonData) {
    const rows = jsonData.table.rows;
    const months = [];
    const metrics = {
        output: workshops.map(w => ({ ...w, data: [] })),
        defects: workshops.map(w => ({ ...w, data: [] })),
        downtime: workshops.map(w => ({ ...w, data: [] }))
    };
    
    // Собираем уникальные месяцы
    rows.forEach(row => {
        const month = row.c[1]?.v;
        if (month && !months.includes(month)) months.push(month);
    });
    
    // Заполняем данные
    months.forEach(month => {
        workshops.forEach((workshop, i) => {
            const row = rows.find(r => 
                r.c[0]?.v === workshop.id && r.c[1]?.v === month
            );
            
            metrics.output[i].data.push(row?.c[2]?.v || 0);
            metrics.defects[i].data.push(row?.c[3]?.v || 0);
            metrics.downtime[i].data.push(row?.c[4]?.v || 0);
        });
    });
    
    renderCharts(metrics, months);
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
            datasets: datasets.map(ws => ({
                label: ws.name,
                data: ws.data,
                backgroundColor: ws.color,
                borderColor: ws.color.replace('0.7', '1'),
                borderWidth: 1
            }))
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
    const btn = document.querySelector('.controls button');
    btn.disabled = show;
    btn.innerHTML = show ? 'Загрузка...' : 'Загрузить данные';
}

// Автозагрузка при открытии
document.addEventListener('DOMContentLoaded', () => {
    loadData();
});
