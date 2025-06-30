// Конфигурация
const config = {
    workshopsCount: 20,
    indicators: [
        'Выпуск', 'Брак', 'Простой', 'Численность', 
        'Изготовлено', 'ПроцентОтПлана', 'Себестоимость',
        'ВаловаяПрибыль', 'Маржинальность', 'EBITDA',
        'Рентабельность', 'ЧистаяПрибыль'
    ],
    months: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    quarters: {
        'Q1': ['Янв', 'Фев', 'Мар'],
        'Q2': ['Апр', 'Май', 'Июн'],
        'Q3': ['Июл', 'Авг', 'Сен'],
        'Q4': ['Окт', 'Ноя', 'Дек']
    }
};

// Цвета для 20 цехов
const colors = [
    "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099",
    "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395",
    "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300",
    "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"
];

// Глобальные переменные
let appData = {
    rawData: [],
    workshops: [],
    monthlyData: {},
    quarterlyData: {},
    annualData: {}
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkLibraries();
});

function setupEventListeners() {
    document.getElementById('loadBtn').addEventListener('click', loadData);
    document.getElementById('pdfBtn').addEventListener('click', exportToPDF);
    
    // Обработчики вкладок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

function checkLibraries() {
    if (typeof Chart === 'undefined' || typeof jsPDF === 'undefined') {
        alert('Библиотеки не загружены. Проверьте интернет-соединение и обновите страницу.');
    }
}

function loadData() {
    const fileInput = document.getElementById('csvUpload');
    if (!fileInput.files.length) {
        alert('Пожалуйста, выберите CSV файл');
        return;
    }

    const file = fileInput.files[0];
    document.getElementById('fileName').textContent = `Загружен: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const csvData = parseCSV(e.target.result);
            processData(csvData);
            renderAllCharts();
        } catch (error) {
            alert(`Ошибка обработки файла: ${error.message}`);
        }
    };
    reader.readAsText(file);
}

function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) throw new Error("CSV файл пуст");

    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, i) => {
            let value = values[i] ? values[i].trim() : '';
            // Преобразование числовых значений
            if (!isNaN(value) && header !== 'Цех' && header !== 'Месяц') {
                value = parseFloat(value);
            }
            obj[header] = value;
            return obj;
        }, {});
    });
}

function processData(data) {
    // Очистка предыдущих данных
    appData = {
        rawData: data,
        workshops: [],
        monthlyData: {},
        quarterlyData: {},
        annualData: {}
    };

    // Получаем список цехов (1-20)
    appData.workshops = [...new Set(data.map(row => parseInt(row['Цех'])))].sort((a, b) => a - b);
    
    // Обработка месячных данных
    processMonthlyData();
    
    // Расчет квартальных данных
    processQuarterlyData();
    
    // Расчет годовых данных
    processAnnualData();
}

function processMonthlyData() {
    appData.workshops.forEach(workshop => {
        appData.monthlyData[workshop] = {};
        config.months.forEach(month => {
            const monthData = appData.rawData.filter(
                row => parseInt(row['Цех']) === workshop && row['Месяц'] === month
            );
            
            if (monthData.length > 0) {
                appData.monthlyData[workshop][month] = monthData[0];
            }
        });
    });
}

function processQuarterlyData() {
    Object.entries(config.quarters).forEach(([quarter, months]) => {
        appData.quarterlyData[quarter] = {};
        
        appData.workshops.forEach(workshop => {
            const quarterData = {
                'Выпуск': 0,
                'Брак': 0,
                'Простой': 0,
                'Численность': 0,
                'Изготовлено': 0,
                'Себестоимость': 0,
                'ВаловаяПрибыль': 0,
                'EBITDA': 0,
                'ЧистаяПрибыль': 0
            };
            
            let monthCount = 0;
            months.forEach(month => {
                const monthData = appData.monthlyData[workshop][month];
                if (monthData) {
                    config.indicators.forEach(indicator => {
                        if (quarterData.hasOwnProperty(indicator) && monthData[indicator]) {
                            quarterData[indicator] += parseFloat(monthData[indicator]) || 0;
                        }
                    });
                    monthCount++;
                }
            });
            
            // Расчет средних значений
            if (monthCount > 0) {
                ['Брак', 'Простой', 'ПроцентОтПлана', 'Маржинальность', 'Рентабельность'].forEach(indicator => {
                    if (quarterData.hasOwnProperty(indicator)) {
                        quarterData[indicator] = quarterData[indicator] / monthCount;
                    }
                });
            }
            
            appData.quarterlyData[quarter][workshop] = quarterData;
        });
    });
}

function processAnnualData() {
    appData.annualData = {};
    
    appData.workshops.forEach(workshop => {
        const annualData = {
            'Выпуск': 0,
            'Брак': 0,
            'Простой': 0,
            'Численность': 0,
            'Изготовлено': 0,
            'Себестоимость': 0,
            'ВаловаяПрибыль': 0,
            'EBITDA': 0,
            'ЧистаяПрибыль': 0
        };
        
        let monthCount = 0;
        config.months.forEach(month => {
            const monthData = appData.monthlyData[workshop][month];
            if (monthData) {
                config.indicators.forEach(indicator => {
                    if (annualData.hasOwnProperty(indicator) && monthData[indicator]) {
                        annualData[indicator] += parseFloat(monthData[indicator]) || 0;
                    }
                });
                monthCount++;
            }
        });
        
        // Расчет средних значений
        if (monthCount > 0) {
            ['Брак', 'Простой', 'ПроцентОтПлана', 'Маржинальность', 'Рентабельность'].forEach(indicator => {
                if (annualData.hasOwnProperty(indicator)) {
                    annualData[indicator] = annualData[indicator] / monthCount;
                }
            });
        }
        
        appData.annualData[workshop] = annualData;
    });
}

function renderAllCharts() {
    renderWorkshopCharts();
    renderQuarterlyReports();
    renderAnnualReports();
}

function renderWorkshopCharts() {
    const container = document.getElementById('workshopCharts');
    container.innerHTML = '';
    
    // Создаем графики для каждого показателя
    config.indicators.forEach((indicator, idx) => {
        const chartDiv = document.createElement('div');
        chartDiv.className = 'chart-wrapper';
        
        const canvas = document.createElement('canvas');
        canvas.id = `chart-${indicator}`;
        chartDiv.appendChild(canvas);
        container.appendChild(chartDiv);
        
        const labels = appData.workshops.map(w => `Цех ${w}`);
        const data = appData.workshops.map(workshop => {
            const annualData = appData.annualData[workshop];
            return annualData ? annualData[indicator] || 0 : 0;
        });
        
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: indicator,
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.7', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: `Годовые показатели: ${indicator}`,
                        font: { size: 16 }
                    },
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    });
}

function renderQuarterlyReports() {
    const container = document.getElementById('quarterlyReports');
    container.innerHTML = '<h2>Квартальные отчеты</h2>';
    
    Object.entries(appData.quarterlyData).forEach(([quarter, workshops]) => {
        const quarterDiv = document.createElement('div');
        quarterDiv.className = 'quarter-report';
        quarterDiv.innerHTML = `<h3>${quarter}</h3>`;
        
        const table = document.createElement('table');
        
        // Заголовки таблицы
        const headers = ['Цех', 'Выпуск', 'Брак (%)', 'Простой (ч)', 'Валовая прибыль', 'Чистая прибыль'];
        let headerRow = table.insertRow();
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        // Данные по цехам
        appData.workshops.forEach(workshop => {
            const row = table.insertRow();
            const workshopData = workshops[workshop];
            
            headers.forEach(header => {
                const cell = row.insertCell();
                if (header === 'Цех') {
                    cell.textContent = `Цех ${workshop}`;
                } else {
                    const key = header.split(' ')[0];
                    const value = workshopData[key];
                    cell.textContent = typeof value === 'number' ? 
                        (header.includes('%') ? value.toFixed(2) + '%' : 
                         header.includes('ч') ? value.toFixed(1) : 
                         Math.round(value)) : '-';
                }
            });
        });
        
        quarterDiv.appendChild(table);
        container.appendChild(quarterDiv);
    });
}

function renderAnnualReports() {
    const container = document.getElementById('annualReports');
    container.innerHTML = '<h2>Годовой отчет</h2>';
    
    const table = document.createElement('table');
    
    // Заголовки таблицы
    const headers = ['Цех', 'Выпуск', 'Брак (%)', 'Простой (ч)', 'Маржинальность (%)', 'Рентабельность (%)', 'Чистая прибыль'];
    let headerRow = table.insertRow();
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    
    // Данные по цехам
    appData.workshops.forEach(workshop => {
        const row = table.insertRow();
        const workshopData = appData.annualData[workshop];
        
        headers.forEach(header => {
            const cell = row.insertCell();
            if (header === 'Цех') {
                cell.textContent = `Цех ${workshop}`;
            } else {
                const key = header.split(' ')[0];
                const value = workshopData[key];
                cell.textContent = typeof value === 'number' ? 
                    (header.includes('%') ? value.toFixed(2) + '%' : 
                     header.includes('ч') ? value.toFixed(1) : 
                     Math.round(value)) : '-';
            }
        });
    });
    
    container.appendChild(table);
}

function switchTab(tabId) {
    // Скрыть все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Деактивировать все кнопки
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показать выбранную вкладку
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
}

function exportToPDF() {
    if (appData.workshops.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Титульная страница
    doc.setFontSize(22);
    doc.text('Производственный отчет', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text(`Дата формирования: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
    
    // Годовой отчет
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Годовой отчет', 14, 20);
    
    const annualHeaders = [
        'Цех', 
        { header: 'Выпуск', dataKey: 'Выпуск' },
        { header: 'Брак (%)', dataKey: 'Брак' },
        { header: 'Простой (ч)', dataKey: 'Простой' },
        { header: 'Прибыль', dataKey: 'ЧистаяПрибыль' }
    ];
    
    const annualData = appData.workshops.map(workshop => {
        const data = appData.annualData[workshop];
        return {
            'Цех': `Цех ${workshop}`,
            'Выпуск': Math.round(data['Выпуск']),
            'Брак': data['Брак'].toFixed(2) + '%',
            'Простой': data['Простой'].toFixed(1),
            'ЧистаяПрибыль': Math.round(data['ЧистаяПрибыль'])
        };
    });
    
    doc.autoTable({
        head: [annualHeaders.map(h => typeof h === 'string' ? h : h.header)],
        body: annualData.map(row => annualHeaders.map(h => 
            typeof h === 'string' ? row[h] : row[h.dataKey]
        )),
        startY: 30,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [41, 128, 185] }
    });
    
    // Сохранение PDF
    doc.save(`production_report_${new Date().toISOString().slice(0,10)}.pdf`);
}
