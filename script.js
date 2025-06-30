// Конфигурация приложения
const config = {
    workshopsCount: 20,
    indicators: [
        'Выпуск', 'Брак', 'Простой', 'Численность', 
        'Изготовлено', 'ПроцентОтПлана', 'Себестоимость',
        'ВаловаяПрибыль', 'Маржинальность', 'EBITDA',
        'Рентабельность', 'ЧистаяПрибыль'
    ],
    months: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 
             'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
    quarters: {
        'Q1': ['Янв', 'Фев', 'Мар'],
        'Q2': ['Апр', 'Май', 'Июн'],
        'Q3': ['Июл', 'Авг', 'Сен'],
        'Q4': ['Окт', 'Ноя', 'Дек']
    }
};

// Цветовая палитра для 20 цехов
const colors = [
    "#3366cc", "#dc3912", "#ff9900", "#109618", "#990099",
    "#0099c6", "#dd4477", "#66aa00", "#b82e2e", "#316395",
    "#994499", "#22aa99", "#aaaa11", "#6633cc", "#e67300",
    "#8b0707", "#651067", "#329262", "#5574a6", "#3b3eac"
];

// Хранение данных приложения
let appData = {
    rawData: [],
    workshops: [],
    monthlyData: {},
    quarterlyData: {},
    annualData: {},
    lastUploadedFile: null
};

// Инициализация приложения
function initApp() {
    console.log("Инициализация приложения...");
    setupFileUpload();
    setupUI();
    setupEventListeners();
    loadInitialData();
}

// Настройка загрузки файлов
function setupFileUpload() {
    const fileInput = document.getElementById('csvUpload');
    const fileNameDisplay = document.getElementById('fileName');
    
    if (!fileInput || !fileNameDisplay) {
        console.error("Не найдены элементы для загрузки файлов");
        return;
    }
    
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        fileNameDisplay.textContent = `Выбран файл: ${file.name}`;
        appData.lastUploadedFile = file.name;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const csvText = e.target.result;
                const data = parseCSV(csvText);
                if (data.length === 0) throw new Error("Файл не содержит данных");
                
                appData.rawData = data;
                processData(data);
                saveData();
                updateUI();
                showNotification("Данные успешно загружены!", "success");
            } catch (error) {
                console.error("Ошибка обработки файла:", error);
                showNotification(`Ошибка: ${error.message}`, "error");
            }
        };
        reader.onerror = () => {
            showNotification("Ошибка чтения файла", "error");
        };
        reader.readAsText(file);
    });
}

// Парсинг CSV
function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Цех', 'Месяц', 'Выпуск', 'Брак', 'Простой'];
    
    if (!requiredHeaders.every(h => headers.includes(h))) {
        throw new Error("CSV файл должен содержать обязательные колонки: Цех, Месяц, Выпуск, Брак, Простой");
    }
    
    return lines.slice(1).map(line => {
        const values = line.split(',');
        return headers.reduce((obj, header, index) => {
            let value = values[index] ? values[index].trim() : '';
            
            if (header !== 'Цех' && header !== 'Месяц' && !isNaN(value)) {
                value = parseFloat(value);
            }
            
            obj[header] = value;
            return obj;
        }, {});
    }).filter(row => row['Цех'] && row['Месяц']);
}

// Основная обработка данных
function processData(data) {
    try {
        // Группировка данных по цехам и месяцам
        appData.workshops = [...new Set(data.map(row => parseInt(row['Цех'])))].sort((a, b) => a - b);
        appData.monthlyData = {};
        
        // Заполнение месячных данных
        appData.workshops.forEach(workshop => {
            appData.monthlyData[workshop] = {};
            config.months.forEach(month => {
                const monthData = data.filter(row => 
                    parseInt(row['Цех']) === workshop && row['Месяц'] === month
                )[0] || {};
                
                appData.monthlyData[workshop][month] = monthData;
            });
        });
        
        // Расчет квартальных данных
        calculateQuarterlyData();
        
        // Расчет годовых данных
        calculateAnnualData();
        
    } catch (error) {
        console.error("Ошибка обработки данных:", error);
        throw new Error("Не удалось обработать данные");
    }
}

// Расчет квартальных показателей
function calculateQuarterlyData() {
    appData.quarterlyData = {};
    
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
                if (monthData && monthData['Выпуск']) {
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

// Расчет годовых показателей
function calculateAnnualData() {
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
            if (monthData && monthData['Выпуск']) {
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

// Настройка UI
function setupUI() {
    setupTabs();
    renderWorkshopSelect();
    renderMonthSelect();
}

// Настройка вкладок
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Скрыть все содержимое вкладок
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Деактивировать все кнопки
            tabButtons.forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Показать выбранную вкладку
            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');
            
            // Обновить данные для активной вкладки
            if (tabId === 'monthly') {
                updateWorkshopCharts(appData.workshops[0]);
                updateMonthCharts(config.months[0]);
            } else if (tabId === 'quarterly') {
                renderQuarterlyReports();
            } else if (tabId === 'annual') {
                renderAnnualReports();
            }
        });
    });
}

// Заполнение выпадающего списка цехов
function renderWorkshopSelect() {
    const workshopSelect = document.getElementById('workshopSelect');
    if (!workshopSelect) return;
    
    workshopSelect.innerHTML = '';
    appData.workshops.forEach(workshop => {
        const option = document.createElement('option');
        option.value = workshop;
        option.textContent = `Цех ${workshop}`;
        workshopSelect.appendChild(option);
    });
    
    workshopSelect.addEventListener('change', (e) => {
        updateWorkshopCharts(parseInt(e.target.value));
    });
}

// Заполнение выпадающего списка месяцев
function renderMonthSelect() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;
    
    monthSelect.innerHTML = '';
    config.months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = month;
        monthSelect.appendChild(option);
    });
    
    monthSelect.addEventListener('change', (e) => {
        updateMonthCharts(e.target.value);
    });
}

// Обновление графиков по цехам
function updateWorkshopCharts(workshopId) {
    const container = document.getElementById('workshopCharts');
    if (!container || !appData.monthlyData[workshopId]) return;
    
    container.innerHTML = '';
    
    config.indicators.forEach(indicator => {
        const chartData = {
            labels: config.months,
            datasets: [{
                label: indicator,
                data: config.months.map(month => 
                    appData.monthlyData[workshopId][month][indicator] || 0
                ),
                backgroundColor: colors[workshopId % colors.length],
                borderColor: colors[workshopId % colors.length],
                borderWidth: 1
            }]
        };
        
        const canvas = document.createElement('canvas');
        canvas.height = 300;
        container.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: getChartOptions(`Цех ${workshopId}: ${indicator}`)
        });
    });
}

// Обновление графиков по месяцам
function updateMonthCharts(month) {
    const container = document.getElementById('monthCharts');
    if (!container) return;
    
    container.innerHTML = '';
    
    config.indicators.forEach(indicator => {
        const chartData = {
            labels: appData.workshops.map(w => `Цех ${w}`),
            datasets: [{
                label: `${indicator} (${month})`,
                data: appData.workshops.map(workshop => 
                    appData.monthlyData[workshop][month][indicator] || 0
                ),
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.7', '1')),
                borderWidth: 1
            }]
        };
        
        const canvas = document.createElement('canvas');
        canvas.height = 300;
        container.appendChild(canvas);
        
        new Chart(canvas, {
            type: 'bar',
            data: chartData,
            options: getChartOptions(`${month}: ${indicator}`)
        });
    });
}

// Настройки графиков
function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: title,
                font: { size: 16 }
            },
            legend: { 
                display: false 
            }
        },
        scales: {
            y: { 
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Значение'
                }
            },
            x: {
                title: {
                    display: true,
                    text: title.includes(':') ? 'Цех' : 'Месяц'
                }
            }
        }
    };
}

// Генерация квартальных отчетов
function renderQuarterlyReports() {
    const container = document.getElementById('quarterlyReports');
    if (!container) return;
    
    container.innerHTML = '<h2>Квартальные отчеты</h2>';
    
    Object.entries(appData.quarterlyData).forEach(([quarter, workshops]) => {
        const quarterDiv = document.createElement('div');
        quarterDiv.className = 'quarter-report';
        quarterDiv.innerHTML = `<h3>${quarter}</h3>`;
        
        const table = document.createElement('table');
        table.className = 'report-table';
        
        // Заголовки таблицы
        let headers = ['Цех', ...config.indicators.filter(ind => 
            ['Выпуск', 'Брак', 'Простой', 'ВаловаяПрибыль', 'ЧистаяПрибыль'].includes(ind)
        )];
        
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
                    const value = workshopData[header];
                    cell.textContent = typeof value === 'number' ? value.toFixed(2) : '-';
                }
            });
        });
        
        quarterDiv.appendChild(table);
        container.appendChild(quarterDiv);
    });
}

// Генерация годовых отчетов
function renderAnnualReports() {
    const container = document.getElementById('annualReports');
    if (!container) return;
    
    container.innerHTML = '<h2>Годовые отчеты</h2>';
    
    const table = document.createElement('table');
    table.className = 'report-table';
    
    // Заголовки таблицы
    let headers = ['Цех', ...config.indicators.filter(ind => 
        ['Выпуск', 'Брак', 'Простой', 'ВаловаяПрибыль', 'ЧистаяПрибыль'].includes(ind)
    )];
    
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
                const value = workshopData[header];
                cell.textContent = typeof value === 'number' ? value.toFixed(2) : '-';
            }
        });
    });
    
    container.appendChild(table);
}

// Экспорт в PDF
function exportToPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Титульная страница
        doc.setFontSize(22);
        doc.text('Производственный отчет', 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Дата формирования: ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' });
        
        // Добавление данных
        addDataToPDF(doc);
        
        // Сохранение PDF
        doc.save(`production_report_${new Date().toISOString().slice(0,10)}.pdf`);
        showNotification("PDF успешно сформирован!", "success");
    } catch (error) {
        console.error("Ошибка при экспорте в PDF:", error);
        showNotification("Ошибка при создании PDF", "error");
    }
}

// Добавление данных в PDF
function addDataToPDF(doc) {
    // Добавляем помесячные данные
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Помесячные показатели', 14, 20);
    
    // Добавляем квартальные отчеты
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Квартальные отчеты', 14, 20);
    
    // Добавляем годовой отчет
    doc.addPage();
    doc.setFontSize(16);
    doc.text('Годовой отчет', 14, 20);
}

// Сохранение данных в localStorage
function saveData() {
    try {
        const dataToSave = {
            rawData: appData.rawData,
            lastUploadedFile: appData.lastUploadedFile,
            timestamp: new Date().getTime()
        };
        
        localStorage.setItem('productionData', JSON.stringify(dataToSave));
        showNotification("Данные успешно сохранены!", "success");
    } catch (error) {
        console.error("Ошибка сохранения данных:", error);
        showNotification("Ошибка при сохранении данных", "error");
    }
}

// Загрузка данных из localStorage
function loadSavedData() {
    try {
        const savedData = localStorage.getItem('productionData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            appData.rawData = parsedData.rawData;
            appData.lastUploadedFile = parsedData.lastUploadedFile;
            
            if (appData.rawData.length > 0) {
                processData(appData.rawData);
                updateUI();
                showNotification(`Данные успешно загружены (${parsedData.lastUploadedFile || 'из сохраненной версии'})`, "success");
            } else {
                showNotification("Сохраненные данные пусты", "warning");
            }
        } else {
            showNotification("Нет сохраненных данных", "warning");
        }
    } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        showNotification("Ошибка при загрузке данных", "error");
    }
}

// Загрузка начальных данных
function loadInitialData() {
    try {
        // Можно добавить загрузку тестовых данных по умолчанию
        if (appData.rawData.length === 0) {
            showNotification("Загрузите CSV файл с данными", "info");
        }
    } catch (error) {
        console.error("Ошибка загрузки начальных данных:", error);
    }
}

// Обновление интерфейса
function updateUI() {
    renderWorkshopSelect();
    renderMonthSelect();
    updateWorkshopCharts(appData.workshops[0]);
    updateMonthCharts(config.months[0]);
    renderQuarterlyReports();
    renderAnnualReports();
}

// Показать уведомление
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Добавьте дополнительные обработчики при необходимости
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initApp);
